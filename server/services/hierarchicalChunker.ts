import { pdf2jsonExtractor, type DocumentStructure } from './pdf2jsonExtractor';
import { structureInterpreter, type HierarchicalChunk, type InterpreterResult } from './structureInterpreter';

export interface ProcessedDocument {
  documentName: string;
  totalChunks: number;
  structure: HierarchicalChunk[];
  extractedAt: Date;
  metadata: {
    structureQuality: 'excellent' | 'good' | 'fair' | 'poor';
    processingMethod: 'pdf2json_enhanced';
    totalPages: number;
    avgConfidence: number;
    detectedSections: string[];
    recommendations: string[];
  };
}

export class HierarchicalChunker {
  
  /**
   * Processa um documento PDF com chunking hierárquico avançado
   * Substitui titleBasedChunkingService com tecnologia superior
   */
  async processDocumentWithHierarchicalChunking(
    filePath: string, 
    fileName: string
  ): Promise<ProcessedDocument> {
    console.log(`🔄 [HierarchicalChunker] Iniciando processamento avançado: ${fileName}`);
    
    try {
      // ETAPA 1: Extrair estrutura preservando layout
      console.log(`📄 Etapa 1: Extraindo estrutura com preservação de layout...`);
      const documentStructure = await pdf2jsonExtractor.extractDocumentStructure(filePath, fileName);
      
      console.log(`✅ Estrutura extraída: ${documentStructure.elements.length} elementos, ${documentStructure.totalPages} páginas`);
      
      // ETAPA 2: Interpretar e refinar estrutura com IA semântica
      console.log(`🧠 Etapa 2: Aplicando análise semântica inteligente...`);
      const interpreterResult = await structureInterpreter.interpretDocumentStructure(documentStructure);
      
      console.log(`✅ Análise semântica concluída: ${interpreterResult.chunks.length} chunks hierárquicos`);
      
      // ETAPA 3: Validação e qualidade da estrutura
      const avgConfidence = this.calculateAverageConfidence(interpreterResult.chunks);
      console.log(`📊 Confiança média da estrutura: ${(avgConfidence * 100).toFixed(1)}%`);
      
      // ETAPA 4: Gerar resultado final
      const processedDocument: ProcessedDocument = {
        documentName: fileName,
        totalChunks: interpreterResult.chunks.length,
        structure: interpreterResult.chunks,
        extractedAt: new Date(),
        metadata: {
          structureQuality: interpreterResult.documentSummary.structureQuality,
          processingMethod: 'pdf2json_enhanced',
          totalPages: documentStructure.totalPages,
          avgConfidence,
          detectedSections: interpreterResult.documentSummary.detectedSections,
          recommendations: interpreterResult.documentSummary.recommendations
        }
      };
      
      // ETAPA 5: Log detalhado dos resultados
      this.logProcessingResults(processedDocument);
      
      return processedDocument;
      
    } catch (error) {
      console.error(`❌ Erro no processamento hierárquico de ${fileName}:`, error);
      
      // Fallback: retornar estrutura mínima
      return this.createFallbackStructure(fileName, error);
    }
  }
  
  /**
   * Calcula confiança média dos chunks
   */
  private calculateAverageConfidence(chunks: HierarchicalChunk[]): number {
    if (chunks.length === 0) return 0;
    
    const totalConfidence = chunks.reduce((sum, chunk) => sum + chunk.metadata.confidence, 0);
    return totalConfidence / chunks.length;
  }
  
