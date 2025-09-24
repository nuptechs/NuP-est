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
   * MELHORADO: Detecção mais robusta e abrangente de títulos
   */
  private identifyTitlesAndCreateChunks(text: string): TitleChunk[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const chunks: TitleChunk[] = [];
    
    // Padrões EXPANDIDOS para identificar títulos em editais
    const titlePatterns = [
      // Padrões tradicionais estruturados
      /^CAPÍTULO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^SEÇÃO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^TÍTULO\s+[IVX\d]+[\s\-]+(.+)/i,
      /^ANEXO\s+[IVX\d]*[\s\-]*(.+)/i,
      
      // Numeração decimal (mais flexível)
      /^\d+\.\s*(.+)/,
      /^\d+\.\d+\s*(.+)/,
      /^\d+\.\d+\.\d+\s*(.+)/,
      /^\d+\.\d+\.\d+\.\d+\s*(.+)/,
      
      // Padrões comuns de editais
      /^DO[S]?\s+[A-Z\s]{3,}/i,
      /^DA[S]?\s+[A-Z\s]{3,}/i,
      /^NO[S]?\s+[A-Z\s]{3,}/i,
      /^NA[S]?\s+[A-Z\s]{3,}/i,
      /^DE[S]?\s+[A-Z\s]{3,}/i,
      
      // Padrões específicos de concurso
      /^DISPOSIÇÕES?\s+(GERAIS|FINAIS|PRELIMINARES)/i,
      /^CRONOGRAMA/i,
      /^RECURSOS?/i,
      /^IMPUGNAÇÕES?/i,
      /^INSCRIÇÕES?/i,
      /^PROVAS?/i,
      /^AVALIAÇÃO/i,
      /^RESULTADO/i,
      /^CLASSIFICAÇÃO/i,
      /^NOMEAÇÃO/i,
      /^HOMOLOGAÇÃO/i,
      
      // Títulos em maiúscula (mais flexível)
      /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s\-]{8,}$/,
      
      // Padrões com pontuação
      /^[A-Z\s]{5,}:$/,
      /^[A-Z\s]{5,}\s*-\s*/,
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
      
      // Verificar se a linha é um título (análise melhorada)
      const titleAnalysis = this.analyzeTitlePattern(line, titlePatterns);
      if (titleAnalysis.isTitle) {
        isTitle = true;
        titleText = titleAnalysis.titleText;
        titleLevel = titleAnalysis.level;
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
    
    // NOVO: Se só temos 1 chunk (problema identificado), forçar divisão semântica
    if (chunks.length <= 1) {
      console.log('🔄 Detectado apenas 1 chunk - aplicando divisão semântica forçada...');
      return this.forceSemanticChunking(text, chunks[0]);
    }
    
    // Definir relações pai-filho baseado nos níveis
    this.establishParentChildRelations(chunks);
    
    return chunks;
  }
  
  /**
   * Analisa padrões de título com lógica avançada
   * NOVO: Método mais inteligente para detectar títulos
   */
  private analyzeTitlePattern(line: string, titlePatterns: RegExp[]): {
    isTitle: boolean;
    titleText: string;
    level: number;
  } {
    const originalLine = line.trim();
    
    // Filtros básicos - não é título se...
    if (originalLine.length < 3 || 
        originalLine.length > 200 ||
        /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(originalLine) || // Datas
        /^\d+[.,]\d+/.test(originalLine) || // Números decimais
        /^[a-z]/.test(originalLine) && originalLine.length > 50) { // Texto comum longo
      return { isTitle: false, titleText: '', level: 1 };
    }
    
    // Verificar contra padrões tradicionais primeiro
    for (const pattern of titlePatterns) {
      const match = originalLine.match(pattern);
      if (match) {
        const titleText = match[1] || match[0];
        const level = this.determineTitleLevel(originalLine, titleText);
        
        // Validação adicional para títulos detectados
        if (this.validateTitleCandidate(titleText, originalLine)) {
          return {
            isTitle: true,
            titleText: this.cleanTitleText(titleText),
            level
          };
        }
      }
    }
    
    // Análise contextual para títulos não capturados pelos padrões
    const contextualAnalysis = this.analyzeContextualTitle(originalLine);
    if (contextualAnalysis.isTitle) {
      return contextualAnalysis;
    }
    
    return { isTitle: false, titleText: '', level: 1 };
  }
  
  /**
   * Determina o nível hierárquico do título
   */
  private determineTitleLevel(line: string, titleText: string): number {
    // Nível 1: Títulos principais
    if (line.match(/^(CAPÍTULO|TÍTULO|PARTE)\s+[IVX\d]+/i)) return 1;
    
    // Nível 2: Seções e anexos
    if (line.match(/^(SEÇÃO|ANEXO|APÊNDICE)\s+[IVX\d]*/i)) return 2;
    
    // Baseado em numeração decimal
    if (line.match(/^\d+\.\d+\.\d+\.\d+/)) return 5;
    if (line.match(/^\d+\.\d+\.\d+/)) return 4;
    if (line.match(/^\d+\.\d+/)) return 3;
    if (line.match(/^\d+\./)) return 2;
    
    // Análise por padrões específicos
    if (line.match(/^(DISPOSIÇÕES|CRONOGRAMA|RECURSOS|IMPUGNAÇÕES)/i)) return 2;
    if (line.match(/^(DAS?|DOS?|NAS?|NOS?)\s+[A-Z\s]{3,}/i)) return 2;
    
    // Títulos em maiúscula - nível baseado no tamanho
    if (line === line.toUpperCase() && line.length > 10) {
      return line.length > 50 ? 3 : 2;
    }
    
    return 2; // Nível padrão
  }
  
  /**
   * Valida se um candidato a título é realmente um título
   */
  private validateTitleCandidate(titleText: string, originalLine: string): boolean {
    const cleanTitle = titleText.trim();
    
    // Muito curto ou muito longo
    if (cleanTitle.length < 2 || cleanTitle.length > 150) return false;
    
    // Contém muitos números (provavelmente dados)
    const numberCount = (cleanTitle.match(/\d/g) || []).length;
    if (numberCount > cleanTitle.length * 0.3) return false;
    
    // Contém caracteres especiais demais
    const specialCount = (cleanTitle.match(/[^\w\s\-\(\)\[\]]/g) || []).length;
    if (specialCount > cleanTitle.length * 0.2) return false;
    
    // Parece uma frase completa (tem artigos, preposições, etc.)
    const articles = ['a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas'];
    const prepositions = ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'por', 'para'];
    const words = cleanTitle.toLowerCase().split(/\s+/);
    const commonWordsCount = words.filter(word => [...articles, ...prepositions].includes(word)).length;
    
    // Se tem muitas palavras comuns, pode ser texto comum, não título
    if (words.length > 8 && commonWordsCount > words.length * 0.4) return false;
    
    return true;
  }
  
  /**
   * Análise contextual para títulos que podem não seguir padrões tradicionais
   */
  private analyzeContextualTitle(line: string): {
    isTitle: boolean;
    titleText: string;
    level: number;
  } {
    const trimmed = line.trim();
    
    // Palavras-chave que indicam início de seção importante
    const sectionKeywords = [
      'EDITAL', 'CONCURSO', 'SELEÇÃO', 'PROCESSO SELETIVO',
      'REQUISITOS', 'ATRIBUIÇÕES', 'REMUNERAÇÃO', 'SALÁRIO',
      'INSCRIÇÃO', 'TAXA', 'DOCUMENTAÇÃO', 'CRONOGRAMA',
      'PROVA', 'EXAME', 'AVALIAÇÃO', 'TESTE',
      'RESULTADO', 'CLASSIFICAÇÃO', 'CONVOCAÇÃO',
      'POSSE', 'EXERCÍCIO', 'LOTAÇÃO',
      'IMPUGNAÇÃO', 'RECURSO', 'QUESTIONAMENTO'
    ];
    
    // Verificar se contém palavras-chave importantes
    const hasKeyword = sectionKeywords.some(keyword => 
      trimmed.toUpperCase().includes(keyword)
    );
    
    if (hasKeyword && 
        trimmed.length >= 5 && 
        trimmed.length <= 100 &&
        !trimmed.match(/^\d+[.,]\d+/) && // Não é número
        !trimmed.match(/\d{2}\/\d{2}\/\d{4}/)) { // Não é data
      
      return {
        isTitle: true,
        titleText: this.cleanTitleText(trimmed),
        level: 2
      };
    }
    
    // Títulos que começam com letras maiúsculas seguidas de dois pontos
    if (trimmed.match(/^[A-Z][A-Z\s\-]{5,}:$/) && trimmed.length <= 80) {
      return {
        isTitle: true,
        titleText: this.cleanTitleText(trimmed.replace(':', '')),
        level: 3
      };
    }
    
    return { isTitle: false, titleText: '', level: 1 };
  }
  
  /**
   * Limpa texto do título removendo elementos desnecessários
   */
  private cleanTitleText(text: string): string {
    return text
      .trim()
      .replace(/^[-–—]+/, '') // Remove hífens do início
      .replace(/[-–—]+$/, '') // Remove hífens do final
      .replace(/^\d+\.?\s*/, '') // Remove numeração do início
      .replace(/^(CAPÍTULO|SEÇÃO|TÍTULO|ANEXO)\s+[IVX\d]*\s*-?\s*/i, '') // Remove prefixos estruturais
      .trim();
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
   * NOVO: Força divisão semântica quando a detecção de títulos falha
   * Divide o documento em seções lógicas baseadas em padrões de conteúdo
   */
  private forceSemanticChunking(fullText: string, originalChunk?: TitleChunk): TitleChunk[] {
    console.log('🧠 Iniciando divisão semântica forçada...');
    
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);
    const chunks: TitleChunk[] = [];
    const minChunkSize = 800; // Mínimo de caracteres por chunk
    const maxChunkSize = 3000; // Máximo de caracteres por chunk
    
    // Identificar pontos de quebra semântica
    const breakPoints: number[] = [0]; // Sempre começar do início
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Critérios mais agressivos para quebra semântica
      const semanticBreakRules = [
        // Mudança drástica de contexto (linhas totalmente maiúsculas)
        line.length > 15 && line.length < 150 && line.toUpperCase() === line && /^[A-Z\s\-\(\)]{15,}/.test(line),
        
        // Início de nova seção numérica
        /^\d+[\.\-]\s*[A-ZÁÊÍÓÔÂ]/.test(line) && line.length > 10,
        
        // Palavras-chave que SEMPRE indicam nova seção
        /^(EDITAL|CONCURSO|ABERTURA|INSCRIÇÃO|INSCRIÇAO|PROVA|RESULTADO|CRONOGRAMA|DISPOSIÇÃO|ANEXO|CARGO|VAGA|REQUISITO|ATRIBUIÇ)/i.test(line),
        
        // Padrões específicos de edital 
        /^(DO[S]?|DA[S]?|NO[S]?|NA[S]?)\s+[A-ZÁÊÍÓÔÂ]/i.test(line) && line.length > 10,
        
        // Padrões de legislação/referências
        /^(LEI|DECRETO|PORTARIA|RESOLUÇÃO|INSTRUÇÃO)/i.test(line),
        
        // Quebras com contexto (linha anterior vazia + linha importante)
        i > 0 && lines[i-1].trim() === '' && line.length > 20 && /^[A-ZÁÊÍÓÔÂ]/.test(line)
      ];
      
      const shouldBreak = semanticBreakRules.some(rule => rule);
      
      // Forçar quebra se o chunk atual está ficando muito grande
      const currentChunkSize = lines.slice(breakPoints[breakPoints.length - 1], i).join('\n').length;
      const forceBreakBySize = currentChunkSize > maxChunkSize && line.length > 20;
      
      if ((shouldBreak || forceBreakBySize) && currentChunkSize > minChunkSize) {
        breakPoints.push(i);
      }
    }
    
    // Adicionar ponto final
    breakPoints.push(lines.length);
    
    console.log(`📊 Pontos de quebra semântica identificados: ${breakPoints.length - 1} seções`);
    
    // Criar chunks baseados nos pontos de quebra
    let chunkIndex = 0;
    let startPosition = 0;
    
    for (let i = 0; i < breakPoints.length - 1; i++) {
      const startLine = breakPoints[i];
      const endLine = breakPoints[i + 1];
      const chunkLines = lines.slice(startLine, endLine);
      const content = chunkLines.join('\n');
      
      // Pular chunks muito pequenos, exceto se é o último
      if (content.trim().length < minChunkSize && i < breakPoints.length - 2) {
        continue;
      }
      
      // Inferir título da seção baseado no conteúdo
      const inferredTitle = this.inferSectionTitle(chunkLines, chunkIndex);
      
      chunks.push({
        id: `semantic_chunk_${chunkIndex}`,
        title: inferredTitle,
        level: chunkIndex === 0 ? 1 : 2, // Primeiro chunk nível 1, outros nível 2
        content: content.trim(),
        startPosition,
        endPosition: startPosition + content.length
      });
      
      startPosition += content.length;
      chunkIndex++;
    }
    
    // Garantir que temos pelo menos 3 seções para um edital completo
    if (chunks.length < 3) {
      console.log('🔄 Poucas seções detectadas - aplicando divisão por tamanho...');
      return this.forceChunkingBySize(fullText, 4);
    }
    
    console.log(`✅ Divisão semântica concluída: ${chunks.length} seções criadas`);
    return chunks;
  }
  
  /**
   * Infere título de seção baseado no conteúdo
   */
  private inferSectionTitle(lines: string[], sectionIndex: number): string {
    // Procurar por linha que pode ser título nas primeiras 10 linhas
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      
      // Linha que parece título
      if (line.length > 10 && line.length < 120) {
        // Contém palavras-chave importantes de edital
        const keywords = ['EDITAL', 'CONCURSO', 'INSCRIÇÃO', 'INSCRIÇAO', 'PROVA', 'RESULTADO', 'CRONOGRAMA', 
                         'DISPOSIÇÃO', 'DISPOSIÇÕES', 'ANEXO', 'REQUISITOS', 'ATRIBUIÇÕES', 'REMUNERAÇÃO',
                         'CARGO', 'VAGA', 'SALÁRIO', 'BENEFÍCIO'];
        
        const hasKeyword = keywords.some(keyword => line.toUpperCase().includes(keyword));
        if (hasKeyword) {
          return this.cleanTitleText(line);
        }
        
        // Linha em maiúscula que não é muito longa (possivelmente título)
        if (line.toUpperCase() === line && line.length > 15 && line.length < 80) {
          return this.cleanTitleText(line);
        }
        
        // Padrões "DO/DA/DOS/DAS"
        if (/^(DO[S]?|DA[S]?|NO[S]?|NA[S]?)\s+[A-Z\s]{3,}/i.test(line)) {
          return this.cleanTitleText(line);
        }
      }
    }
    
    // Fallback: título genérico baseado na posição
    const defaultTitles = [
      'Preâmbulo',
      'Informações do Concurso', 
      'Das Inscrições',
      'Das Provas e Avaliação',
      'Do Resultado e Classificação',
      'Das Disposições Gerais',
      'Anexos e Complementos'
    ];
    
    return defaultTitles[sectionIndex] || `Seção ${sectionIndex + 1}`;
  }
  
  /**
   * Divisão forçada por tamanho como último recurso
   */
  private forceChunkingBySize(fullText: string, targetChunks: number): TitleChunk[] {
    console.log(`🔢 Aplicando divisão forçada em ${targetChunks} seções por tamanho...`);
    
    const chunks: TitleChunk[] = [];
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);
    
    let currentPos = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < targetChunks; i++) {
      const startPos = Math.floor(i * (lines.length / targetChunks));
      const endPos = i === targetChunks - 1 ? lines.length : Math.floor((i + 1) * (lines.length / targetChunks));
      
      const chunkLines = lines.slice(startPos, endPos);
      const content = chunkLines.join('\n');
      
      if (content.trim().length === 0) continue;
      
      const title = this.inferSectionTitle(chunkLines, chunkIndex);
      
      chunks.push({
        id: `size_chunk_${chunkIndex}`,
        title,
        level: chunkIndex === 0 ? 1 : 2,
        content: content.trim(),
        startPosition: currentPos,
        endPosition: currentPos + content.length
      });
      
      currentPos += content.length;
      chunkIndex++;
    }
    
    console.log(`✅ Divisão por tamanho concluída: ${chunks.length} seções`);
    return chunks;
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