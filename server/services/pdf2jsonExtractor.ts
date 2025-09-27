import fs from 'fs';
import { createRequire } from 'module';
import type { EventEmitter } from 'events';

const require = createRequire(import.meta.url);
const PDFParser = require('pdf2json');

export interface LayoutElement {
  id: string;
  type: 'title' | 'subtitle' | 'text' | 'table' | 'list' | 'header' | 'footer';
  level: number; // 1 = título principal, 2 = subtítulo, etc.
  text: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontInfo: {
    name: string;
    size: number;
    bold: boolean;
    italic: boolean;
  };
  parentId?: string;
}

export interface DocumentStructure {
  documentName: string;
  totalPages: number;
  elements: LayoutElement[];
  extractedAt: Date;
  metadata: {
    totalTitles: number;
    titleHierarchy: { [level: number]: number };
  };
}

export class PDF2JsonExtractor {
  
  /**
   * Extrai estrutura hierárquica do PDF preservando layout
   */
  async extractDocumentStructure(filePath: string, fileName: string): Promise<DocumentStructure> {
    console.log(`🔍 [PDF2JsonExtractor] Iniciando extração estruturada de: ${fileName}`);
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      const elements: LayoutElement[] = [];
      let elementId = 0;
      
      // Configurar parser
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          console.log(`📄 PDF processado: ${pdfData.Pages?.length || 0} páginas`);
          
          if (!pdfData.Pages || pdfData.Pages.length === 0) {
            throw new Error('PDF não contém páginas válidas');
          }
          
          // Processar cada página com normalização de linhas
          pdfData.Pages.forEach((page: any, pageIndex: number) => {
            if (page.Texts) {
              // CAPTURAR altura real da página
              const pageHeight = page.Height || 20; // Usar altura real da página ou fallback
              console.log(`📄 [PAGE ${pageIndex + 1}] Altura da página: ${pageHeight}`);
              
              // PASSO 1: Extrair todos os fragmentos de texto da página
              const textFragments: Array<{
                text: string;
                fontInfo: any;
                position: any;
              }> = [];
              
              page.Texts.forEach((textObj: any) => {
                const decodedText = this.decodeText(textObj);
                if (!decodedText || decodedText.trim().length < 1) return;
                
                textFragments.push({
                  text: decodedText,
                  fontInfo: this.extractFontInfo(textObj),
                  position: {
                    page: pageIndex + 1,
                    x: textObj.x || 0,
                    y: textObj.y || 0,
                    width: textObj.w || 0,
                    height: textObj.h || 0
                  }
                });
              });
              
              // PASSO 2: Agrupar fragmentos por linha (mesmo Y, X próximos)
              console.log(`🔍 [NORM-DEBUG] Página ${pageIndex + 1}: ${textFragments.length} fragmentos extraídos`);
              const normalizedLines = this.normalizeTextByLines(textFragments);
              console.log(`🔍 [NORM-DEBUG] Página ${pageIndex + 1}: ${normalizedLines.length} linhas normalizadas`);
              
              // PASSO 2.5: Calcular altura efetiva dos fragmentos de texto
              const maxY = Math.max(...textFragments.map(f => f.position.y), 1);
              const effectiveTextHeight = maxY; // Altura real dos fragmentos de texto
              console.log(`📄 [PAGE ${pageIndex + 1}] Altura efetiva do texto: ${effectiveTextHeight} (vs página: ${pageHeight})`);
              
              // PASSO 2.6: Calcular estatísticas de fonte para análise relativa
              const fontStats = this.calculateFontStatistics(textFragments);
              console.log(`📊 [PAGE ${pageIndex + 1}] Font stats: avg=${fontStats.averageSize.toFixed(1)}, max=${fontStats.maxSize}, min=${fontStats.minSize}`);
              
              // PASSO 3: Processar linhas normalizadas
              normalizedLines.forEach((line: { text: string; fontInfo: any; position: any }) => {
                if (!line.text || line.text.trim().length < 2) {
                  console.log(`⚠️ [LINHA-SKIP] Linha muito curta: "${line.text}"`);
                  return;
                }
                
                // Classificar elemento com altura efetiva do texto e estatísticas de fonte
                const classification = this.classifyElement(line.text, line.fontInfo, line.position, effectiveTextHeight, fontStats);
                
                console.log(`📝 [ELEMENTO] "${line.text.substring(0, 40)}..." → ${classification.type} (level ${classification.level})`);
                
                elements.push({
                  id: `element_${elementId++}`,
                  type: classification.type,
                  level: classification.level,
                  text: line.text,
                  position: line.position,
                  fontInfo: line.fontInfo
                });
              });
            }
          });
          
          // DEBUG: Contar elementos antes da filtragem
          console.log(`🔍 [EXTRAÇÃO-DEBUG] Total de elementos antes da filtragem: ${elements.length}`);
          if (elements.length > 0) {
            console.log(`🔍 [EXTRAÇÃO-DEBUG] Primeira amostra: "${elements[0].text.substring(0, 50)}..." (tipo: ${elements[0].type})`);
          }
          
          // Pós-processar elementos para estabelecer hierarquia
          this.establishHierarchy(elements);
          
          // Filtrar elementos irrelevantes (headers, footers, etc.)
          const filteredElements = this.filterRelevantElements(elements);
          
          console.log(`✅ Extraídos ${filteredElements.length} elementos estruturados (de ${elements.length} originais)`);
          
          const result: DocumentStructure = {
            documentName: fileName,
            totalPages: pdfData.Pages.length,
            elements: filteredElements,
            extractedAt: new Date(),
            metadata: this.generateMetadata(filteredElements)
          };
          
          resolve(result);
          
        } catch (error) {
          console.error('❌ Erro ao processar dados do PDF:', error);
          reject(error);
        }
      });
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error('❌ Erro no parser PDF:', errData);
        reject(new Error(`Erro ao fazer parse do PDF: ${errData.parserError || errData}`));
      });
      
      // Carregar e processar arquivo
      try {
        pdfParser.loadPDF(filePath);
      } catch (error) {
        console.error('❌ Erro ao carregar PDF:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Decodifica texto do formato pdf2json
   */
  private decodeText(textObj: any): string {
    if (!textObj.R || !Array.isArray(textObj.R)) return '';
    
    return textObj.R
      .map((run: any) => {
        if (run.T) {
          // Decodificar texto URI-encoded
          return decodeURIComponent(run.T);
        }
        return '';
      })
      .join('')
      .trim();
  }
  
  /**
   * Extrai informações de formatação do texto
   */
  private extractFontInfo(textObj: any): { name: string; size: number; bold: boolean; italic: boolean } {
    const fontInfo = {
      name: 'default',
      size: 12,
      bold: false,
      italic: false
    };
    
    if (textObj.R && textObj.R.length > 0) {
      const firstRun = textObj.R[0];
      
      // Extrair tamanho da fonte
      if (firstRun.TS && Array.isArray(firstRun.TS)) {
        // TS[1] geralmente contém o tamanho da fonte
        fontInfo.size = firstRun.TS[1] || 12;
      }
      
      // Detectar negrito/itálico através do nome da fonte ou flags
      if (firstRun.TS && firstRun.TS[2]) {
        const fontFlags = firstRun.TS[2];
        fontInfo.bold = (fontFlags & 1) !== 0; // Bit 0 = bold
        fontInfo.italic = (fontFlags & 2) !== 0; // Bit 1 = italic
      }
    }
    
    return fontInfo;
  }
  
  /**
   * Classifica elemento baseado em formatação e conteúdo com análise relativa de fonte
   */
  private classifyElement(
    text: string, 
    fontInfo: { name: string; size: number; bold: boolean; italic: boolean },
    position: { page: number; x: number; y: number; width: number; height: number },
    pageHeight?: number,
    fontStats?: { averageSize: number; maxSize: number; minSize: number }
  ): { type: LayoutElement['type']; level: number } {
    
    const cleanText = text.trim();
    
    // Filtrar texto muito curto ou irrelevante
    if (cleanText.length < 2) {
      return { type: 'text', level: 4 };
    }
    
    // CORREÇÃO FINAL: Usar altura real da página para thresholds
    const effectivePageHeight = pageHeight || 20; // Usar altura real ou fallback
    const headerThreshold = effectivePageHeight * 0.05; // 5% superior
    const footerThreshold = effectivePageHeight * 0.95; // 5% inferior
    
    // Filtrar headers e footers com thresholds baseados na altura real
    if (position.y < headerThreshold) {
      return { type: 'header', level: 0 };
    }
    if (position.y > footerThreshold) {
      return { type: 'header', level: 0 }; // Manter consistência de tipo
    }
    
    // Análise baseada em características de fonte e conteúdo
    const fontSize = fontInfo.size || 12;
    const isBold = fontInfo.bold;
    const textLength = cleanText.length;
    
    // Calcular score de "título" baseado em múltiplos fatores
    const titleScore = this.calculateTitleScore(cleanText, fontSize, isBold, textLength, fontStats);
    
    // DEBUG: Log elementos interessantes
    if (titleScore > 0.3 || cleanText.length < 50) {
      console.log(`🔍 [SCORE-DEBUG] "${cleanText.substring(0, 40)}..." | Score: ${titleScore.toFixed(2)} | Font: ${fontSize} | Bold: ${isBold} | Len: ${textLength}`);
    }
    
    // Classificação baseada no score (thresholds mais permissivos)
    if (titleScore >= 0.7) {
      if (this.isMajorTitle(cleanText)) {
        console.log(`✅ [TITLE-L1] "${cleanText.substring(0, 30)}..." (score: ${titleScore.toFixed(2)})`);
        return { type: 'title', level: 1 };
      }
      console.log(`✅ [SUBTITLE-L2] "${cleanText.substring(0, 30)}..." (score: ${titleScore.toFixed(2)})`);
      return { type: 'subtitle', level: 2 };
    }
    
    if (titleScore >= 0.45) {
      const level = this.determineTitleLevel(cleanText);
      const finalType = level === 1 ? 'title' : 'subtitle';
      console.log(`✅ [${finalType.toUpperCase()}-L${level}] "${cleanText.substring(0, 30)}..." (score: ${titleScore.toFixed(2)})`);
      return { 
        type: finalType, 
        level: level
      };
    }
    
    // Detectar listas com baixo score de título
    if (titleScore < 0.4 && this.isListItem(cleanText)) {
      return { type: 'list', level: 3 };
    }
    
    // Texto comum
    return { type: 'text', level: 4 };
  }
  
  /**
   * Calcula score de probabilidade de ser um título (0-1)
   */
  private calculateTitleScore(
    text: string, 
    fontSize: number, 
    isBold: boolean, 
    textLength: number,
    fontStats?: { averageSize: number; maxSize: number; minSize: number }
  ): number {
    let score = 0;
    
    // 1. Análise de tamanho de fonte (peso: 0.3)
    if (fontStats) {
      const sizeRatio = fontSize / fontStats.averageSize;
      if (sizeRatio >= 1.5) score += 0.3;
      else if (sizeRatio >= 1.2) score += 0.2;
      else if (sizeRatio >= 1.1) score += 0.1;
    } else {
      // Fallback sem estatísticas
      if (fontSize >= 16) score += 0.3;
      else if (fontSize >= 14) score += 0.2;
      else if (fontSize >= 13) score += 0.1;
    }
    
    // 2. Análise de formatação (peso: 0.2)
    if (isBold) score += 0.2;
    
    // 3. Análise de comprimento (peso: 0.25) - mais permissivo
    if (textLength <= 120) {
      if (textLength <= 40) score += 0.25;
      else if (textLength <= 80) score += 0.15;
      else score += 0.05;
    } else if (textLength <= 200) {
      // Penalização leve para textos longos
      score -= 0.05;
    } else {
      // Penalização mais forte apenas para textos muito longos (provavelmente parágrafos)
      score -= 0.15;
    }
    
    // 4. Análise de padrões estruturais (peso: 0.25)
    score += this.analyzeStructuralPatterns(text);
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Analisa padrões estruturais que indicam títulos verdadeiros
   */
  private analyzeStructuralPatterns(text: string): number {
    const cleanText = text.trim().toUpperCase();
    let score = 0;
    
    // Padrões altamente indicativos de títulos (pontuação máxima: 0.25)
    const strongTitlePatterns = [
      /^(EDITAL|CONCURSO|PROCESSO\s+SELETIVO|SELEÇÃO\s+PÚBLICA)/,
      /^(CAPÍTULO|TÍTULO|SEÇÃO|ANEXO|APÊNDICE)\s+[IVX\d]/,
      /^(DISPOSIÇÕES|CRONOGRAMA|RECURSOS|IMPUGNAÇÃO)/,
      /^(INSCRIÇÃO|PROVAS|AVALIAÇÃO|RESULTADO|CLASSIFICAÇÃO)/
    ];
    
    if (strongTitlePatterns.some(pattern => pattern.test(cleanText))) {
      score += 0.25;
    }
    
    // Padrões de numeração hierárquica simples (somente se não for parágrafo longo)
    else if (text.length <= 60) {
      if (/^\d+\s*[-–]\s*[A-ZÁÊÍÓÔÂ]/.test(text)) score += 0.2; // "1 - INTRODUÇÃO"
      else if (/^\d+\.\s*[A-ZÁÊÍÓÔÂ][A-ZÁÊÍÓÔÂ\s]{2,15}$/.test(text)) score += 0.15; // "1. OBJETIVO"
      else if (/^[A-ZÁÊÍÓÔÂ][A-ZÁÊÍÓÔÂ\s\-]{8,40}$/.test(cleanText)) score += 0.15; // Texto em maiúsculas curto
    }
    
    // Penalizar padrões que indicam parágrafos (texto comum)
    const paragraphPatterns = [
      /candidato.*dever[áa]/i,
      /será.*considerado/i,
      /de acordo com/i,
      /conforme.*estabelecido/i,
      /nos termos/i
    ];
    
    if (paragraphPatterns.some(pattern => pattern.test(text))) {
      score -= 0.3;
    }
    
    // Penalizar texto que parece ser meio de frase (sem início maiúsculo adequado)
    if (text.length > 40 && !/^[A-ZÁÊÍÓÔÂ\d]/.test(text)) {
      score -= 0.15;
    }
    
    return score;
  }
  
  /**
   * Calcula estatísticas de fonte dos fragmentos para análise relativa
   */
  private calculateFontStatistics(fragments: Array<{
    text: string;
    fontInfo: any;
    position: any;
  }>): { averageSize: number; maxSize: number; minSize: number } {
    const fontSizes = fragments
      .map(fragment => fragment.fontInfo?.size || 12)
      .filter(size => size > 0);
    
    if (fontSizes.length === 0) {
      return { averageSize: 12, maxSize: 12, minSize: 12 };
    }
    
    const averageSize = fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
    const maxSize = Math.max(...fontSizes);
    const minSize = Math.min(...fontSizes);
    
    return { averageSize, maxSize, minSize };
  }
  
  /**
   * Detecta títulos principais por conteúdo
   */
  private isMajorTitle(text: string): boolean {
    const majorTitlePatterns = [
      /^EDITAL\s+N[º°]?\s*\d+/i,
      /^CONCURSO\s+P[UÚ]BLICO/i,
      /^PROCESSO\s+SELETIVO/i,
      /^SELE[ÇC][ÃA]O\s+P[UÚ]BLICA/i
    ];
    
    return majorTitlePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detecta subtítulos por conteúdo
   */
  private isSubTitle(text: string): boolean {
    const subTitlePatterns = [
      /^CAPÍTULO\s+[IVX\d]+/i,
      /^SE[ÇC][ÃA]O\s+[IVX\d]+/i,
      /^T[ÍI]TULO\s+[IVX\d]+/i,
      /^ANEXO\s+[IVX\d]*/i,
      /^(DAS?|DOS?|NAS?|NOS?)\s+[A-Z\s]{5,}/i
    ];
    
    return subTitlePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detecta títulos por padrões gerais
   */
  private isTitleByPattern(text: string): boolean {
    // Padrões expandidos para detectar títulos de edital
    const titlePatterns = [
      /^\d+\.\s*[A-ZÁÊÍÓÔÂ]/,                    // Numeração decimal
      /^[A-ZÁÊÍÓÔÂ][A-ZÁÊÍÓÔÂ\s\-]{10,}$/,     // Texto em maiúsculas
      /^(DISPOSI[ÇC][ÕO]ES|CRONOGRAMA|RECURSOS?|IMPUGNA[ÇC][ÕO]ES)/i,
      /^(INSCRI[ÇC][ÕO]ES?|PROVAS?|AVALIA[ÇC][ÃA]O|RESULTADO)/i,
      /^(CLASSIFICA[ÇC][ÃA]O|NOMEA[ÇC][ÃA]O|HOMOLOGA[ÇC][ÃA]O)/i,
    ];
    
    return titlePatterns.some(pattern => pattern.test(text.trim()));
  }
  
  /**
   * Determina nível hierárquico do título
   */
  private determineTitleLevel(text: string): number {
    const trimmed = text.trim();
    
    // Nível 1: Títulos principais
    if (/^(EDITAL|CONCURSO|PROCESSO\s+SELETIVO)/i.test(trimmed)) return 1;
    if (/^(CAPÍTULO|TÍTULO|PARTE)\s+[IVX\d]+/i.test(trimmed)) return 1;
    
    // Nível 2: Seções e anexos
    if (/^(SEÇÃO|ANEXO|APÊNDICE)/i.test(trimmed)) return 2;
    
    // Baseado em numeração decimal
    if (/^\d+\.\d+\.\d+\.\d+/.test(trimmed)) return 5;
    if (/^\d+\.\d+\.\d+/.test(trimmed)) return 4;
    if (/^\d+\.\d+/.test(trimmed)) return 3;
    if (/^\d+\./.test(trimmed)) return 2;
    
    // Padrões específicos
    if (/^(DAS?|DOS?|NAS?|NOS?)\s+[A-Z\s]{5,}/i.test(trimmed)) return 2;
    
    return 2; // Nível padrão
  }
  
  /**
   * Detecta itens de lista
   */
  private isListItem(text: string): boolean {
    return /^[a-z]\)\s+/i.test(text) || 
           /^[IVX\d]+\.\s+/i.test(text) ||
           /^[-•·]\s+/.test(text);
  }
  
  /**
   * Estabelece relações hierárquicas entre elementos
   */
  private establishHierarchy(elements: LayoutElement[]): void {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Procurar pai (elemento anterior com nível menor)
      for (let j = i - 1; j >= 0; j--) {
        const potentialParent = elements[j];
        if (potentialParent.level < element.level && 
            ['title', 'subtitle'].includes(potentialParent.type)) {
          element.parentId = potentialParent.id;
          break;
        }
      }
    }
  }
  
  /**
   * Filtra elementos relevantes removendo apenas ruído real
   */
  private filterRelevantElements(elements: LayoutElement[]): LayoutElement[] {
    console.log(`🔍 [FILTRO-DEBUG] Analisando ${elements.length} elementos para filtragem`);
    
    const filtered = elements.filter(element => {
      // DEBUG: Log elementos sendo analisados
      const preview = element.text.substring(0, 50);
      console.log(`🔍 [FILTRO] "${preview}..." tipo=${element.type} len=${element.text.length}`);
      
      // MANTER headers importantes (podem ser títulos de documentos)
      if (element.type === 'header' && element.text.length > 10) {
        console.log(`✅ [FILTRO] Mantendo header importante: "${preview}..."`);
        return true;
      }
      
      // Remover footers apenas
      if (element.type === 'footer') {
        console.log(`❌ [FILTRO] Removendo footer: "${preview}..."`);
        return false;
      }
      
      // Remover textos muito curtos (provavelmente ruído)
      if (element.text.length < 3) {
        console.log(`❌ [FILTRO] Removendo texto curto: "${preview}..."`);
        return false;
      }
      
      // Remover números de página isolados
      if (/^\d+$/.test(element.text.trim())) {
        console.log(`❌ [FILTRO] Removendo número de página: "${preview}..."`);
        return false;
      }
      
      // Remover datas isoladas
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(element.text.trim())) {
        console.log(`❌ [FILTRO] Removendo data isolada: "${preview}..."`);
        return false;
      }
      
      console.log(`✅ [FILTRO] Mantendo elemento: "${preview}..."`);
      return true;
    });
    
    console.log(`🔍 [FILTRO-DEBUG] Resultado: ${filtered.length} de ${elements.length} elementos mantidos`);
    return filtered;
  }
  
  /**
   * Gera metadata sobre a estrutura extraída
   */
  private generateMetadata(elements: LayoutElement[]) {
    const titleHierarchy: { [level: number]: number } = {};
    let totalTitles = 0;
    
    elements.forEach(element => {
      if (element.type === 'title' || element.type === 'subtitle') {
        totalTitles++;
        titleHierarchy[element.level] = (titleHierarchy[element.level] || 0) + 1;
      }
    });
    
    return {
      totalTitles,
      titleHierarchy
    };
  }
  
  /**
   * Normaliza fragmentos de texto agrupando por linhas (mesmo Y aproximado)
   */
  private normalizeTextByLines(fragments: Array<{
    text: string;
    fontInfo: any;
    position: any;
  }>): Array<{
    text: string;
    fontInfo: any;
    position: any;
  }> {
    if (fragments.length === 0) return [];
    
    // Ordenar fragmentos por página e Y
    fragments.sort((a, b) => {
      if (a.position.page !== b.position.page) {
        return a.position.page - b.position.page;
      }
      return a.position.y - b.position.y;
    });
    
    const normalizedLines: Array<{
      text: string;
      fontInfo: any;
      position: any;
    }> = [];
    
    let currentLine: Array<typeof fragments[0]> = [];
    let currentY = fragments[0].position.y;
    let currentPage = fragments[0].position.page;
    const lineThreshold = 0.1; // Tolerância muito restritiva para evitar agrupamento incorreto
    
    for (const fragment of fragments) {
      const yDifference = Math.abs(fragment.position.y - currentY);
      const samePage = fragment.position.page === currentPage;
      
      // Se está na mesma linha (mesmo Y aproximado) e mesma página
      if (samePage && yDifference <= lineThreshold) {
        currentLine.push(fragment);
      } else {
        // Finalizar linha atual
        if (currentLine.length > 0) {
          normalizedLines.push(this.mergeLineFragments(currentLine));
        }
        
        // Iniciar nova linha
        currentLine = [fragment];
        currentY = fragment.position.y;
        currentPage = fragment.position.page;
      }
    }
    
    // Finalizar última linha
    if (currentLine.length > 0) {
      normalizedLines.push(this.mergeLineFragments(currentLine));
    }
    
    return normalizedLines;
  }
  
  /**
   * Mescla fragmentos de uma linha em um único elemento com lógica inteligente de espaçamento
   */
  private mergeLineFragments(lineFragments: Array<{
    text: string;
    fontInfo: any;
    position: any;
  }>): {
    text: string;
    fontInfo: any;
    position: any;
  } {
    // Ordenar fragmentos por posição X (esquerda para direita)
    lineFragments.sort((a, b) => a.position.x - b.position.x);
    
    // Filtrar fragmentos vazios
    const validFragments = lineFragments.filter(f => f.text.trim().length > 0);
    if (validFragments.length === 0) {
      return {
        text: '',
        fontInfo: lineFragments[0]?.fontInfo || {},
        position: lineFragments[0]?.position || {}
      };
    }
    
    if (validFragments.length === 1) {
      return {
        text: validFragments[0].text.trim(),
        fontInfo: validFragments[0].fontInfo,
        position: validFragments[0].position
      };
    }
    
    // Concatenar texto com lógica inteligente de espaçamento
    let mergedText = '';
    const avgCharWidth = 6; // Estimativa de largura média de caractere
    
    for (let i = 0; i < validFragments.length; i++) {
      const current = validFragments[i];
      const currentText = current.text.trim();
      
      if (i === 0) {
        mergedText = currentText;
        continue;
      }
      
      const previous = validFragments[i - 1];
      const previousText = previous.text.trim();
      
      // Calcular distância horizontal entre fragmentos
      const previousEnd = previous.position.x + (previous.position.width || previousText.length * avgCharWidth);
      const currentStart = current.position.x;
      const horizontalGap = currentStart - previousEnd;
      
      // Determinar se deve adicionar espaço baseado na distância e conteúdo
      let needsSpace = true;
      
      // Regras para não adicionar espaço:
      
      // 1. Fragmentos muito próximos (< 3 pixels) - provavelmente palavra dividida
      if (horizontalGap < 3) {
        needsSpace = false;
      }
      
      // 2. Números/pontos consecutivos (ex: "6", ".", "2" -> "6.2")
      else if (this.shouldJoinDirectly(previousText, currentText)) {
        needsSpace = false;
      }
      
      // 3. Hífen no final do anterior (palavra dividida)
      else if (previousText.endsWith('-') || previousText.endsWith('‐')) {
        needsSpace = false;
        // Remove hífen se for quebra de linha
        if (previousText.endsWith('-')) {
          mergedText = mergedText.slice(0, -1);
        }
      }
      
      // 4. Gap muito grande (> 30 pixels) - adicionar espaço extra
      else if (horizontalGap > 30) {
        mergedText += '  '; // Espaço duplo para gaps grandes
        needsSpace = false;
      }
      
      if (needsSpace) {
        mergedText += ' ';
      }
      
      mergedText += currentText;
    }
    
    // Limpeza final do texto
    mergedText = this.cleanMergedText(mergedText);
    
    // Usar informações de fonte do fragmento com maior tamanho (mais significativo)
    const primaryFragment = validFragments.reduce((prev, current) => 
      (current.fontInfo.size || 12) > (prev.fontInfo.size || 12) ? current : prev
    );
    
    // Calcular posição e dimensões mescladas
    const leftmostX = Math.min(...validFragments.map(f => f.position.x));
    const rightmostX = Math.max(...validFragments.map(f => f.position.x + (f.position.width || 0)));
    const topY = Math.min(...validFragments.map(f => f.position.y));
    
    return {
      text: mergedText,
      fontInfo: primaryFragment.fontInfo,
      position: {
        page: primaryFragment.position.page,
        x: leftmostX,
        y: topY,
        width: rightmostX - leftmostX,
        height: primaryFragment.position.height
      }
    };
  }
  
  /**
   * Determina se dois fragmentos devem ser unidos diretamente sem espaço
   */
  private shouldJoinDirectly(prev: string, current: string): boolean {
    // Números e pontos: "6" + "." + "2" + "." + "1" -> "6.2.1"
    if (/^\d+$/.test(prev) && current === '.') return true;
    if (prev === '.' && /^\d+$/.test(current)) return true;
    
    // Parênteses: "(" + "art" -> "(art"
    if (prev === '(' || current === ')') return true;
    
    // Pontuação geral
    if (/^[.,;:!?]$/.test(current)) return true;
    
    // Aspas e símbolos
    if (/^["'""''„"]$/.test(prev) || /^["'""''„"]$/.test(current)) return true;
    
    return false;
  }
  
  /**
   * Limpa e normaliza o texto mesclado
   */
  private cleanMergedText(text: string): string {
    return text
      // Remover espaços múltiplos
      .replace(/\s+/g, ' ')
      // Corrigir espaçamento antes de pontuação
      .replace(/\s+([.,;:!?])/g, '$1')
      // Corrigir espaçamento em números com pontos
      .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2')
      // Corrigir espaçamento em parênteses
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      // Trim final
      .trim();
  }
  
  /**
   * Converte estrutura extraída em chunks hierárquicos para compatibilidade
   */
  convertToHierarchicalChunks(structure: DocumentStructure): Array<{
    id: string;
    title: string;
    level: number;
    content: string;
    startPosition: number;
    endPosition: number;
    parentId?: string;
  }> {
    const chunks: Array<{
      id: string;
      title: string;
      level: number;
      content: string;
      startPosition: number;
      endPosition: number;
      parentId?: string;
    }> = [];
    
    let currentChunk: any = null;
    let position = 0;
    
    for (const element of structure.elements) {
      if (element.type === 'title' || element.type === 'subtitle') {
        // Finalizar chunk anterior
        if (currentChunk) {
          currentChunk.endPosition = position;
          currentChunk.content = currentChunk.content.trim();
          if (currentChunk.content.length > 0) {
            chunks.push(currentChunk);
          }
        }
        
        // Iniciar novo chunk
        currentChunk = {
          id: `chunk_${chunks.length}`,
          title: element.text.trim(),
          level: element.level,
          content: element.text + '\n',
          startPosition: position,
          endPosition: position,
          parentId: element.parentId
        };
      } else if (currentChunk) {
        // Adicionar conteúdo ao chunk atual
        currentChunk.content += element.text + '\n';
      }
      
      position += element.text.length + 1;
    }
    
    // Finalizar último chunk
    if (currentChunk) {
      currentChunk.endPosition = position;
      currentChunk.content = currentChunk.content.trim();
      if (currentChunk.content.length > 0) {
        chunks.push(currentChunk);
      }
    }
    
    console.log(`✅ Convertidos ${chunks.length} chunks hierárquicos da estrutura extraída`);
    return chunks;
  }
}

export const pdf2jsonExtractor = new PDF2JsonExtractor();