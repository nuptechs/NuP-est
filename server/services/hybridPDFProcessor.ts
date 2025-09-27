import { PDF2JsonExtractor, type LayoutElement } from './pdf2jsonExtractor.js';
import { CloudVisionService } from './cloudVisionService.js';
import type { DocumentStructure } from './pdf2jsonExtractor.js';
import type { OCRResult } from './cloudVisionService.js';

export interface HybridProcessingResult {
  success: boolean;
  method: 'pdf2json' | 'cloud-vision' | 'hybrid';
  documentStructure?: DocumentStructure;
  ocrResult?: OCRResult;
  fallbackUsed: boolean;
  processingTime: number;
  quality: {
    textExtractionScore: number;
    structureDetectionScore: number;
    overallConfidence: number;
  };
}

export class HybridPDFProcessor {
  private pdf2jsonExtractor: PDF2JsonExtractor;
  private cloudVisionService: CloudVisionService;

  constructor() {
    this.pdf2jsonExtractor = new PDF2JsonExtractor();
    this.cloudVisionService = new CloudVisionService();
    console.log('🔧 [HybridProcessor] Processador híbrido PDF inicializado');
  }

  /**
   * Processa PDF usando estratégia híbrida inteligente
   */
  async processDocument(filePath: string, fileName: string): Promise<HybridProcessingResult> {
    const startTime = Date.now();
    console.log(`🚀 [HybridProcessor] Iniciando processamento híbrido: ${fileName}`);

    try {
      // ETAPA 1: Tentar extração com pdf2json primeiro (mais rápido)
      console.log('📄 [HybridProcessor] Tentativa 1: Extração com pdf2json...');
      
      let pdf2jsonResult: DocumentStructure | null = null;
      let pdf2jsonError: Error | null = null;

      try {
        pdf2jsonResult = await this.pdf2jsonExtractor.extractDocumentStructure(filePath, fileName);
        console.log(`✅ [HybridProcessor] pdf2json extraiu ${pdf2jsonResult.elements.length} elementos`);
      } catch (error) {
        pdf2jsonError = error as Error;
        console.log(`⚠️ [HybridProcessor] pdf2json falhou: ${pdf2jsonError.message}`);
      }

      // ETAPA 2: Avaliar qualidade da extração pdf2json
      const pdf2jsonQuality = this.evaluatePDF2JsonQuality(pdf2jsonResult);
      console.log(`📊 [HybridProcessor] Qualidade pdf2json: ${pdf2jsonQuality.toFixed(2)}`);

      // ETAPA 3: Decidir se precisa de OCR
      const needsOCR = pdf2jsonQuality < 0.5 || !pdf2jsonResult || pdf2jsonResult.elements.length === 0;
      
      if (!needsOCR && pdf2jsonResult) {
        // PDF2JSON foi suficiente
        console.log('✅ [HybridProcessor] pdf2json suficiente - finalizando processamento');
        return {
          success: true,
          method: 'pdf2json',
          documentStructure: pdf2jsonResult,
          fallbackUsed: false,
          processingTime: Date.now() - startTime,
          quality: {
            textExtractionScore: pdf2jsonQuality,
            structureDetectionScore: this.calculateStructureScore(pdf2jsonResult),
            overallConfidence: pdf2jsonQuality
          }
        };
      }

      // ETAPA 4: Executar OCR com Cloud Vision
      console.log('🔍 [HybridProcessor] Qualidade insuficiente - executando OCR...');
      
      let ocrResult: OCRResult | null = null;
      let ocrError: Error | null = null;

      try {
        ocrResult = await this.cloudVisionService.extractTextFromPDF(filePath);
        console.log(`✅ [HybridProcessor] OCR extraiu ${ocrResult.text.length} caracteres (confiança: ${ocrResult.confidence.toFixed(2)})`);
      } catch (error) {
        ocrError = error as Error;
        console.log(`❌ [HybridProcessor] OCR falhou: ${ocrError.message}`);
      }

      // ETAPA 5: Combinar resultados ou escolher melhor
      if (ocrResult && ocrResult.confidence > 0.7) {
        // OCR teve boa qualidade - criar estrutura híbrida
        console.log('🔄 [HybridProcessor] Criando estrutura híbrida com OCR');
        const hybridStructure = await this.createHybridStructure(pdf2jsonResult, ocrResult, fileName);
        
        return {
          success: true,
          method: 'hybrid',
          documentStructure: hybridStructure,
          ocrResult,
          fallbackUsed: false,
          processingTime: Date.now() - startTime,
          quality: {
            textExtractionScore: Math.max(pdf2jsonQuality, ocrResult.confidence),
            structureDetectionScore: this.calculateStructureScore(hybridStructure),
            overallConfidence: (pdf2jsonQuality + ocrResult.confidence) / 2
          }
        };
      } else if (ocrResult) {
        // OCR teve qualidade baixa, mas ainda melhor que pdf2json
        console.log('⚠️ [HybridProcessor] OCR com qualidade baixa - usando como fallback');
        const ocrStructure = await this.convertOCRToStructure(ocrResult, fileName);
        
        return {
          success: true,
          method: 'cloud-vision',
          documentStructure: ocrStructure,
          ocrResult,
          fallbackUsed: true,
          processingTime: Date.now() - startTime,
          quality: {
            textExtractionScore: ocrResult.confidence,
            structureDetectionScore: this.calculateStructureScore(ocrStructure),
            overallConfidence: ocrResult.confidence
          }
        };
      } else if (pdf2jsonResult) {
        // OCR falhou, usar pdf2json como fallback
        console.log('⚠️ [HybridProcessor] OCR falhou - usando pdf2json como fallback');
        return {
          success: true,
          method: 'pdf2json',
          documentStructure: pdf2jsonResult,
          fallbackUsed: true,
          processingTime: Date.now() - startTime,
          quality: {
            textExtractionScore: pdf2jsonQuality,
            structureDetectionScore: this.calculateStructureScore(pdf2jsonResult),
            overallConfidence: pdf2jsonQuality
          }
        };
      } else {
        // Ambos falharam
        throw new Error(`Falha em ambos os métodos: pdf2json (${pdf2jsonError?.message}) e OCR (${ocrError?.message})`);
      }

    } catch (error) {
      console.error('❌ [HybridProcessor] Erro crítico no processamento:', error);
      return {
        success: false,
        method: 'pdf2json',
        fallbackUsed: true,
        processingTime: Date.now() - startTime,
        quality: {
          textExtractionScore: 0,
          structureDetectionScore: 0,
          overallConfidence: 0
        }
      };
    }
  }

