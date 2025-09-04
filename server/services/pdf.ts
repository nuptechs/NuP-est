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
   * Processa um arquivo PDF usando streaming para economia de memória
   */
  async processPDF(filePath: string): Promise<PDFProcessingResult> {
    try {
      this.logMemoryUsage('início');
      
      // Verificar tamanho do arquivo antes de processar
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      console.log(`📄 Processando PDF: ${fileSizeInMB.toFixed(2)}MB`);
      
      // Reduzir limite para 2MB para maior segurança de memória
      if (fileSizeInMB > 2) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'Arquivo PDF muito grande. Limite máximo: 2MB');
      }

      // Processar PDF em stream com chunks pequenos
      const result = await this.processPDFInChunks(filePath);
      this.logMemoryUsage('PDF processado');
      
      // Forçar garbage collection
      if (global.gc) {
        global.gc();
      }
      
      return result;
      
    } catch (error) {
      // Forçar limpeza de memória em caso de erro
      if (global.gc) {
        global.gc();
      }
      throw error;
    }
  }

  /**
   * Processa PDF em chunks pequenos para evitar estouro de memória
   */
  private async processPDFInChunks(filePath: string): Promise<PDFProcessingResult> {
    // Ler arquivo em buffer pequeno controlado
    const buffer = fs.readFileSync(filePath);
    this.logMemoryUsage('arquivo carregado');
    
    let allText = '';
    let pageCount = 0;
    const textChunks: string[] = [];
    
    try {
      // Usar pdf-parse mas com configurações de memória conservativas
      const options = {
        // Processar página por página se possível
        max: 10, // Máximo 10 páginas por vez
        version: 'v1.10.88'
      };
      
      const data = await pdf(buffer, options);
      pageCount = data.numpages;
      
      // Processar texto em stream usando chunks pequenos
      allText = await this.processTextInStream(data.text);
      
      this.logMemoryUsage('texto processado');
      
      // Liberar referência ao texto original
      (data as any).text = null;
      
      // Chunking otimizado - divide o texto em pedaços pequenos
      const chunks = this.chunkTextOptimized(allText, 300);
      textChunks.push(...chunks);
      this.logMemoryUsage('chunks criados');
      
      const result = {
        text: allText,
        pages: pageCount,
        metadata: data.metadata,
        chunks: textChunks
      };
      
      // Limpar variáveis locais
      allText = '';
      
      // Forçar garbage collection novamente
      if (global.gc) {
        global.gc();
      }
      
      this.logMemoryUsage('finalizado');
      console.log(`✅ PDF processado: ${result.pages} páginas, ${result.chunks.length} chunks`);
      
      return result;
    } catch (error) {
      // Forçar limpeza de memória em caso de erro
      if (global.gc) {
        global.gc();
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
   * Processa texto usando streaming para minimizar uso de memória
   */
  private async processTextInStream(text: string): Promise<string> {
    if (!text || text.length === 0) return '';
    
    // Se o texto for pequeno, retornar diretamente
    if (text.length <= 5000) return text;
    
    console.log(`🔄 Processando texto em stream (${text.length} chars)`);
    
    return new Promise((resolve, reject) => {
      let processedText = '';
      let buffer = '';
      const chunkSize = 2000; // 2KB por chunk - mais conservativo
      
      try {
        // Simular stream processando em pequenos chunks
        for (let i = 0; i < text.length; i += chunkSize) {
          buffer = text.substring(i, i + chunkSize);
          
          // Processar chunk com limpeza básica
          const cleanChunk = buffer
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-.,;:()]/g, '')
            .trim();
          
          processedText += cleanChunk + ' ';
          
          // Limpar buffer
          buffer = '';
          
          // Garbage collection a cada 4 chunks
          if (i % (chunkSize * 4) === 0) {
            if (global.gc) {
              global.gc();
            }
            // Pequena pausa para permitir GC
            setImmediate(() => {});
          }
        }
        
        resolve(processedText.trim());
      } catch (error) {
        reject(error);
      }
    });
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