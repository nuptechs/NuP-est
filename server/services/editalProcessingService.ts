import { pdf2jsonExtractor } from './pdf2jsonExtractor';
import { structureInterpreter } from './structureInterpreter';
import { hierarchicalChunker } from './hierarchicalChunker';

export interface ProcessedEdital {
  success: boolean;
  documentName: string;
  totalTitles: number;
  structureQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hierarchicalChunks: Array<{
    id: string;
    title: string;
    level: number;
    content: string;
    startPosition: number;
    endPosition: number;
    parentId?: string;
  }>;
  metadata: {
    totalPages: number;
    avgConfidence: number;
    detectedSections: string[];
    processingMethod: 'pdf2json_enhanced';
    extractedAt: Date;
  };
  error?: string;
}

export class EditalProcessingService {
  
  /**
   * Processa edital PDF com extração hierárquica de títulos e estrutura
   * Serviço encapsulado para uso em diferentes partes do sistema
   */
  async processEditalPDF(filePath: string, fileName: string): Promise<ProcessedEdital> {
    console.log(`🔄 [EditalProcessingService] Iniciando processamento de: ${fileName}`);
    
    try {
      // ETAPA 1: Extrair estrutura com normalização de linhas
      console.log('📄 Etapa 1: Extraindo estrutura hierárquica...');
      const documentStructure = await pdf2jsonExtractor.extractDocumentStructure(filePath, fileName);
      
      if (!documentStructure || documentStructure.elements.length === 0) {
        throw new Error('Nenhuma estrutura de texto foi extraída do PDF');
      }
      
      console.log(`✅ Extraídos ${documentStructure.elements.length} elementos de ${documentStructure.totalPages} páginas`);
      
      // ETAPA 2: Interpretar estrutura semântica
      console.log('🧠 Etapa 2: Interpretando estrutura com IA...');
      const interpreterResult = await structureInterpreter.interpretDocumentStructure(documentStructure);
      
      console.log(`✅ Interpretação concluída: ${interpreterResult.chunks.length} chunks, qualidade: ${interpreterResult.documentSummary.structureQuality}`);
      
      // ETAPA 3: Verificar qualidade crítica
      if (interpreterResult.documentSummary.structureQuality === 'poor') {
        throw new Error(`Qualidade de estrutura insuficiente. Títulos e hierarquia não foram detectados corretamente.`);
      }
      
      // ETAPA 4: Converter para chunks hierárquicos
      const hierarchicalChunks = pdf2jsonExtractor.convertToHierarchicalChunks(documentStructure);
      
      // ETAPA 5: Calcular confiança média
      const avgConfidence = this.calculateAverageConfidence(interpreterResult.chunks);
      
      const result: ProcessedEdital = {
        success: true,
        documentName: fileName,
        totalTitles: documentStructure.metadata.totalTitles,
        structureQuality: interpreterResult.documentSummary.structureQuality,
        hierarchicalChunks,
        metadata: {
          totalPages: documentStructure.totalPages,
          avgConfidence,
          detectedSections: interpreterResult.documentSummary.detectedSections,
          processingMethod: 'pdf2json_enhanced',
          extractedAt: new Date()
        }
      };
      
      console.log(`✅ [EditalProcessingService] Processamento concluído com sucesso para ${fileName}`);
      this.logProcessingSummary(result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ [EditalProcessingService] Erro ao processar ${fileName}:`, error);
      
      return {
        success: false,
        documentName: fileName,
        totalTitles: 0,
        structureQuality: 'poor',
        hierarchicalChunks: [],
        metadata: {
          totalPages: 0,
          avgConfidence: 0,
          detectedSections: [],
          processingMethod: 'pdf2json_enhanced',
          extractedAt: new Date()
        },
        error: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
      };
    }
  }
  
  /**
   * Método de teste rápido para validar processamento
   */
  async testProcessing(filePath: string): Promise<{
    isWorking: boolean;
    titlesDetected: number;
    structureQuality: string;
    error?: string;
  }> {
    try {
      const result = await this.processEditalPDF(filePath, 'test.pdf');
      
      return {
        isWorking: result.success,
        titlesDetected: result.totalTitles,
        structureQuality: result.structureQuality,
        error: result.error
      };
    } catch (error) {
      return {
        isWorking: false,
        titlesDetected: 0,
        structureQuality: 'poor',
        error: error instanceof Error ? error.message : 'Erro no teste'
      };
    }
  }
  
  /**
   * Extrai apenas títulos e estrutura (sem conteúdo completo)
   * Para uso em interfaces que precisam só do índice
   */
  async extractTableOfContents(filePath: string, fileName: string): Promise<{
    success: boolean;
    titles: Array<{
      id: string;
      title: string;
      level: number;
      page?: number;
    }>;
    totalTitles: number;
    error?: string;
  }> {
    try {
      const result = await this.processEditalPDF(filePath, fileName);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha no processamento');
      }
      
      const titles = result.hierarchicalChunks
        .filter(chunk => chunk.title && chunk.title.trim().length > 0)
        .map(chunk => ({
          id: chunk.id,
          title: chunk.title,
          level: chunk.level
        }));
      
      return {
        success: true,
        titles,
        totalTitles: titles.length
      };
      
    } catch (error) {
      return {
        success: false,
        titles: [],
        totalTitles: 0,
        error: error instanceof Error ? error.message : 'Erro na extração'
      };
    }
  }
  
  /**
   * Calcula confiança média da estrutura
   */
  private calculateAverageConfidence(chunks: any[]): number {
    if (chunks.length === 0) return 0;
    
    const confidenceSum = chunks.reduce((sum, chunk) => {
      return sum + (chunk.confidence || 0.5);
    }, 0);
    
    return confidenceSum / chunks.length;
  }
  
  /**
   * Log detalhado dos resultados do processamento
   */
  private logProcessingSummary(result: ProcessedEdital): void {
    console.log(`
🔍 [EditalProcessingService] RESUMO DO PROCESSAMENTO:
📄 Documento: ${result.documentName}
📊 Qualidade: ${result.structureQuality}
📝 Títulos detectados: ${result.totalTitles}
📃 Páginas: ${result.metadata.totalPages}
🎯 Confiança: ${(result.metadata.avgConfidence * 100).toFixed(1)}%
📋 Seções: ${result.metadata.detectedSections.join(', ')}
⏰ Processado em: ${result.metadata.extractedAt.toISOString()}
    `);
  }
}

export const editalProcessingService = new EditalProcessingService();