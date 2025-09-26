import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { externalProcessingService } from './externalProcessingService';
import { hierarchicalChunker } from './hierarchicalChunker';
import { smartSummaryService } from './smartSummaryService';
import { storage } from '../storage';
import { ragOrchestrator } from './rag/index';
import type { Edital } from '@shared/schema';

interface ProcessEditalRequest {
  userId: string;
  filePath: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  concursoNome: string;
}

interface ProcessedEditalResult {
  edital: Edital;
  success: boolean;
  message: string;
  details?: {
    externalProcessingSuccess: boolean;
    processingMessage?: string;
    cargoAnalysis?: {
      totalCargos: number;
      hasSingleCargo: boolean;
      cargos: Array<{
        nome: string;
        conteudoProgramatico?: string[];
      }>;
    };
  };
}

export class NewEditalService {

  /**
   * Processa um edital enviando para aplicação externa
   * Fluxo simplificado: Upload → Enviar para API externa → Aguardar resposta
   */
  async processEdital(request: ProcessEditalRequest): Promise<ProcessedEditalResult> {
    let edital: Edital | null = null;
    
    try {
      console.log(`📄 Iniciando processamento de edital: ${request.originalName}`);
      
      // 1. Detectar tipo de arquivo
      const fileType = fileProcessorService.detectFileType(request.originalName);
      if (fileType === 'unknown') {
        throw new Error(`Tipo de arquivo não suportado: ${request.originalName}`);
      }

      if (!fileProcessorService.isFileTypeSupported(request.originalName)) {
        throw new Error(`Arquivo ${fileType.toUpperCase()} não é suportado`);
      }

      // 2. Criar registro inicial no banco
      console.log(`💾 Salvando edital no banco de dados...`);
      edital = await storage.createEdital({
        userId: request.userId,
        fileName: request.fileName,
        originalName: request.originalName,
        filePath: request.filePath,
        fileSize: request.fileSize,
        fileType,
        concursoNome: request.concursoNome,
        status: 'processing'
      });

      // 3. Tentar enviar arquivo para aplicação externa primeiro
      console.log(`🚀 Tentando enviar arquivo para aplicação externa (processamento completo)...`);
      
      let processingResponse;
      try {
        processingResponse = await externalProcessingService.processDocument({
          filePath: request.filePath,
          fileName: request.originalName,
          concursoNome: request.concursoNome,
          userId: request.userId,
          metadata: {
            editalId: edital.id,
            fileType
          }
        });
      } catch (externalError) {
        console.warn(`⚠️ Serviço externo falhou, tentando processamento local:`, externalError);
        processingResponse = { success: false, error: 'External service unavailable' };
      }

      let useLocalProcessing = false;
      let jobId = null;

      if (!processingResponse.success) {
        console.log(`🔄 Aplicação externa indisponível, usando processamento hierárquico avançado...`);
        useLocalProcessing = true;
        
        try {
          // NOVO SISTEMA AVANÇADO: Chunking hierárquico com preservação de layout
          console.log(`🔍 Iniciando processamento hierárquico avançado...`);
          const processedDocument = await hierarchicalChunker.processDocumentWithHierarchicalChunking(
            request.filePath, 
            request.fileName
          );
          
          console.log(`📑 ${processedDocument.totalChunks} chunks hierárquicos criados com qualidade: ${processedDocument.metadata.structureQuality}`);
          
          // Converter para formato compatível com smartSummaryService
          const legacyFormat = hierarchicalChunker.convertToLegacyFormat(processedDocument);
          
          // Gerar sumário inteligente com IA
          console.log(`🧠 Gerando sumário inteligente com IA...`);
          const smartSummary = await smartSummaryService.generateSmartSummary(
            legacyFormat.structure,
            legacyFormat.documentName
          );
          
          console.log(`✅ Sumário inteligente gerado com ${smartSummary.totalSections} seções`);
          
          // NOVO: Integrar com arquitetura RAG para embeddings semânticos
          console.log(`🔗 Integrando chunks com arquitetura RAG...`);
          try {
            // Preparar dados para o RAG
            const ragDocumentId = `edital_${edital.id}`;
            const ragMetadata = {
              documentId: edital.id,
              documentName: processedDocument.documentName,
              concursoNome: request.concursoNome,
              processedAt: new Date().toISOString(),
              totalChunks: processedDocument.totalChunks,
              userId: request.userId,
              processingMethod: processedDocument.metadata.processingMethod,
              structureQuality: processedDocument.metadata.structureQuality,
              avgConfidence: processedDocument.metadata.avgConfidence
            };
            
            // Transformar chunks em formato RAGDocument para o domínio simulation
            const ragPromises = processedDocument.structure.map(async (chunk: any, index: number) => {
              const ragDocument = {
                id: `${ragDocumentId}_chunk_${index}`,
                userId: request.userId,
                content: chunk.content,
                createdAt: new Date(),
                metadata: {
                  ...ragMetadata,
                  chunkId: chunk.id,
                  title: chunk.title,
                  level: chunk.level,
                  startPosition: chunk.startPosition,
                  endPosition: chunk.endPosition,
                  parentId: chunk.parentId,
                  chunkIndex: index,
                  confidence: chunk.metadata.confidence,
                  sectionType: chunk.metadata.sectionType,
                  wordCount: chunk.metadata.wordCount
                }
              };
              
              // Armazenar cada chunk no domínio 'simulation' (concursos/editais)
              return ragOrchestrator.processDocumentInDomain('simulation', ragDocument);
            });
            
            await Promise.all(ragPromises);
            console.log(`✅ ${processedDocument.totalChunks} chunks armazenados no sistema RAG com ID: ${ragDocumentId}`);
            
          } catch (ragError) {
            console.warn(`⚠️ Erro ao integrar com RAG (não crítico):`, ragError);
          }
          
          // Gerar um ID único para o processamento local
          jobId = `hierarchical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Salvar novo sistema no banco
          await storage.updateEdital(edital.id, {
            status: 'summary_generated',
            rawContent: processedDocument.structure.map((chunk: any) => chunk.content).join('\n').substring(0, 50000),
            titleChunks: JSON.stringify(legacyFormat),
            smartSummary: JSON.stringify(smartSummary),
            documentStructure: JSON.stringify(processedDocument),
            externalFileId: jobId,
            processedAt: new Date()
          });
          
          console.log(`✅ Novo sistema de sumário salvo. Job ID: ${jobId}`);
          
        } catch (localError) {
          console.error(`❌ Erro no processamento hierárquico avançado:`, localError);
          await storage.updateEdital(edital.id, {
            status: 'failed',
            errorMessage: 'Falha no processamento hierárquico com preservação de layout',
            processedAt: new Date()
          });
          throw new Error('Não foi possível processar o documento com o sistema hierárquico');
        }
        
      } else {
        console.log(`✅ Aplicação externa processou com sucesso`);
        jobId = processingResponse.job_id;
        
        // 4. Marcar como indexado e salvar o externalFileId
        await storage.updateEdital(edital.id, {
          status: 'indexed',
          externalFileId: jobId,
          processedAt: new Date()
        });
      }
      
      console.log(`💾 Job ID salvo: ${jobId}`);
      
      // 5. Processamento completo - sem necessidade de pós-processamento adicional
      console.log(`✅ Processamento completo!`);

      // 6. Limpar arquivo local (opcional - manter ou não)
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo local removido: ${request.filePath}`);
      }

      const updatedEdital = await storage.getEdital(edital.id);
      
      return {
        success: true,
        edital: updatedEdital || edital,
        message: useLocalProcessing 
          ? 'Arquivo processado com sistema hierárquico avançado! Estrutura preservada e sumário inteligente gerado.'
          : 'Arquivo indexado com sucesso! Análise de cargos em andamento...',
        details: {
          externalProcessingSuccess: !useLocalProcessing,
          processingMessage: useLocalProcessing 
            ? 'Documento processado com sistema hierárquico avançado (preservação de layout)'
            : 'Documento processado e indexado no Pinecone pela aplicação externa'
        }
      };

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      
      // Limpar arquivo em caso de erro
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
      }
      
      // Atualizar status se edital foi criado
      if (edital) {
        await storage.updateEdital(edital.id, {
          status: 'failed',
          processedAt: new Date()
        });
      }
      
      return {
        success: false,
        edital: edital!,
        message: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
      };
    }
  }

  /**
   * Valida se o arquivo pode ser processado
   */
  validateFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
    // Validar extensão
    if (!fileProcessorService.isFileTypeSupported(fileName)) {
      const supportedExtensions = fileProcessorService.getSupportedExtensions().join(', ');
      return {
        valid: false,
        error: `Tipo de arquivo não suportado. Tipos aceitos: ${supportedExtensions}`
      };
    }

    // Validar tamanho (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Recupera um edital por ID
   */
  async getEdital(editalId: string): Promise<Edital | null> {
    const edital = await storage.getEdital(editalId);
    return edital || null;
  }

  /**
   * Lista editais do usuário
   */
  async listEditals(userId: string): Promise<Edital[]> {
    return await storage.getUserEditais(userId);
  }


}

// Instância singleton para exportação
export const newEditalService = new NewEditalService();