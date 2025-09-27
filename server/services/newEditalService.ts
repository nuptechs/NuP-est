import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { externalProcessingService } from './externalProcessingService';
import { hierarchicalChunker } from './hierarchicalChunker';
import { smartSummaryService } from './smartSummaryService';
import { HybridPDFProcessor } from './hybridPDFProcessor';
import { storage } from '../storage';
import { chatRAG } from './rag/index';
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
          
          // Converter para formato compatível com smartSummaryService (TitleChunk[])
          const titleChunks = hierarchicalStructure.chunks?.map((chunk, index) => ({
            id: `chunk_${index}`,
            title: chunk.title,
            level: chunk.level,
            content: chunk.content,
            startPosition: index * 1000,
            endPosition: (index + 1) * 1000,
            parentId: undefined
          })) || [];
          
          // Gerar sumário inteligente com IA
          console.log(`🧠 Gerando sumário inteligente com IA...`);
          try {
            const smartSummary = await smartSummaryService.generateSmartSummary(
              titleChunks,
              request.fileName
            );
            
            console.log(`✅ Sumário inteligente gerado com ${smartSummary.totalSections} seções`);
            console.log(`✅ Sumário inteligente processado com ${smartSummary.summaryItems.length} itens`);
            
            // Salvar sumário no edital
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
            
          } catch (summaryError) {
            console.error(`❌ Erro ao gerar sumário inteligente:`, summaryError);
            console.log(`⚠️ Prosseguindo sem sumário IA`);
          }
          
          // Gerar embeddings e enviar para Pinecone
          console.log(`🧮 Gerando embeddings e enviando para Pinecone...`);
          try {
            if (hierarchicalStructure.chunks && hierarchicalStructure.chunks.length > 0) {
              await this.processDocumentEmbeddings(
                hierarchicalStructure,
                request.userId,
                edital.id,
                request.fileName
              );
              
              console.log(`✅ Embeddings gerados e enviados para Pinecone com sucesso`);
            } else {
              console.warn(`⚠️ Nenhum chunk disponível para geração de embeddings`);
            }
          } catch (embeddingsError) {
            console.error(`❌ Erro ao gerar embeddings:`, embeddingsError);
            console.log(`⚠️ Prosseguindo sem embeddings`);
          }
          
          // Marcar processamento local como concluído
          console.log(`✅ Processamento local completo, atualizando status para 'completed'`);
          await storage.updateEdital(edital.id, {
            status: 'completed',
            processedAt: new Date()
          });
          
        } catch (hierarchicalError) {
          console.error(`❌ Erro no processamento hierárquico de ${request.fileName}:`, hierarchicalError);
          console.log(`⚠️ Usando estrutura básica para ${request.fileName}`);
        }
      } else {
        // Processamento externo foi bem-sucedido
        console.log(`✅ Processamento externo concluído com sucesso`);
        jobId = processingResponse.job_id || 'external_processing_success';
      }

      // 5. Salvar Job ID no edital (se disponível)
      if (jobId) {
        console.log(`💾 Job ID salvo: ${jobId}`);
        await storage.updateEdital(edital.id, {
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
      
      // Buscar edital atualizado para garantir consistência do status
      const updatedEdital = await storage.getEdital(edital.id);
      
      return {
        success: true,
        edital: updatedEdital || edital,
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
   * Converte DocumentStructure para formato hierárquico com agrupamento inteligente
   */
  private convertToHierarchicalFormat(documentStructure: DocumentStructure): HierarchicalStructure {
    console.log(`🔄 [CONVERT] Convertendo ${documentStructure.elements.length} elementos para formato hierárquico`);
    
    if (documentStructure.elements.length === 0) {
      console.warn(`⚠️ [CONVERT] Nenhum elemento encontrado para conversão`);
      return {
        chunks: [],
        documentName: documentStructure.documentName,
        structure: []
      };
    }
    
    // PASSO 1: Filtrar elementos relevantes para chunking
    const relevantElements = documentStructure.elements.filter(element => {
      // Incluir títulos, subtítulos e textos substanciais
      const isRelevantType = ['title', 'subtitle', 'text', 'list'].includes(element.type);
      const hasContent = element.text && element.text.trim().length >= 10; // Mínimo 10 caracteres
      return isRelevantType && hasContent;
    });
    
    console.log(`🔄 [CONVERT] ${relevantElements.length} elementos relevantes selecionados (de ${documentStructure.elements.length})`);
    
    if (relevantElements.length === 0) {
      console.warn(`⚠️ [CONVERT] Nenhum elemento relevante encontrado`);
      return this.createFallbackHierarchicalStructure(documentStructure.documentName);
    }
    
    // PASSO 2: Agrupar elementos em chunks hierárquicos
    const chunks = this.groupElementsIntoHierarchicalChunks(relevantElements);
    console.log(`🔄 [CONVERT] ${chunks.length} chunks hierárquicos criados`);
    
    return {
      chunks,
      documentName: documentStructure.documentName,
      structure: chunks
    };
  }
  
  /**
   * Agrupa elementos em chunks hierárquicos baseado em título/conteúdo
   */
  private groupElementsIntoHierarchicalChunks(elements: Array<{
    id: string;
    type: 'title' | 'subtitle' | 'text' | 'table' | 'list' | 'header' | 'footer';
    level: number;
    text: string;
    position: any;
    fontInfo: any;
    parentId?: string;
  }>): Array<{
    title: string;
    content: string;
    level: number;
    children?: any[];
  }> {
    const chunks: Array<{
      title: string;
      content: string;
      level: number;
      children?: any[];
    }> = [];
    
    let currentChunk: {
      title: string;
      content: string;
      level: number;
      titleElement?: any;
      contentElements: any[];
    } | null = null;
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Determinar se este elemento deve iniciar um novo chunk
      const shouldStartNewChunk = this.shouldStartNewChunk(element, currentChunk);
      
      if (shouldStartNewChunk) {
        // Finalizar chunk anterior
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk));
        }
        
        // Iniciar novo chunk
        currentChunk = {
          title: this.extractChunkTitle(element),
          content: '',
          level: this.determineChunkLevel(element),
          titleElement: element,
          contentElements: []
        };
        
        // Se não for apenas título, adicionar conteúdo também
        if (element.type !== 'title' && element.type !== 'subtitle') {
          currentChunk.contentElements.push(element);
        }
      } else if (currentChunk) {
        // Adicionar ao chunk atual
        currentChunk.contentElements.push(element);
      } else {
        // Caso especial: primeiro elemento não é título
        currentChunk = {
          title: this.extractChunkTitle(element),
          content: '',
          level: 1,
          titleElement: null,
          contentElements: [element]
        };
      }
    }
    
    // Finalizar último chunk
    if (currentChunk) {
      chunks.push(this.finalizeChunk(currentChunk));
    }
    
    return chunks;
  }
  
  /**
   * Determina se um elemento deve iniciar um novo chunk
   */
  private shouldStartNewChunk(
    element: any, 
    currentChunk: any
  ): boolean {
    // Sempre iniciar novo chunk para títulos e subtítulos
    if (element.type === 'title' || element.type === 'subtitle') {
      return true;
    }
    
    // Se não há chunk atual, iniciar um
    if (!currentChunk) {
      return true;
    }
    
    // NOVA LÓGICA: Detectar títulos reais baseado no conteúdo
    const elementText = element.text.trim();
    
    // Padrões que indicam início de nova seção principal
    const isMajorSectionStart = this.detectMajorSectionStart(elementText);
    if (isMajorSectionStart) {
      console.log(`🎯 [CHUNK-DETECTION] Nova seção detectada: "${elementText.substring(0, 60)}..."`);
      return true;
    }
    
    // Verificar se é numeração sequencial (1., 2., 3., etc.)
    const isSequentialNumbering = this.detectSequentialNumbering(elementText);
    if (isSequentialNumbering) {
      console.log(`📝 [CHUNK-DETECTION] Numeração sequencial detectada: "${elementText.substring(0, 40)}..."`);
      return true;
    }
    
    // Verificar mudança significativa de nível (mais restritivo)
    if (Math.abs(element.level - currentChunk.level) > 2) {
      return true;
    }
    
    // Se já há muito conteúdo no chunk atual (>4000 caracteres para evitar fragmentação excessiva)
    const currentContentLength = currentChunk.contentElements
      .map((el: any) => el.text || '')
      .join(' ')
      .length;
    
    if (currentContentLength > 4000) {
      console.log(`📏 [CHUNK-DETECTION] Chunk muito longo (${currentContentLength} chars), dividindo`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Detecta início de seções principais
   */
  private detectMajorSectionStart(text: string): boolean {
    // Remover espaços e normalizar
    const normalized = text.trim().toUpperCase();
    
    // Padrões de títulos principais
    const majorSectionPatterns = [
      /^[A-Z\s]{10,}:/, // Texto em maiúsculas seguido de ":"
      /^(ANEXO|CAPÍTULO|SEÇÃO|TÍTULO)\s+(I{1,3}|[IVX]+|\d+)/i, // ANEXO I, CAPÍTULO II, etc.
      /^(DAS|DO|DA)\s+[A-Z]/i, // "DAS DISPOSIÇÕES", "DO CONCURSO", etc.
      /^\d+\.\s*[A-Z][A-Z\s]{5,}/, // "1. INTRODUÇÃO", "2. REQUISITOS"
      /^[A-Z][A-Z\s]{15,}$/, // Texto longo todo em maiúsculas
    ];
    
    return majorSectionPatterns.some(pattern => pattern.test(normalized));
  }
  
  /**
   * Detecta numeração sequencial
   */
  private detectSequentialNumbering(text: string): boolean {
    const normalized = text.trim();
    
    // Padrões de numeração
    const numberingPatterns = [
      /^\d+\.\d+/, // 1.1, 2.3, etc.
      /^\d+\)\s/, // 1) texto
      /^[a-z]\)\s/, // a) texto  
      /^[IVX]+\.\s/, // I. II. III.
      /^\d+\.[\d\.]+\s/, // 1.2.3 ou 1.2.3.4
    ];
    
    return numberingPatterns.some(pattern => pattern.test(normalized));
  }
  
  /**
   * Extrai título apropriado para o chunk
   */
  private extractChunkTitle(element: any): string {
    if (element.type === 'title' || element.type === 'subtitle') {
      return element.text.trim();
    }
    
    // Para outros tipos, criar título baseado no conteúdo
    const text = element.text.trim();
    if (text.length <= 80) {
      return text;
    }
    
    // Usar primeiras palavras como título
    const words = text.split(/\s+/);
    const titleWords = [];
    let length = 0;
    
    for (const word of words) {
      if (length + word.length + 1 > 60) break;
      titleWords.push(word);
      length += word.length + 1;
    }
    
    return titleWords.join(' ') + (titleWords.length < words.length ? '...' : '');
  }
  
  /**
   * Determina nível hierárquico do chunk
   */
  private determineChunkLevel(element: any): number {
    // Usar nível do elemento, limitado entre 1-4
    return Math.max(1, Math.min(4, element.level));
  }
  
  /**
   * Finaliza construção de um chunk
   */
  private finalizeChunk(chunkData: {
    title: string;
    content: string;
    level: number;
    titleElement?: any;
    contentElements: any[];
  }): {
    title: string;
    content: string;
    level: number;
    children?: any[];
  } {
    // Construir conteúdo do chunk
    const contentParts = chunkData.contentElements.map(el => el.text.trim());
    
    // Se há título específico, não incluir no conteúdo
    if (chunkData.titleElement && chunkData.titleElement.type !== 'text') {
      chunkData.content = contentParts.join('\n\n');
    } else {
      // Se título foi extraído do conteúdo, incluir tudo
      chunkData.content = contentParts.join('\n\n');
    }
    
    // Garantir que há conteúdo mínimo
    if (!chunkData.content || chunkData.content.trim().length < 5) {
      chunkData.content = chunkData.title; // Usar título como conteúdo
    }
    
    console.log(`✅ [CHUNK] "${chunkData.title.substring(0, 40)}..." (${chunkData.content.length} chars, level ${chunkData.level})`);
    
    return {
      title: chunkData.title,
      content: chunkData.content,
      level: chunkData.level,
      children: []
    };
  }
  
  /**
   * Cria estrutura hierárquica de fallback
   */
  private createFallbackHierarchicalStructure(documentName: string): HierarchicalStructure {
    const fallbackChunk = {
      title: 'Documento sem estrutura detectada',
      content: `O documento ${documentName} foi processado mas não foi possível detectar uma estrutura hierárquica clara.`,
      level: 1,
      children: []
    };
    
    return {
      chunks: [fallbackChunk],
      documentName,
      structure: [fallbackChunk]
    };
  }
  
  /**
   * Processa embeddings do documento e envia para Pinecone
   */
  private async processDocumentEmbeddings(
    hierarchicalStructure: HierarchicalStructure,
    userId: string,
    editalId: string,
    fileName: string
  ): Promise<void> {
    if (!hierarchicalStructure.chunks || hierarchicalStructure.chunks.length === 0) {
      console.warn(`🧮 [EMBEDDINGS] Nenhum chunk disponível para processamento`);
      return;
    }
    
    console.log(`🧮 [EMBEDDINGS] Iniciando processamento de embeddings para ${hierarchicalStructure.chunks.length} chunks`);
    
    // Converter chunks hierárquicos para formato RAG
    const ragDocuments = hierarchicalStructure.chunks.map((chunk, index) => ({
      id: `edital-${editalId}-chunk-${index}`,
      userId: userId, // CORREÇÃO: userId deve estar no nível raiz
      content: chunk.content,
      createdAt: new Date(), // CORREÇÃO: Campo obrigatório adicionado
      metadata: {
        editalId,
        fileName,
        title: chunk.title,
        level: chunk.level,
        chunkIndex: index,
        source: 'edital_pdf',
        processedAt: new Date().toISOString(),
        documentName: hierarchicalStructure.documentName
      }
    }));
    
    console.log(`🧮 [EMBEDDINGS] ${ragDocuments.length} documentos RAG preparados`);
    
    // Processar através do Chat RAG (adequado para documentos gerais)
    try {
      console.log(`🧮 [EMBEDDINGS] Enviando documentos para Chat RAG...`);
      
      for (const document of ragDocuments) {
        await chatRAG.processDocument(document);
        console.log(`✅ [EMBEDDINGS] Documento processado: ${document.metadata.title.substring(0, 50)}...`);
      }
      
      console.log(`✅ [EMBEDDINGS] Todos os ${ragDocuments.length} documentos processados com sucesso`);
      
    } catch (ragError) {
      console.error(`❌ [EMBEDDINGS] Erro ao processar documentos via Chat RAG:`, ragError);
      const errorMessage = ragError instanceof Error ? ragError.message : 'Erro desconhecido';
      throw new Error(`Falha na geração de embeddings: ${errorMessage}`);
    }
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