  /**
   * Avalia qualidade da extração pdf2json
   */
  private evaluatePDF2JsonQuality(result: DocumentStructure | null): number {
    if (!result) return 0;

    let score = 0;

    // Penalizar se não extraiu elementos
    if (result.elements.length === 0) return 0;

    // Bonus por quantidade de elementos estruturados
    score += Math.min(result.elements.length / 50, 1) * 0.3;

    // Bonus por encontrar títulos
    const titleCount = result.elements.filter(e => e.type === 'title' || e.type === 'subtitle').length;
    score += Math.min(titleCount / 10, 1) * 0.4;

    // Bonus por diversidade de tipos
    const uniqueTypes = new Set(result.elements.map(e => e.type)).size;
    score += Math.min(uniqueTypes / 4, 1) * 0.2;

    // Bonus por texto substancial
    const totalTextLength = result.elements.reduce((sum, e) => sum + e.text.length, 0);
    score += Math.min(totalTextLength / 5000, 1) * 0.1;

    return Math.min(score, 1);
  }

  /**
   * Calcula score de detecção de estrutura
   */
  private calculateStructureScore(structure: DocumentStructure): number {
    if (!structure || structure.elements.length === 0) return 0;

    const hierarchyDepth = Math.max(...structure.elements.map(e => e.level));
    const titleRatio = structure.elements.filter(e => e.type === 'title' || e.type === 'subtitle').length / structure.elements.length;
    
    return Math.min((hierarchyDepth / 4) * 0.5 + titleRatio * 0.5, 1);
  }

