import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export interface PDFProcessingResult {
  text: string;
  pages: number;
  metadata?: any;
  chunks: string[];
}

export class PDFService {
  /**
   * Processa um arquivo PDF e extrai o texto
   */
  async processPDF(filePath: string): Promise<PDFProcessingResult> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      // Chunking simples - divide o texto em pedaços de ~500 palavras
      const chunks = this.chunkText(data.text, 500);
      
      return {
        text: data.text,
        pages: data.numpages,
        metadata: data.metadata,
        chunks: chunks
      };
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      throw new Error('Falha ao processar o arquivo PDF');
    }
  }

  /**
   * Divide o texto em chunks menores para busca mais eficiente
   */
  private chunkText(text: string, wordsPerChunk: number = 500): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Busca texto relevante nos chunks baseado em uma query
   */
  searchInChunks(chunks: string[], query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevantChunks: { chunk: string; score: number }[] = [];
    
    chunks.forEach(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        if (chunkLower.includes(word)) {
          score += 1;
        }
      });
      
      if (score > 0) {
        relevantChunks.push({ chunk, score });
      }
    });
    
    // Ordena por relevância e retorna os top 3 chunks
    return relevantChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.chunk);
  }

  /**
   * Limpa arquivo temporário
   */
  cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Erro ao limpar arquivo:', error);
    }
  }
}

export const pdfService = new PDFService();