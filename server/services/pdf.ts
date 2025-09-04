import fs from 'fs';
import { createRequire } from 'module';
import { AppError, errorMessages } from '../utils/ErrorHandler';
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
      // Verificar tamanho do arquivo antes de processar
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      console.log(`📄 Processando PDF: ${fileSizeInMB.toFixed(2)}MB`);
      
      // Limitar processamento a arquivos menores que 15MB para evitar problemas de memória
      if (fileSizeInMB > 15) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'Arquivo PDF muito grande. Limite máximo: 15MB');
      }

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      // Limpar buffer da memória imediatamente após uso
      // @ts-ignore
      dataBuffer.fill(0);
      
      // Limpar e normalizar o texto extraído
      let cleanText = data.text;
      
      // Corrigir problemas comuns de extração de PDF
      cleanText = cleanText
        // Adicionar espaços entre letras maiúsculas consecutivas
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        // Adicionar espaços antes de letras maiúsculas após letras minúsculas  
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Adicionar espaços antes de números após letras
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        // Adicionar espaços após números antes de letras
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        // Normalizar múltiplas quebras de linha
        .replace(/\n\s*\n/g, '\n\n')
        // Normalizar espaços múltiplos
        .replace(/\s+/g, ' ')
        // Remover espaços no início e fim
        .trim();
      
      // Chunking simples - divide o texto em pedaços de ~500 palavras
      const chunks = this.chunkText(cleanText, 500);
      
      const result = {
        text: cleanText,
        pages: data.numpages,
        metadata: data.metadata,
        chunks: chunks
      };
      
      // Sugerir garbage collection para liberar memória
      if (global.gc) {
        global.gc();
      }
      
      console.log(`✅ PDF processado: ${data.numpages} páginas, ${chunks.length} chunks`);
      
      return result;
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      
      // Tratamento específico para erros de memória
      if (error instanceof Error && error.message.includes('heap out of memory')) {
        throw new AppError(413, 'MEMORY_ERROR', 'Arquivo muito grande para processar. Tente um arquivo menor.');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(400, errorMessages.FILE_UPLOAD_ERROR, 'Falha ao processar o arquivo PDF');
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