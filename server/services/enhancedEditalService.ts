import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { smartSummaryService } from './smartSummaryService';
import { advancedDocumentProcessor } from './advancedDocumentProcessor';
import { storage } from '../storage';
import { chatRAG } from './rag/index';
import type { Edital } from '@shared/schema';
import type { HierarchicalChunk } from './structureInterpreter';

interface ProcessedResult {
  success: boolean;
  edital: Edital;
  message: string;
  details: {
    fileName: string;
    concurso: string;
    timestamp: string;
    processingMethod: 'document_ai' | 'ocr_image' | 'not_supported';
    sectionsDetected: number;
    confidence: number;
  };
}

export class EnhancedEditalService {

  /**
   * Processa edital usando estratégia baseada no tipo de arquivo
   * - PDFs: Document AI nativo (sem fallback híbrido)
   * - Imagens: Pipeline OCR separado  
   * - Outros: Erro transparente
   */
  async processEdital(request: {
    userId: string;
    filePath: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    concursoNome: string;
  }): Promise<ProcessedResult> {
    console.log(`🚀 [EnhancedEditalService] Iniciando processamento: ${request.originalName}`);

    // Detectar tipo de arquivo correto
    const fileType = fileProcessorService.detectFileType(request.originalName);
    const fileCategory = fileProcessorService.getFileCategory(request.originalName);
    
    console.log(`📁 Arquivo detectado: tipo=${fileType}, categoria=${fileCategory}`);

    let edital: Edital | null = null;

    try {
      // Criar edital no banco com tipo correto
      edital = await storage.createEdital({
        userId: request.userId,
        originalName: request.originalName,
        filePath: request.filePath,
        fileName: request.fileName,
        fileType: fileType, // Tipo real detectado, não hardcoded
        fileSize: request.fileSize,
        concursoNome: request.concursoNome,
        status: 'processing',
        errorMessage: null,
        smartSummary: null
      });

      console.log(`📝 Edital criado no banco: ${edital.id} (tipo: ${fileType})`);

      // Processar baseado no tipo de arquivo
      if (fileCategory === 'document') {
        return await this.processDocumentFile(edital, request);
      } else if (fileCategory === 'image') {
        return await this.processImageFile(edital, request);
      } else {
        throw new Error(`Tipo de arquivo não suportado para processamento de editais: ${fileType}`);
      }

    } catch (error) {
      console.error(`❌ Erro no processamento:`, error);

      // Atualizar status no banco com erro transparente
      if (edital) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no processamento';
        await storage.updateEdital(edital.id, {
          status: 'failed',
          errorMessage: errorMessage
        });
      }

      return {
        success: false,
        edital: edital!,
        message: error instanceof Error ? error.message : 'Falha no processamento do edital',
        details: {
          fileName: request.originalName,
          concurso: request.concursoNome,
          timestamp: new Date().toISOString(),
          processingMethod: 'not_supported',
          sectionsDetected: 0,
          confidence: 0
        }
      };
    }
  }

  /**
   * Processa documentos nativos (PDF, DOCX, DOC) usando Document AI
   */
  private async processDocumentFile(edital: Edital, request: {
    userId: string;
    filePath: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    concursoNome: string;
  }): Promise<ProcessedResult> {
    
    console.log(`📄 Processando documento nativo com Document AI: ${request.originalName}`);

    try {
      // ETAPA 1: Processar com Google Document AI
      const advancedResult = await advancedDocumentProcessor.processDocument(
        request.filePath, 
        request.originalName
      );

      console.log(`✅ Document AI processou ${advancedResult.hierarchy.length} seções principais`);
      
      // Validar qualidade do resultado
      const isResultSatisfactory = this.validateDocumentStructure(advancedResult, request.originalName);
      
      if (!isResultSatisfactory) {
        throw new Error(`Document AI não conseguiu extrair estrutura hierárquica adequada do documento. Possíveis causas: PDF com imagens escaneadas, formatação inadequada, ou documento não estruturado.`);
      }

      // ETAPA 2: Converter para formato compatível
      const processedDocument = advancedDocumentProcessor.convertToProcessedDocument(advancedResult);
      console.log(`✅ Documento convertido: ${processedDocument.structure.length} chunks`);
      
      // ETAPA 3: Gerar sumário inteligente  
      const titleChunks = processedDocument.structure.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        level: chunk.level,
        content: chunk.content,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition
      }));

      console.log(`🧠 Gerando sumário inteligente com ${titleChunks.length} seções...`);
      const smartSummary = await smartSummaryService.generateSmartSummary(
        titleChunks,
        request.originalName
      );
      console.log(`✅ Sumário gerado com ${smartSummary.totalSections} seções`);

      // ETAPA 4: Atualizar edital com sumário
      await storage.updateEdital(edital.id, {
        smartSummary: JSON.stringify({
          documentName: smartSummary.documentName,
          overallSummary: smartSummary.overallSummary,
          totalSections: smartSummary.totalSections,
          summaryItems: smartSummary.summaryItems,
          generatedAt: smartSummary.generatedAt
        }),
        status: 'summary_generated'
      });

      // ETAPA 5: Gerar e armazenar embeddings
      await this.generateAndStoreEmbeddings(processedDocument, edital.id, request.userId);
      console.log(`✅ Embeddings gerados e armazenados`);

      // Atualizar status final
      await storage.updateEdital(edital.id, {
        status: 'completed',
        processedAt: new Date().toISOString()
      });

      console.log(`🎉 Processamento concluído com sucesso: ${edital.id}`);

      return {
        success: true,
        edital: edital,
        message: 'Edital processado com sucesso usando Document AI',
        details: {
          fileName: request.originalName,
          concurso: request.concursoNome,
          timestamp: new Date().toISOString(),
          processingMethod: 'document_ai',
          sectionsDetected: advancedResult.hierarchy.length,
          confidence: advancedResult.confidence
        }
      };

    } catch (documentAIError) {
      console.error(`❌ Falha no Document AI:`, documentAIError);
      
      // Reportar erro transparente baseado no tipo
      let errorMessage: string;
      
      if (documentAIError instanceof Error) {
        if (documentAIError.message.includes('DECODER routines::unsupported') ||
            documentAIError.message.includes('Getting metadata from plugin failed') ||
            documentAIError.message.includes('authentication')) {
          errorMessage = 'Falha de autenticação com Google Document AI. Verifique as credenciais do serviço.';
        } else if (documentAIError.message.includes('API')) {
          errorMessage = 'Falha de integração com Google Document AI. Tente novamente em alguns minutos.';
        } else {
          errorMessage = documentAIError.message;
        }
      } else {
        errorMessage = 'Falha desconhecida no processamento do documento';
      }

      // Não usar fallback - reportar erro transparente
      throw new Error(errorMessage);
    }
  }

  /**
   * Processa arquivos de imagem usando OCR
   * NOTA: OCR de imagens tem limitações para detectar hierarquia
   */
  private async processImageFile(edital: Edital, request: {
    userId: string;
    filePath: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    concursoNome: string;
  }): Promise<ProcessedResult> {
    
    console.log(`🖼️ Processamento de imagem solicitado: ${request.originalName}`);
    
    // Por enquanto, retornar erro informativo sobre limitações do OCR
    throw new Error(`Processamento de imagens ainda não implementado. Limitações do OCR: não consegue identificar títulos, subtítulos e hierarquia adequadamente. Use arquivos PDF nativos para melhor resultado.`);
    
    // TODO: Implementar ImageOCRService quando necessário
    // return await this.processWithOCR(edital, request);
  }

  /**
   * Valida se a estrutura extraída pelo Document AI é satisfatória
   */
  private validateDocumentStructure(advancedResult: any, fileName: string): boolean {
    const sectionsCount = advancedResult.hierarchy?.length || 0;
    const confidence = advancedResult.confidence || 0;
    
    console.log(`📊 Validação estrutural: ${sectionsCount} seções, confiança: ${(confidence * 100).toFixed(1)}%`);
    
    // Critérios para edital: pelo menos 5 seções principais, confiança > 0.3
    const hasMinimumSections = sectionsCount >= 5;
    const hasMinimumConfidence = confidence > 0.3;
    
    const isValid = hasMinimumSections && hasMinimumConfidence;
    
    if (!isValid) {
      console.warn(`⚠️ Estrutura não atende critérios: seções=${sectionsCount} (min=5), confiança=${confidence} (min=0.3)`);
    }
    
    return isValid;
  }

  /**
   * Gera embeddings e armazena no Pinecone
   */
  private async generateAndStoreEmbeddings(
    processedDocument: any,
    editalId: string,
    userId: string
  ): Promise<void> {
    console.log(`🧮 Gerando embeddings para ${processedDocument.structure.length} chunks...`);
    
    try {
      // Preparar dados para indexação no RAG
      const documentsForRAG = processedDocument.structure.map((chunk: any) => ({
        id: `${editalId}_${chunk.id}`,
        content: chunk.content,
        metadata: {
          editalId: editalId,
          userId: userId,
          chunkId: chunk.id,
          title: chunk.title,
          level: chunk.level,
          documentName: processedDocument.fileName
        }
      }));

      // Indexar no sistema RAG
      await chatRAG.indexDocuments(documentsForRAG, {
        source: 'edital_upload',
        userId: userId,
        editalId: editalId
      });

      console.log(`✅ ${documentsForRAG.length} chunks indexados no RAG`);
      
    } catch (error) {
      console.error(`❌ Falha na geração de embeddings:`, error);
      throw new Error('Falha na geração de embeddings para busca inteligente');
    }
  }
}

// Instância singleton
export const enhancedEditalService = new EnhancedEditalService();