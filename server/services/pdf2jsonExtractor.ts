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
          
          // Processar cada página
          pdfData.Pages.forEach((page: any, pageIndex: number) => {
            if (page.Texts) {
              page.Texts.forEach((textObj: any) => {
                // Extrair texto decodificado
                const decodedText = this.decodeText(textObj);
                if (!decodedText || decodedText.trim().length < 2) return;
                
                // Analisar propriedades do texto para detectar hierarquia
                const fontInfo = this.extractFontInfo(textObj);
                const position = {
                  page: pageIndex + 1,
                  x: textObj.x || 0,
                  y: textObj.y || 0,
                  width: textObj.w || 0,
                  height: textObj.h || 0
                };
                
                // Classificar elemento baseado em posição e formatação
                const classification = this.classifyElement(decodedText, fontInfo, position);
                
                elements.push({
                  id: `element_${elementId++}`,
                  type: classification.type,
                  level: classification.level,
                  text: decodedText,
                  position,
                  fontInfo
                });
              });
            }
          });
          
          // Pós-processar elementos para estabelecer hierarquia
          this.establishHierarchy(elements);
          
          // Filtrar elementos irrelevantes (headers, footers, etc.)
          const filteredElements = this.filterRelevantElements(elements);
          
          console.log(`✅ Extraídos ${filteredElements.length} elementos estruturados`);
          
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
   * Classifica elemento baseado em formatação e conteúdo
   */
  private classifyElement(
    text: string, 
    fontInfo: { name: string; size: number; bold: boolean; italic: boolean },
    position: { page: number; x: number; y: number; width: number; height: number }
  ): { type: LayoutElement['type']; level: number } {
    
    const cleanText = text.trim();
    
    // Filtrar headers e footers baseado na posição Y
    if (position.y < 50 || position.y > 750) {
      return { type: 'header', level: 0 };
    }
    
    // Detectar títulos principais por formatação
    if (fontInfo.size >= 16 || fontInfo.bold) {
      // Verificar padrões de títulos de edital
      if (this.isMajorTitle(cleanText)) {
        return { type: 'title', level: 1 };
      }
      if (this.isSubTitle(cleanText)) {
        return { type: 'subtitle', level: 2 };
      }
    }
    
    // Títulos por padrões de texto
    if (this.isTitleByPattern(cleanText)) {
      const level = this.determineTitleLevel(cleanText);
      return { 
        type: level === 1 ? 'title' : 'subtitle', 
        level 
      };
    }
    
    // Detectar listas
    if (this.isListItem(cleanText)) {
      return { type: 'list', level: 3 };
    }
    
    // Texto comum
    return { type: 'text', level: 4 };
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
   * Filtra elementos relevantes removendo headers/footers/ruído
   */
  private filterRelevantElements(elements: LayoutElement[]): LayoutElement[] {
    return elements.filter(element => {
      // Remover headers e footers
      if (element.type === 'header' || element.type === 'footer') return false;
      
      // Remover textos muito curtos (provavelmente ruído)
      if (element.text.length < 3) return false;
      
      // Remover números de página isolados
      if (/^\d+$/.test(element.text.trim())) return false;
      
      // Remover datas isoladas
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(element.text.trim())) return false;
      
      return true;
    });
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