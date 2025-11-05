import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';

export interface OCRResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
    blocks: Array<{
      text: string;
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  }>;
}

export class CloudVisionService {
  private client: ImageAnnotatorClient;

  constructor() {
    // Configurar autenticação usando variáveis de ambiente do Replit
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    };

    this.client = new ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    console.log('✅ Google Cloud Vision API configurado com sucesso');
  }

  /**
   * Extrai texto de PDF usando OCR avançado do Google Cloud Vision
   */
  async extractTextFromPDF(filePath: string): Promise<OCRResult> {
    try {
      console.log(`🔍 [CloudVision] Iniciando OCR para: ${path.basename(filePath)}`);
      
      // Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Ler arquivo como buffer
      const imageBuffer = fs.readFileSync(filePath);
      
      // Fazer chamada para Cloud Vision API
      const [result] = await this.client.documentTextDetection({
        image: {
          content: imageBuffer,
        },
      });

      if (!result.fullTextAnnotation) {
        console.log('⚠️ [CloudVision] Nenhum texto detectado no documento');
        return {
          text: '',
          confidence: 0,
          pages: []
        };
      }

      // Processar resultado
      const fullText = result.fullTextAnnotation.text || '';
      const confidence = this.calculateAverageConfidence(result.fullTextAnnotation);
      
      console.log(`✅ [CloudVision] OCR concluído: ${fullText.length} caracteres, confiança: ${confidence.toFixed(2)}`);
      
      // Processar páginas estruturadas
      const pages = this.processPages(result.fullTextAnnotation);

      return {
        text: fullText,
        confidence,
        pages
      };

    } catch (error) {
      console.error('❌ [CloudVision] Erro no OCR:', error);
      throw new Error(`Falha no OCR: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Verifica se um PDF é escaneado (sem texto extraível) e precisa de OCR
   */
  async needsOCR(pdfText: string): Promise<boolean> {
    // Se o texto extraído do PDF é muito pequeno ou vazio, provavelmente é escaneado
    const cleanText = pdfText.trim();
    
    if (cleanText.length < 100) {
      console.log('🔍 [CloudVision] PDF parece ser escaneado (pouco texto extraível)');
      return true;
    }
    
    // Verificar se o texto contém muitos caracteres de controle ou estranhos
    const strangeCharRatio = (cleanText.match(/[^\w\s\-.,;:!?()]/g) || []).length / cleanText.length;
    
    if (strangeCharRatio > 0.3) {
      console.log('🔍 [CloudVision] PDF parece ter problemas de extração (muitos caracteres estranhos)');
      return true;
    }
    
    return false;
  }

  /**
   * Calcula confiança média do OCR
   */
  private calculateAverageConfidence(annotation: any): number {
    if (!annotation.pages || annotation.pages.length === 0) {
      return 0;
    }

    let totalConfidence = 0;
    let wordCount = 0;

    annotation.pages.forEach((page: any) => {
      if (page.blocks) {
        page.blocks.forEach((block: any) => {
          if (block.paragraphs) {
            block.paragraphs.forEach((paragraph: any) => {
              if (paragraph.words) {
                paragraph.words.forEach((word: any) => {
                  if (word.confidence !== undefined) {
                    totalConfidence += word.confidence;
                    wordCount++;
                  }
                });
              }
            });
          }
        });
      }
    });

    return wordCount > 0 ? totalConfidence / wordCount : 0;
  }

  /**
   * Processa páginas estruturadas do resultado OCR
   */
  private processPages(annotation: any): OCRResult['pages'] {
    if (!annotation.pages) {
      return [];
    }

    return annotation.pages.map((page: any, index: number) => {
      let pageText = '';
      const blocks: OCRResult['pages'][0]['blocks'] = [];
      let pageConfidence = 0;
      let wordCount = 0;

      if (page.blocks) {
        page.blocks.forEach((block: any) => {
          let blockText = '';
          let blockConfidence = 0;
          let blockWordCount = 0;

          if (block.paragraphs) {
            block.paragraphs.forEach((paragraph: any) => {
              if (paragraph.words) {
                paragraph.words.forEach((word: any) => {
                  const wordText = word.symbols?.map((s: any) => s.text).join('') || '';
                  blockText += wordText + ' ';
                  pageText += wordText + ' ';
                  
                  if (word.confidence !== undefined) {
                    blockConfidence += word.confidence;
                    pageConfidence += word.confidence;
                    blockWordCount++;
                    wordCount++;
                  }
                });
                blockText += '\n';
                pageText += '\n';
              }
            });
          }

          if (blockText.trim()) {
            blocks.push({
              text: blockText.trim(),
              confidence: blockWordCount > 0 ? blockConfidence / blockWordCount : 0,
              boundingBox: this.extractBoundingBox(block.boundingBox)
            });
          }
        });
      }

      return {
        pageNumber: index + 1,
        text: pageText.trim(),
        confidence: wordCount > 0 ? pageConfidence / wordCount : 0,
        blocks
      };
    });
  }

  /**
   * Extrai bounding box de um bloco
   */
  private extractBoundingBox(boundingBox: any) {
    if (!boundingBox || !boundingBox.vertices || boundingBox.vertices.length < 2) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const vertices = boundingBox.vertices;
    const minX = Math.min(...vertices.map((v: any) => v.x || 0));
    const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
    const minY = Math.min(...vertices.map((v: any) => v.y || 0));
    const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}