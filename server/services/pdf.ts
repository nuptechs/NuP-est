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
   * Monitora uso de memória
   */
  private logMemoryUsage(stage: string): void {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024 * 100) / 100;
    const rss = Math.round(used.rss / 1024 / 1024 * 100) / 100;
    
    console.log(`🧠 Memória [${stage}]: Heap usado=${heapUsedMB}MB, Heap total=${heapTotalMB}MB, RSS=${rss}MB`);
    
    // Alertar se o uso de heap estiver alto
    if (heapUsedMB > 1024) { // 1GB
      console.warn(`⚠️ Alto uso de memória detectado: ${heapUsedMB}MB`);
    }
  }

  /**
   * Processa um arquivo PDF e extrai o texto
   */
  async processPDF(filePath: string): Promise<PDFProcessingResult> {
    let dataBuffer: Buffer | null = null;
    
    try {
      this.logMemoryUsage('início');
      
      // Verificar tamanho do arquivo antes de processar
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      console.log(`📄 Processando PDF: ${fileSizeInMB.toFixed(2)}MB`);
      
      // Reduzir limite para 8MB para maior segurança de memória
      if (fileSizeInMB > 8) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'Arquivo PDF muito grande. Limite máximo: 8MB');
      }

      // Ler arquivo em buffer
      dataBuffer = fs.readFileSync(filePath);
      this.logMemoryUsage('arquivo carregado');
      
      // Processar PDF
      const data = await pdf(dataBuffer);
      this.logMemoryUsage('PDF processado');
      
      // Liberar buffer imediatamente
      dataBuffer = null;
      
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc();
      }
      
      // Processar texto em chunks menores para reduzir picos de memória
      let processedText = this.processTextInChunks(data.text);
      this.logMemoryUsage('texto processado');
      
      // Liberar referência ao texto original
      (data as any).text = null;
      
      // Chunking otimizado - divide o texto em pedaços de ~300 palavras (reduzido para economizar memória)
      const chunks = this.chunkTextOptimized(processedText, 300);
      this.logMemoryUsage('chunks criados');
      
      const result = {
        text: processedText,
        pages: data.numpages,
        metadata: data.metadata,
        chunks: chunks
      };
      
      // Limpar variáveis locais
      processedText = '';
      
      // Forçar garbage collection novamente
      if (global.gc) {
        global.gc();
      }
      
      this.logMemoryUsage('finalizado');
      console.log(`✅ PDF processado: ${result.pages} páginas, ${result.chunks.length} chunks`);
      
      return result;
    } catch (error) {
      // Limpar buffers em caso de erro
      if (dataBuffer) {
        dataBuffer = null;
      }
      
      // Forçar garbage collection em caso de erro
      if (global.gc) {
        global.gc();
      }
      
      console.error('Erro ao processar PDF:', error);
      
      // Tratamento específico para erros de memória
      if (error instanceof Error && (
        error.message.includes('heap out of memory') || 
        error.message.includes('ENOMEM') ||
        error.name === 'RangeError'
      )) {
        throw new AppError(413, 'MEMORY_ERROR', 'Arquivo muito grande para processar. Tente um arquivo menor.');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(400, errorMessages.FILE_UPLOAD_ERROR, 'Falha ao processar o arquivo PDF');
    }
  }

  /**
   * Processa texto em chunks menores para reduzir uso de memória
   */
  private processTextInChunks(text: string): string {
    // Processar o texto em pedaços de 50KB para evitar picos de memória
    const CHUNK_SIZE = 50000;
    let result = '';
    
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      let chunk = text.slice(i, i + CHUNK_SIZE);
      
      // Aplicar limpeza no chunk
      chunk = chunk
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
        .replace(/\s+/g, ' ');
      
      result += chunk;
      
      // Permitir que o garbage collector atue
      if (i % (CHUNK_SIZE * 5) === 0 && global.gc) {
        global.gc();
      }
    }
    
    return result.trim();
  }

  /**
   * Versão otimizada de chunking que usa menos memória
   */
  private chunkTextOptimized(text: string, wordsPerChunk: number = 300): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    
    // Processar em batches menores para reduzir uso de memória
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ').trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Garbage collection periodicamente
      if (chunks.length % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    return chunks;
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