  /**
   * Log detalhado dos resultados do processamento
   */
  private logProcessingResults(document: ProcessedDocument): void {
    console.log(`\n📊 ===== RESULTADO DO PROCESSAMENTO HIERÁRQUICO =====`);
    console.log(`📄 Documento: ${document.documentName}`);
    console.log(`📑 Total de chunks: ${document.totalChunks}`);
    console.log(`🏆 Qualidade da estrutura: ${document.metadata.structureQuality}`);
    console.log(`📈 Confiança média: ${(document.metadata.avgConfidence * 100).toFixed(1)}%`);
    console.log(`📋 Páginas processadas: ${document.metadata.totalPages}`);
    
    console.log(`\n🎯 SEÇÕES DETECTADAS:`);
    document.metadata.detectedSections.forEach((section, index) => {
      const chunk = document.structure[index];
      const confidence = chunk ? (chunk.metadata.confidence * 100).toFixed(0) : 'N/A';
      const level = chunk ? chunk.level : 'N/A';
      const type = chunk ? chunk.metadata.sectionType : 'N/A';
      console.log(`  ${index + 1}. [Nível ${level}] ${section} (${confidence}% confiança, tipo: ${type})`);
    });
    
    if (document.metadata.recommendations.length > 0) {
      console.log(`\n💡 RECOMENDAÇÕES:`);
      document.metadata.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    console.log(`\n📊 DISTRIBUIÇÃO POR TIPO DE SEÇÃO:`);
    const sectionTypes = document.structure.reduce((acc, chunk) => {
      acc[chunk.metadata.sectionType] = (acc[chunk.metadata.sectionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(sectionTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count} seções`);
    });
    
    console.log(`================================================\n`);
  }
  
  /**
   * Cria estrutura fallback em caso de erro
   */
  private createFallbackStructure(fileName: string, error: any): ProcessedDocument {
    console.warn(`⚠️ Criando estrutura fallback para ${fileName}`);
    
    const fallbackChunk: HierarchicalChunk = {
      id: 'fallback_chunk_0',
      title: 'Documento (Estrutura não detectada)',
      level: 1,
      content: `Documento ${fileName} não pôde ser processado adequadamente.\nErro: ${error.message || 'Erro desconhecido'}`,
      startPosition: 0,
      endPosition: 0,
      metadata: {
        wordCount: 10,
        hasNumbers: false,
        hasSpecialTerms: false,
        confidence: 0.1,
        sectionType: 'outros'
      }
    };
    
    return {
      documentName: fileName,
      totalChunks: 1,
      structure: [fallbackChunk],
      extractedAt: new Date(),
      metadata: {
        structureQuality: 'poor',
        processingMethod: 'pdf2json_enhanced',
        totalPages: 0,
        avgConfidence: 0.1,
        detectedSections: [fallbackChunk.title],
        recommendations: [
          'Verificar se o arquivo é um PDF válido',
          'Verificar se o PDF contém texto (não apenas imagens)',
          'Considerar processar manualmente se necessário'
        ]
      }
    };
  }
  
  /**
   * Converte para formato compatível com titleBasedChunking (para transição)
   */
  convertToLegacyFormat(processedDocument: ProcessedDocument): {
    documentName: string;
    totalChunks: number;
    structure: Array<{
      id: string;
      title: string;
      level: number;
      content: string;
      startPosition: number;
      endPosition: number;
      parentId?: string;
    }>;
    extractedAt: Date;
  } {
    return {
      documentName: processedDocument.documentName,
      totalChunks: processedDocument.totalChunks,
      structure: processedDocument.structure.map(chunk => ({
        id: chunk.id,
        title: chunk.title,
        level: chunk.level,
        content: chunk.content,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition,
        parentId: chunk.parentId
      })),
      extractedAt: processedDocument.extractedAt
    };
  }
  
  /**
   * Gera relatório de comparação com método antigo (para análise)
   */
  generateComparisonReport(processedDocument: ProcessedDocument): {
    improvements: string[];
    technicalAdvantages: string[];
    qualityMetrics: {
      layoutPreservation: boolean;
      semanticAnalysis: boolean;
      hierarchyValidation: boolean;
      confidenceScoring: boolean;
      sectionTypeDetection: boolean;
    };
  } {
    return {
      improvements: [
        `Detecção hierárquica: ${processedDocument.totalChunks} seções vs método anterior (títulos imprecisos)`,
        `Preservação de layout: Posicionamento e formatação mantidos`,
        `Análise semântica: Classificação automática por tipo de seção`,
        `Validação de confiança: Score médio de ${(processedDocument.metadata.avgConfidence * 100).toFixed(1)}%`,
        `Qualidade da estrutura: ${processedDocument.metadata.structureQuality}`
      ],
      technicalAdvantages: [
        'pdf2json preserva informações de layout que pdf-parse perde',
        'Análise contextual considera elementos vizinhos',
        'Correção automática de hierarquia baseada em semântica',
        'Detecção de padrões específicos de editais',
        'Merger inteligente de chunks pequenos',
        'Fallback robusto para documentos problemáticos'
      ],
      qualityMetrics: {
        layoutPreservation: true,
        semanticAnalysis: true,
        hierarchyValidation: true,
        confidenceScoring: true,
        sectionTypeDetection: true
      }
    };
  }
  
  /**
   * Método público para processar apenas texto (compatibilidade com testes)
   */
  processContent(text: string): {
    titleChunks: string[];
    documentStructure: HierarchicalChunk[];
  } {
    // Para compatibilidade com testes existentes
    // Divide texto simples de forma básica já que não temos layout
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const chunkSize = Math.max(1, Math.floor(lines.length / 4));
    
    const documentStructure: HierarchicalChunk[] = [];
    const titleChunks: string[] = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      const content = chunkLines.join('\n');
      const title = `Seção ${Math.floor(i / chunkSize) + 1}`;
      
      const chunk: HierarchicalChunk = {
        id: `text_chunk_${Math.floor(i / chunkSize)}`,
        title,
        level: 1,
        content,
        startPosition: i * 50, // Estimativa
        endPosition: (i + chunkSize) * 50,
        metadata: {
          wordCount: content.split(/\s+/).length,
          hasNumbers: /\d/.test(content),
          hasSpecialTerms: /edital|concurso|prova/i.test(content),
          confidence: 0.5,
          sectionType: 'outros'
        }
      };
      
      documentStructure.push(chunk);
      titleChunks.push(content);
    }
    
    return {
      titleChunks,
      documentStructure
    };
  }
}

export const hierarchicalChunker = new HierarchicalChunker();