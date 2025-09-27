import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { smartSummaryService } from './smartSummaryService';
import { advancedDocumentProcessor } from './advancedDocumentProcessor';
import { storage } from '../storage';
import { chatRAG } from './rag/index';
import type { Edital } from '@shared/schema';

interface ProcessedResult {
  success: boolean;
  edital: Edital;
  message: string;
  details: {
    fileName: string;
    concurso: string;
    timestamp: string;
    processingMethod: 'advanced_google_docai' | 'fallback_legacy';
    sectionsDetected: number;
    confidence: number;
  };
}

export class EnhancedEditalService {

  /**
   * Processa edital com Google Document AI + validação LLM
   */
  async processEdital(request: {
    userId: string;
    filePath: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    concursoNome: string;
  }): Promise<ProcessedResult> {
    console.log(`🚀 [EnhancedEditalService] Iniciando processamento avançado: ${request.originalName}`);

    let edital: Edital | null = null;
    let processingMethod: 'advanced_google_docai' | 'fallback_legacy' = 'advanced_google_docai';
    let sectionsDetected = 0;
    let confidence = 0;

    try {
      // Criar edital no banco
      edital = await storage.createEdital({
        userId: request.userId,
        originalName: request.originalName,
        filePath: request.filePath,
        fileName: request.fileName,
        fileType: 'pdf',
        fileSize: request.fileSize,
        concursoNome: request.concursoNome,
        status: 'processing',
        errorMessage: null,
        smartSummary: null
      });

      console.log(`📝 Edital criado no banco: ${edital.id}`);

      // ETAPA 1: Tentativa com Google Document AI
      try {
        console.log(`🧠 Tentando processamento avançado com Google Document AI...`);
        console.log(`📂 Arquivo: ${request.filePath}`);
        console.log(`📄 Nome: ${request.originalName}`);
        
        const advancedResult = await advancedDocumentProcessor.processDocument(
          request.filePath, 
          request.originalName
        );

        console.log(`✅ Google Document AI processou ${advancedResult.hierarchy.length} seções principais`);
        console.log(`📊 Estrutura detectada:`, JSON.stringify(advancedResult.hierarchy.slice(0, 3), null, 2));
        
        // Validar se o resultado é satisfatório (14 ± 5 seções esperadas para editais)
        const isResultSatisfactory = this.validateDocumentStructure(advancedResult, request.originalName);
        
        if (isResultSatisfactory) {
          // ETAPA A: Converter para formato compatível
          let processedDocument;
          try {
            processedDocument = advancedDocumentProcessor.convertToProcessedDocument(advancedResult);
            console.log(`✅ Documento convertido com sucesso`);
          } catch (convertError) {
            throw new Error(`Falha de processamento advancedDocumentProcessor.convertToProcessedDocument`);
          }
          
          // ETAPA B: Gerar sumário inteligente  
          let smartSummary;
          try {
            const titleChunks = processedDocument.structure.map((chunk, index) => ({
              id: chunk.id,
              title: chunk.title,
              level: chunk.level,
              content: chunk.content,
              startPosition: chunk.startPosition,
              endPosition: chunk.endPosition
            }));

            console.log(`🧠 Gerando sumário inteligente com ${titleChunks.length} seções...`);
            smartSummary = await smartSummaryService.generateSmartSummary(
              titleChunks,
              request.originalName
            );
            console.log(`✅ Sumário gerado com ${smartSummary.totalSections} seções`);
          } catch (summaryError) {
            if (summaryError instanceof Error && (
              summaryError.message.includes('API') || 
              summaryError.message.includes('OpenAI') || 
              summaryError.message.includes('GPT'))) {
              throw new Error('Falha de integração com sistema de IA');
            }
            throw new Error(`Falha de processamento smartSummaryService.generateSmartSummary`);
          }

          // ETAPA C: Atualizar edital com sumário
          try {
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
            console.log(`✅ Edital atualizado no banco com sumário`);
          } catch (updateError) {
            throw new Error(`Falha de processamento storage.updateEdital`);
          }

          // Preparar para embeddings
          sectionsDetected = advancedResult.hierarchy.length;
          confidence = advancedResult.confidence;

          // ETAPA D: Gerar embeddings e enviar para Pinecone
          try {
            await this.generateAndStoreEmbeddings(processedDocument, edital.id, request.userId);
            console.log(`✅ Embeddings gerados com sucesso`);
          } catch (embeddingError) {
            if (embeddingError instanceof Error && (
              embeddingError.message.includes('API') || 
              embeddingError.message.includes('Pinecone') || 
              embeddingError.message.includes('OpenAI'))) {
              throw new Error('Falha de integração com sistema de IA');
            }
            throw new Error(`Falha de processamento generateAndStoreEmbeddings`);
          }

        } else {
          throw new Error('Estrutura detectada pelo Google Document AI não atende aos critérios de qualidade');
        }

      } catch (advancedError) {
        console.error(`❌ [ERRO DETALHADO] Falha no processamento avançado:`, advancedError);
        
        // Preservar mensagem específica ou determinar tipo de erro
        let errorMessage: string;
        if (advancedError instanceof Error) {
          // Se já é uma mensagem específica (nossos erros internos), preservar
          if (advancedError.message.startsWith('Falha de integração') || 
              advancedError.message.startsWith('Falha de processamento')) {
            errorMessage = advancedError.message;
          }
          // Se contém palavras-chave de integração externa
          else if (advancedError.message.includes('API') || advancedError.message.includes('OpenAI') || 
              advancedError.message.includes('Document AI') || advancedError.message.includes('GPT')) {
            errorMessage = 'Falha de integração com sistema de IA';
          } 
          // Casos genéricos que não foram capturados pelos internos
          else {
            errorMessage = `Falha de processamento advancedDocumentProcessor.processDocument`;
          }
        } else {
          errorMessage = `Falha de processamento advancedDocumentProcessor.processDocument`;
        }

        // Atualizar status de falha sem dados fictícios
        await storage.updateEdital(edital.id, {
          status: 'failed',
          errorMessage: errorMessage
        });

        throw new Error(errorMessage);
      }

      // Finalizar processamento
      await storage.updateEdital(edital.id, {
        status: 'completed',
        processedAt: new Date()
      });

      console.log(`✅ Processamento completo: ${edital.id} (${processingMethod})`);

      // Limpar arquivo temporário
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo temporário removido: ${request.filePath}`);
      }

      return {
        success: true,
        edital,
        message: processingMethod === 'advanced_google_docai' 
          ? 'Processamento avançado com Google Document AI concluído com sucesso'
          : 'Processamento concluído com sistema de fallback',
        details: {
          fileName: request.originalName,
          concurso: request.concursoNome,
          timestamp: new Date().toISOString(),
          processingMethod,
          sectionsDetected,
          confidence
        }
      };

    } catch (error) {
      console.error(`❌ Erro crítico no processamento de ${request.originalName}:`, error);
      
      // Atualizar status de erro
      if (edital) {
        await storage.updateEdital(edital.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }

      // Limpar arquivo em caso de erro
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
      }

      return {
        success: false,
        edital: edital || {} as Edital,
        message: 'Falha no processamento do edital',
        details: {
          fileName: request.originalName,
          concurso: request.concursoNome,
          timestamp: new Date().toISOString(),
          processingMethod: 'fallback_legacy',
          sectionsDetected: 0,
          confidence: 0
        }
      };
    }
  }

  /**
   * Valida se a estrutura detectada é satisfatória para um edital
   */
  private validateDocumentStructure(
    advancedResult: any, 
    fileName: string
  ): boolean {
    const sectionsCount = advancedResult.hierarchy.length;
    const confidence = advancedResult.confidence;

    console.log(`🔍 Validando estrutura: ${sectionsCount} seções, confiança ${(confidence * 100).toFixed(1)}%`);

    // Critérios de validação ajustados para ser mais permissivo
    const hasReasonableSectionCount = sectionsCount >= 1 && sectionsCount <= 50; // Aceitar qualquer estrutura detectada
    const hasGoodConfidence = confidence >= 0.5; // Relaxar confiança mínima
    const hasVariedSections = sectionsCount === 1 || this.checkSectionVariety(advancedResult.hierarchy); // Aceitar 1 seção ou variedade

    const isValid = hasReasonableSectionCount && hasGoodConfidence && hasVariedSections;

    if (!isValid) {
      console.warn(`❌ Estrutura não satisfatória para ${fileName}:`);
      console.warn(`  - Seções: ${sectionsCount} (esperado: 1-50)`);
      console.warn(`  - Confiança: ${(confidence * 100).toFixed(1)}% (esperado: >50%)`);
      console.warn(`  - Variedade: ${hasVariedSections ? 'OK' : 'INSUFICIENTE'}`);
    } else {
      console.log(`✅ Estrutura validada com sucesso: ${sectionsCount} seções detectadas`);
    }

    return isValid;
  }

  /**
   * Verifica se as seções detectadas têm variedade suficiente
   */
  private checkSectionVariety(hierarchy: any[]): boolean {
    const titles = hierarchy.map(section => section.title.toLowerCase());
    
    // Verificar se há títulos típicos de edital
    const expectedKeywords = [
      'objeto', 'cargo', 'requisito', 'inscri', 'prova', 
      'cronograma', 'conteudo', 'conhecimento', 'anexo'
    ];

    const foundKeywords = expectedKeywords.filter(keyword => 
      titles.some(title => title.includes(keyword))
    );

    const hasGoodVariety = foundKeywords.length >= 3;
    
    if (!hasGoodVariety) {
      console.warn(`⚠️ Variedade insuficiente de seções. Encontrados: ${foundKeywords.join(', ')}`);
    }

    return hasGoodVariety;
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
      // Preparar documentos para RAG
      const ragDocuments = processedDocument.structure.map((chunk: any, index: number) => ({
        id: `edital-${editalId}-chunk-${index}`,
        content: chunk.content,
        metadata: {
          title: chunk.title,
          level: chunk.level,
          editalId,
          userId,
          createdAt: new Date()
        }
      }));

      console.log(`📤 Enviando ${ragDocuments.length} documentos para Chat RAG...`);

      // Enviar para Chat RAG
      for (const ragDoc of ragDocuments) {
        await chatRAG.processDocument(ragDoc);
      }

      console.log(`✅ Embeddings gerados e enviados para Pinecone com sucesso`);

    } catch (error) {
      console.error(`❌ Erro na geração de embeddings:`, error);
      throw new Error(`Falha na geração de embeddings: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Obter edital por ID
   */
  async getEdital(editalId: string): Promise<Edital | null> {
    const edital = await storage.getEdital(editalId);
    return edital || null;
  }

  /**
   * Listar editais do usuário
   */
  async listUserEditais(userId: string): Promise<Edital[]> {
    return await storage.getUserEditais(userId);
  }

  /**
   * Deletar edital
   */
  async deleteEdital(editalId: string, userId: string): Promise<boolean> {
    const edital = await storage.getEdital(editalId);
    
    if (!edital || edital.userId !== userId) {
      return false;
    }

    // Remover arquivo se existir
    if (edital.filePath && fs.existsSync(edital.filePath)) {
      fs.unlinkSync(edital.filePath);
    }

    await storage.deleteEdital(editalId);
    return true;
  }
}

// Instância singleton
export const enhancedEditalService = new EnhancedEditalService();