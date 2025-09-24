import { fileProcessorService } from './fileProcessor.js';

export interface TitleChunk {
  id: string;
  title: string;
  level: number; // 1 = título principal, 2 = subtítulo, etc.
  content: string;
  startPosition: number;
  endPosition: number;
  parentId?: string;
}

interface DocumentSummary {
  documentName: string;
  totalChunks: number;
  structure: TitleChunk[];
  extractedAt: Date;
}

export class TitleBasedChunkingService {
  
  /**
   * Processa um documento PDF e o quebra em chunks baseados nos títulos
   */
  async processDocumentWithTitleChunking(filePath: string, fileName: string): Promise<DocumentSummary> {
    console.log(`🔍 Iniciando chunking baseado em títulos para: ${fileName}`);
    
    // 1. Extrair texto do PDF
    const extractedContent = await fileProcessorService.processFile(filePath, fileName);
    const fullText = extractedContent.text;
    
    console.log(`📄 Texto extraído: ${fullText.length} caracteres`);
    
    // 2. Identificar títulos e estrutura do documento
    const titleChunks = this.identifyTitlesAndCreateChunks(fullText);
    
    console.log(`📑 Identificados ${titleChunks.length} chunks baseados em títulos`);
    
    // 3. Criar sumário estruturado
    const summary: DocumentSummary = {
      documentName: fileName,
      totalChunks: titleChunks.length,
      structure: titleChunks,
      extractedAt: new Date()
    };
    
    return summary;
  }
  
  /**
   * Identifica títulos no texto e cria chunks flexíveis baseados na estrutura
   */
  private identifyTitlesAndCreateChunks(text: string): TitleChunk[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const chunks: TitleChunk[] = [];
    
    // Padrões para identificar títulos em editais
    const titlePatterns = [
      /^CAPÍTULO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^SEÇÃO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^TÍTULO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^ANEXO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^\d+\.\s*(.+)/,  // 1. Título, 2. Título, etc.
      /^\d+\.\d+\s*(.+)/, // 1.1 Subtítulo, 1.2 Subtítulo, etc.
      /^\d+\.\d+\.\d+\s*(.+)/, // 1.1.1 Sub-subtítulo
      /^[A-Z\s]{10,}$/, // Títulos em MAIÚSCULA (mínimo 10 chars)
      /^DO[S]?\s+[A-Z\s]+/i, // "DO CONCURSO", "DAS INSCRIÇÕES", etc.
      /^DA[S]?\s+[A-Z\s]+/i, // "DA PROVA", "DAS CONDIÇÕES", etc.
    ];
    
    let currentChunkContent = '';
    let currentTitle = 'Preâmbulo';
    let currentLevel = 1;
    let chunkIndex = 0;
    let startPosition = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isTitle = false;
      let titleText = '';
      let titleLevel = 1;
      
      // Verificar se a linha é um título
      for (const pattern of titlePatterns) {
        const match = line.match(pattern);
        if (match) {
          isTitle = true;
          titleText = match[1] || match[0];
          
          // Determinar nível do título
          if (line.startsWith('CAPÍTULO') || line.startsWith('TÍTULO')) {
            titleLevel = 1;
          } else if (line.startsWith('SEÇÃO') || line.startsWith('ANEXO')) {
            titleLevel = 2;
          } else if (line.match(/^\d+\.\d+\.\d+/)) {
            titleLevel = 4;
          } else if (line.match(/^\d+\.\d+/)) {
            titleLevel = 3;
          } else if (line.match(/^\d+\./)) {
            titleLevel = 2;
          } else {
            titleLevel = 2;
          }
          break;
        }
      }
      
      if (isTitle && titleText && currentChunkContent.trim()) {
        // Salvar chunk anterior
        const endPosition = startPosition + currentChunkContent.length;
        chunks.push({
          id: `chunk_${chunkIndex}`,
          title: this.cleanTitle(currentTitle),
          level: currentLevel,
          content: currentChunkContent.trim(),
          startPosition,
          endPosition
        });
        
        // Preparar novo chunk
        currentTitle = titleText;
        currentLevel = titleLevel;
        currentChunkContent = line + '\n';
        startPosition = endPosition;
        chunkIndex++;
      } else {
        // Adicionar linha ao chunk atual
        currentChunkContent += line + '\n';
      }
    }
    
    // Adicionar último chunk
    if (currentChunkContent.trim()) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        title: this.cleanTitle(currentTitle),
        level: currentLevel,
        content: currentChunkContent.trim(),
        startPosition,
        endPosition: startPosition + currentChunkContent.length
      });
    }
    
    // Definir relações pai-filho baseado nos níveis
    this.establishParentChildRelations(chunks);
    
    return chunks;
  }
  
  /**
   * Limpa e padroniza títulos
   */
  private cleanTitle(title: string): string {
    return title
      .trim()
      .replace(/^[^\w\s]+/, '') // Remove caracteres especiais do início
      .replace(/[^\w\s]+$/, '') // Remove caracteres especiais do final
      .replace(/\s+/g, ' ')     // Normaliza espaços
      .toLowerCase()            // Converte para minúsculo
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitaliza primeira letra de cada palavra
  }
  
  /**
   * Estabelece relações hierárquicas entre chunks baseado nos níveis
   */
  private establishParentChildRelations(chunks: TitleChunk[]): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Procurar pai (chunk anterior com nível menor)
      for (let j = i - 1; j >= 0; j--) {
        const potentialParent = chunks[j];
        if (potentialParent.level < chunk.level) {
          chunk.parentId = potentialParent.id;
          break;
        }
      }
    }
  }
  
  /**
   * Processa apenas texto (para testes) - método público
   */
  processContent(text: string): {
    titleChunks: string[];
    documentStructure: TitleChunk[];
  } {
    const chunks = this.identifyTitlesAndCreateChunks(text);
    const titleChunks = chunks.map(chunk => chunk.content);
    
    return {
      titleChunks,
      documentStructure: chunks
    };
  }
  
  /**
   * Gera uma prévia do sumário para visualização rápida
   */
  generateSummaryPreview(summary: DocumentSummary): string {
    const lines: string[] = [`📋 SUMÁRIO: ${summary.documentName}`, ''];
    
    for (const chunk of summary.structure) {
      const indent = '  '.repeat(chunk.level - 1);
      const preview = chunk.content.substring(0, 100) + (chunk.content.length > 100 ? '...' : '');
      lines.push(`${indent}• ${chunk.title}`);
      lines.push(`${indent}  ${preview.replace(/\n/g, ' ')}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Instância singleton
export const titleBasedChunkingService = new TitleBasedChunkingService();