  /**
   * Cria estrutura híbrida combinando pdf2json e OCR
   */
  private async createHybridStructure(
    pdf2jsonResult: DocumentStructure | null,
    ocrResult: OCRResult,
    fileName: string
  ): Promise<DocumentStructure> {
    // Se pdf2json tem estrutura boa, usar como base e enriquecer com OCR
    if (pdf2jsonResult && pdf2jsonResult.elements.length > 0) {
      console.log('🔄 [HybridProcessor] Enriquecendo estrutura pdf2json com OCR');
      return this.enrichPDF2JsonWithOCR(pdf2jsonResult, ocrResult);
    }

    // Senão, converter OCR para estrutura
    console.log('🔄 [HybridProcessor] Convertendo OCR para estrutura');
    return this.convertOCRToStructure(ocrResult, fileName);
  }

  /**
   * Enriquece estrutura pdf2json com dados OCR
   */
  private enrichPDF2JsonWithOCR(pdf2jsonStructure: DocumentStructure, ocrResult: OCRResult): DocumentStructure {
    // Para agora, retornar a estrutura pdf2json original
    // TODO: Implementar lógica de enriquecimento mais sofisticada
    console.log('🔧 [HybridProcessor] Enriquecimento OCR - usando estrutura pdf2json base');
    return pdf2jsonStructure;
  }

  /**
   * Converte resultado OCR para estrutura de documento
   */
  private async convertOCRToStructure(ocrResult: OCRResult, fileName: string): Promise<DocumentStructure> {
    console.log('🔄 [HybridProcessor] Convertendo OCR para DocumentStructure');

    const elements: LayoutElement[] = [];
    let elementId = 0;

    // Processar cada página do OCR
    ocrResult.pages.forEach((page, pageIndex) => {
      // Processar blocos da página
      page.blocks.forEach((block, blockIndex) => {
        // Tentar detectar se é título baseado na posição e conteúdo
        const isTitle = this.detectTitleFromOCRBlock(block, page);
        
        elements.push({
          id: `ocr_element_${elementId++}`,
          type: isTitle ? 'title' : 'text',
          level: isTitle ? (block.text.length < 50 ? 1 : 2) : 4,
          text: block.text,
          position: {
            page: page.pageNumber,
            x: block.boundingBox.x,
            y: block.boundingBox.y,
            width: block.boundingBox.width,
            height: block.boundingBox.height
          },
          fontInfo: {
            name: 'OCR-detected',
            size: 12, // Estimativa
            bold: isTitle,
            italic: false
          }
        });
      });
    });

    return {
      documentName: fileName,
      totalPages: ocrResult.pages.length,
      elements,
      extractedAt: new Date(),
      metadata: {
        totalTitles: elements.filter(e => e.type === 'title').length,
        titleHierarchy: elements.reduce((acc, e) => {
          if (e.type === 'title' || e.type === 'subtitle') {
            acc[e.level] = (acc[e.level] || 0) + 1;
          }
          return acc;
        }, {} as { [level: number]: number })
      }
    };
  }

  /**
   * Detecta se um bloco OCR é um título
   */
  private detectTitleFromOCRBlock(block: any, page: any): boolean {
    // Heurísticas simples para detectar títulos em OCR
    const text = block.text.trim();
    
    // Muito curto ou muito longo provavelmente não é título
    if (text.length < 3 || text.length > 200) return false;
    
    // Verificar se está no topo da página (Y baixo)
    const isNearTop = block.boundingBox.y < (page.blocks[0]?.boundingBox.y || 0) + 100;
    
    // Verificar se tem padrão de título (maiúsculas, números, etc.)
    const hasTitlePattern = /^[A-Z0-9\s\-\.]+$/.test(text) || /^\d+\.?\s/.test(text);
    
    // Verificar se termina sem pontuação (títulos raramente terminam com ponto)
    const endsWithoutPunctuation = !/[.!?]$/.test(text);
    
    return (isNearTop && hasTitlePattern) || (hasTitlePattern && endsWithoutPunctuation && text.length < 80);
  }
}