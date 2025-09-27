import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { externalProcessingService } from './externalProcessingService';
import { hierarchicalChunker } from './hierarchicalChunker';
import { smartSummaryService } from './smartSummaryService';
import { HybridPDFProcessor } from './hybridPDFProcessor';
import { storage } from '../storage';
import { ragOrchestrator } from './rag/index';
import type { Edital } from '@shared/schema';
import type { DocumentStructure, LayoutElement } from './pdf2jsonExtractor';

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

interface HierarchicalStructure {
  chunks?: Array<{
    title: string;
    content: string;
    level: number;
    children?: any[];
  }>;
  documentName: string;
  structure: any;
}

export class NewEditalService {
  private hybridProcessor: HybridPDFProcessor;

  constructor() {
    this.hybridProcessor = new HybridPDFProcessor();
  }

  /**
   * Processa um edital usando estratégia híbrida: pdf2json + Google Cloud Vision OCR
   * Fluxo: Upload → Processamento Híbrido → AI Summary → RAG Integration
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
          // NOVO SISTEMA HÍBRIDO: pdf2json + Google Cloud Vision OCR
          console.log(`🔍 Iniciando processamento híbrido avançado...`);
          const hybridResult = await this.hybridProcessor.processDocument(
            request.filePath, 
            request.fileName
          );
          
          if (!hybridResult.success || !hybridResult.documentStructure) {
            throw new Error('Falha no processamento híbrido do documento');
          }
          
          console.log(`📑 Processamento híbrido concluído: método=${hybridResult.method}, confiança=${hybridResult.quality.overallConfidence.toFixed(2)}, tempo=${hybridResult.processingTime}ms`);
          
          // Converter estrutura para formato hierárquico compatível
          const hierarchicalStructure = this.convertToHierarchicalFormat(hybridResult.documentStructure);
          console.log(`📑 ${hierarchicalStructure.chunks?.length || 0} chunks hierárquicos criados`);
          
          // Converter para formato compatível com smartSummaryService
          const legacyFormat = this.convertToLegacyFormat(hierarchicalStructure);
          
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
            
            const ragChunks = hierarchicalStructure.chunks?.map((chunk, index) => ({
              id: `${ragDocumentId}_chunk_${index}`,
              content: chunk.content,
              metadata: {
                title: chunk.title,
                level: chunk.level,
                editalId: edital!.id,
                chunkIndex: index,
                fileName: request.fileName
              }
            })) || [];

            const ragResult = await ragOrchestrator.processDocument('simulation', {
              documentId: ragDocumentId,
              chunks: ragChunks,
              metadata: {
                editalId: edital.id,
                fileName: request.fileName,
                concursoNome: request.concursoNome,
                processedAt: new Date().toISOString()
              }
            });
            
            console.log(`✅ ${ragResult.chunksProcessed} chunks armazenados no sistema RAG com ID: ${ragDocumentId}`);
            
            // Salvar sumário no sistema novo (hierarchical)
            const newJobId = await hierarchicalChunker.saveHierarchicalSummary(
              edital.id,
              smartSummary.summaryStructure,
              'hierarchical'
            );
            
            jobId = newJobId;
            console.log(`✅ Novo sistema de sumário salvo. Job ID: ${jobId}`);
            
          } catch (ragError) {
            console.error('❌ Erro na integração RAG:', ragError);
            // Continuar mesmo se RAG falhar
          }
          
        } catch (hierarchicalError) {
          console.error(`❌ Erro no processamento hierárquico de ${request.fileName}:`, hierarchicalError);
          
          // Fallback: criar estrutura básica
          console.log(`⚠️ Criando estrutura fallback para ${request.fileName}`);
          const fallbackChunks = [{
            title: 'Documento (Estrutura não detectada)',
            content: `Documento ${request.originalName} processado mas estrutura não foi detectada corretamente.`,
            level: 1,
            children: []
          }];
          
          console.log(`📑 ${fallbackChunks.length} chunks hierárquicos criados com qualidade: poor`);
          
          // Gerar sumário básico
          const fallbackSummary = await smartSummaryService.generateSmartSummary(
            fallbackChunks,
            request.fileName
          );
          
          // Salvar sumário fallback
          jobId = await hierarchicalChunker.saveHierarchicalSummary(
            edital.id,
            fallbackSummary.summaryStructure,
            'hierarchical'
          );
          
          console.log(`✅ Estrutura fallback salva. Job ID: ${jobId}`);
        }
      } else {
        // Processamento externo foi bem-sucedido
        console.log(`✅ Processamento externo concluído com sucesso`);
        jobId = processingResponse.jobId || 'external_processing_success';
      }

      // 5. Salvar Job ID no edital (se disponível)
      if (jobId) {
        console.log(`💾 Job ID salvo: ${jobId}`);
        await storage.updateEdital(edital.id, {
          jobId: jobId,
          status: 'completed',
          processedAt: new Date()
        });
      }

      // 6. Limpeza: remover arquivo local
      console.log(`✅ Processamento completo!`);
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo local removido: ${request.filePath}`);
      }

      console.log(`✅ Edital processado com sucesso: ${edital.id}`);
      
      return {
        success: true,
        edital: { ...edital, status: 'completed' },
        message: useLocalProcessing ? 
          'Edital processado com sistema local avançado' : 
          'Edital processado com aplicação externa',
        details: {
          externalProcessingSuccess: !useLocalProcessing,
          processingMessage: useLocalProcessing ? 
            'Processamento local com chunking hierárquico' : 
            'Processamento via aplicação externa'
        }
      };

    } catch (error) {
      console.error(`❌ Erro no processamento de ${request.originalName}:`, error);
      
      // Limpeza em caso de erro
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
   * Converte DocumentStructure para formato hierárquico
   */
  private convertToHierarchicalFormat(documentStructure: DocumentStructure): HierarchicalStructure {
    const chunks = documentStructure.elements
      .filter(element => element.type === 'title' || element.type === 'subtitle' || element.type === 'text')
      .map(element => ({
        title: element.type === 'text' ? 'Conteúdo' : element.text,
        content: element.text,
        level: element.level,
        children: []
      }));

    return {
      chunks,
      documentName: documentStructure.documentName,
      structure: chunks
    };
  }

  /**
   * Converte para formato legacy compatível com smartSummaryService
   */
  private convertToLegacyFormat(hierarchicalStructure: HierarchicalStructure) {
    return {
      structure: hierarchicalStructure.chunks || [],
      documentName: hierarchicalStructure.documentName
    };
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