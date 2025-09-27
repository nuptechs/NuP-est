import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { OpenAI } from 'openai';
import fs from 'fs';
import { ProcessedDocument } from './hierarchicalChunker';
import { HierarchicalChunk } from './structureInterpreter';

interface DocumentElement {
  type: 'title' | 'subtitle' | 'paragraph' | 'list_item';
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  style?: {
    fontSize?: number;
    fontWeight?: string;
    isBold?: boolean;
  };
  level?: number; // Hierarquia detectada (1 = título principal, 2 = subtítulo, etc.)
}

interface AdvancedDocumentStructure {
  documentName: string;
  totalPages: number;
  elements: DocumentElement[];
  hierarchy: HierarchicalNode[];
  confidence: number;
}

interface HierarchicalNode {
  id: string;
  type: 'section' | 'subsection' | 'content';
  title: string;
  content: string;
  level: number;
  children: HierarchicalNode[];
  pageRange: {
    start: number;
    end: number;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
}

export class AdvancedDocumentProcessor {
  private documentAI: DocumentProcessorServiceClient;
  private openai: OpenAI;
  private projectId: string;
  private location: string = 'us'; // ou 'eu' dependendo da região
  private processorId: string = 'form-parser'; // Processor padrão para análise geral

  constructor() {
    // Configurar Google Document AI
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.documentAI = new DocumentProcessorServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: this.projectId,
    });

    // Configurar OpenAI para validação
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🧠 [AdvancedProcessor] Processador avançado inicializado');
  }

  /**
   * Processa um documento PDF usando Google Document AI + validação LLM
   */
  async processDocument(filePath: string, fileName: string): Promise<AdvancedDocumentStructure> {
    console.log(`🔬 [AdvancedProcessor] Iniciando análise avançada: ${fileName}`);

    try {
      // 1. Extrair elementos com Google Document AI
      const documentAnalysis = await this.analyzeWithDocumentAI(filePath);
      
      // 2. Construir hierarquia inteligente
      const hierarchy = await this.buildIntelligentHierarchy(documentAnalysis);
      
      // 3. Validar e corrigir com LLM
      const validatedHierarchy = await this.validateHierarchyWithLLM(hierarchy, fileName);
      
      const result: AdvancedDocumentStructure = {
        documentName: fileName,
        totalPages: documentAnalysis.totalPages,
        elements: documentAnalysis.elements,
        hierarchy: validatedHierarchy,
        confidence: documentAnalysis.confidence
      };

      console.log(`✅ [AdvancedProcessor] Análise concluída: ${validatedHierarchy.length} seções principais detectadas`);
      return result;

    } catch (error) {
      console.error('❌ [AdvancedProcessor] Erro no processamento avançado:', error);
      throw new Error(`Falha no processamento avançado: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Analisa documento com Google Document AI
   */
  private async analyzeWithDocumentAI(filePath: string): Promise<{
    elements: DocumentElement[];
    totalPages: number;
    confidence: number;
  }> {
    console.log('🔍 [DocumentAI] Analisando layout e estrutura...');

    const documentBuffer = fs.readFileSync(filePath);
    
    // Nome do processador para análise de layout
    const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

    const request = {
      name,
      rawDocument: {
        content: documentBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    const [result] = await this.documentAI.processDocument(request);
    const { document } = result;

    if (!document) {
      throw new Error('Documento não foi processado pelo Document AI');
    }

    const elements: DocumentElement[] = [];
    let totalConfidence = 0;
    let elementCount = 0;

    // Processar elementos detectados
    if (document.pages) {
      for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
        const page = document.pages[pageIndex];
        
        // Processar blocos de texto
        if (page.blocks) {
          for (const block of page.blocks) {
            if (block.layout?.textAnchor?.textSegments) {
              const text = this.extractTextFromSegments(document.text || '', block.layout.textAnchor.textSegments);
              
              if (text.trim()) {
                const element: DocumentElement = {
                  type: this.classifyElement(text, block),
                  text: text.trim(),
                  confidence: block.layout.confidence || 0.8,
                  boundingBox: this.extractBoundingBox(block.layout, pageIndex + 1),
                  style: this.extractTextStyle(block),
                };

                elements.push(element);
                totalConfidence += element.confidence;
                elementCount++;
              }
            }
          }
        }

        // Processar parágrafos se disponível  
        if (page.paragraphs) {
          for (const paragraph of page.paragraphs) {
            if (paragraph.layout?.textAnchor?.textSegments) {
              const text = this.extractTextFromSegments(document.text || '', paragraph.layout.textAnchor.textSegments);
              
              if (text.trim()) {
                const element: DocumentElement = {
                  type: this.classifyElement(text, paragraph),
                  text: text.trim(),
                  confidence: paragraph.layout.confidence || 0.8,
                  boundingBox: this.extractBoundingBox(paragraph.layout, pageIndex + 1),
                  style: this.extractTextStyle(paragraph),
                };

                // Evitar duplicatas
                const isDuplicate = elements.some(el => 
                  el.text === element.text && 
                  el.boundingBox.page === element.boundingBox.page
                );

                if (!isDuplicate) {
                  elements.push(element);
                  totalConfidence += element.confidence;
                  elementCount++;
                }
              }
            }
          }
        }
      }
    }

    const avgConfidence = elementCount > 0 ? totalConfidence / elementCount : 0;

    console.log(`📊 [DocumentAI] ${elements.length} elementos detectados com confiança média: ${(avgConfidence * 100).toFixed(1)}%`);

    return {
      elements,
      totalPages: document.pages?.length || 0,
      confidence: avgConfidence
    };
  }

  /**
   * Extrai texto dos segmentos
   */
  private extractTextFromSegments(fullText: string, segments: any[]): string {
    let text = '';
    for (const segment of segments) {
      if (segment.startIndex !== undefined && segment.endIndex !== undefined) {
        text += fullText.substring(segment.startIndex, segment.endIndex);
      }
    }
    return text;
  }

  /**
   * Classifica o tipo de elemento baseado no conteúdo e layout
   */
  private classifyElement(text: string, block: any): DocumentElement['type'] {
    const cleanText = text.trim().toUpperCase();
    
    // Padrões para títulos principais
    const titlePatterns = [
      /^\d+\s+[A-ZÁÇÀÉÊÍÓÔÕÚÜ]/,  // "1 TÍTULO", "14 DOS OBJETOS"
      /^CAPÍTULO\s+[IVX]+/,         // "CAPÍTULO I"
      /^SEÇÃO\s+[IVX]+/,            // "SEÇÃO I"
      /^ANEXO\s+[IVX]+/,            // "ANEXO I"
      /^TÍTULO\s+[IVX]+/,           // "TÍTULO I"
    ];

    // Padrões para subtítulos
    const subtitlePatterns = [
      /^\d+\.\d+\s+[A-ZÁÇÀÉÊÍÓÔÕÚÜ]/,    // "1.1 SUBTÍTULO", "14.1 HABILIDADES"
      /^\d+\.\d+\.\d+\s+[A-ZÁÇÀÉÊÍÓÔÕÚÜ]/, // "1.1.1 SUBITEM"
      /^[a-z]\)\s+[A-ZÁÇÀÉÊÍÓÔÕÚÜ]/,      // "a) ITEM"
    ];

    // Verificar se é título principal
    for (const pattern of titlePatterns) {
      if (pattern.test(cleanText)) {
        return 'title';
      }
    }

    // Verificar se é subtítulo
    for (const pattern of subtitlePatterns) {
      if (pattern.test(cleanText)) {
        return 'subtitle';
      }
    }

    // Verificar se é item de lista
    if (/^[-•*]\s+/.test(cleanText) || /^\d+\.\s+/.test(cleanText)) {
      return 'list_item';
    }

    return 'paragraph';
  }

  /**
   * Extrai bounding box do layout
   */
  private extractBoundingBox(layout: any, page: number): DocumentElement['boundingBox'] {
    const defaultBox = { x: 0, y: 0, width: 0, height: 0, page };

    if (!layout?.boundingPoly?.normalizedVertices) {
      return defaultBox;
    }

    const vertices = layout.boundingPoly.normalizedVertices;
    if (vertices.length < 2) {
      return defaultBox;
    }

    const xCoords = vertices.map((v: any) => v.x || 0);
    const yCoords = vertices.map((v: any) => v.y || 0);

    return {
      x: Math.min(...xCoords),
      y: Math.min(...yCoords),
      width: Math.max(...xCoords) - Math.min(...xCoords),
      height: Math.max(...yCoords) - Math.min(...yCoords),
      page
    };
  }

  /**
   * Extrai informações de estilo do elemento
   */
  private extractTextStyle(block: any): DocumentElement['style'] {
    // Document AI nem sempre fornece informações de estilo detalhadas
    // Usamos heurísticas baseadas no tipo de elemento
    return {
      fontSize: undefined,
      fontWeight: undefined,
      isBold: undefined
    };
  }

  /**
   * Constrói hierarquia inteligente baseada nos elementos detectados
   */
  private async buildIntelligentHierarchy(analysis: {
    elements: DocumentElement[];
    totalPages: number;
    confidence: number;
  }): Promise<HierarchicalNode[]> {
    console.log('🔨 [HierarchyBuilder] Construindo hierarquia inteligente...');

    const elements = analysis.elements;
    const hierarchy: HierarchicalNode[] = [];
    
    // Primeiro, detectar níveis baseado em padrões de numeração
    this.detectHierarchyLevels(elements);

    // Agrupar elementos em seções
    let currentSection: HierarchicalNode | null = null;
    let currentSubsection: HierarchicalNode | null = null;
    let sectionCounter = 0;

    for (const element of elements) {
      if (element.type === 'title') {
        // Novo título principal
        if (currentSection) {
          hierarchy.push(currentSection);
        }

        sectionCounter++;
        currentSection = {
          id: `section_${sectionCounter}`,
          type: 'section',
          title: element.text,
          content: '',
          level: element.level || 1,
          children: [],
          pageRange: {
            start: element.boundingBox.page,
            end: element.boundingBox.page
          },
          boundingBox: element.boundingBox
        };
        currentSubsection = null;

      } else if (element.type === 'subtitle' && currentSection) {
        // Novo subtítulo
        const subsection: HierarchicalNode = {
          id: `subsection_${sectionCounter}_${currentSection.children.length + 1}`,
          type: 'subsection',
          title: element.text,
          content: '',
          level: element.level || 2,
          children: [],
          pageRange: {
            start: element.boundingBox.page,
            end: element.boundingBox.page
          },
          boundingBox: element.boundingBox
        };

        currentSection.children.push(subsection);
        currentSubsection = subsection;

      } else if (element.type === 'paragraph' || element.type === 'list_item') {
        // Conteúdo
        const content = element.text + '\n';

        if (currentSubsection) {
          currentSubsection.content += content;
          currentSubsection.pageRange.end = Math.max(
            currentSubsection.pageRange.end,
            element.boundingBox.page
          );
        } else if (currentSection) {
          currentSection.content += content;
          currentSection.pageRange.end = Math.max(
            currentSection.pageRange.end,
            element.boundingBox.page
          );
        }
      }
    }

    // Adicionar última seção
    if (currentSection) {
      hierarchy.push(currentSection);
    }

    console.log(`🎯 [HierarchyBuilder] ${hierarchy.length} seções principais construídas`);
    
    // Log detalhado das seções encontradas
    hierarchy.forEach((section, index) => {
      console.log(`📝 [HierarchyBuilder] Seção ${index + 1}: "${section.title}" (${section.children.length} subseções)`);
    });

    return hierarchy;
  }

  /**
   * Detecta níveis hierárquicos baseado em padrões de numeração
   */
  private detectHierarchyLevels(elements: DocumentElement[]): void {
    for (const element of elements) {
      if (element.type === 'title' || element.type === 'subtitle') {
        const text = element.text.trim();
        
        // Padrões de níveis hierárquicos
        if (/^\d+\s+/.test(text)) {
          element.level = 1; // "1 TÍTULO", "14 DOS OBJETOS"
        } else if (/^\d+\.\d+\s+/.test(text)) {
          element.level = 2; // "1.1 SUBTÍTULO", "14.1 HABILIDADES"
        } else if (/^\d+\.\d+\.\d+\s+/.test(text)) {
          element.level = 3; // "1.1.1 SUBITEM"
        } else if (/^[a-z]\)\s+/.test(text)) {
          element.level = 4; // "a) ITEM"
        } else if (/^CAPÍTULO|^SEÇÃO|^ANEXO|^TÍTULO/.test(text.toUpperCase())) {
          element.level = 1; // Títulos especiais
        } else {
          element.level = element.type === 'title' ? 1 : 2;
        }
      }
    }
  }

  /**
   * Valida e corrige hierarquia usando LLM
   */
  private async validateHierarchyWithLLM(
    hierarchy: HierarchicalNode[], 
    fileName: string
  ): Promise<HierarchicalNode[]> {
    console.log('🧠 [LLMValidator] Validando hierarquia com IA...');

    try {
      // Preparar resumo da estrutura atual para o LLM
      const structureSummary = hierarchy.map((section, index) => ({
        index: index + 1,
        title: section.title,
        subsections: section.children.map(sub => sub.title),
        contentLength: section.content.length
      }));

      const prompt = `
Você é um especialista em análise de estrutura de editais de concurso público. 

Analise a estrutura hierárquica detectada automaticamente do documento "${fileName}" e corrija se necessário.

ESTRUTURA ATUAL DETECTADA:
${JSON.stringify(structureSummary, null, 2)}

REGRAS PARA EDITAIS DE CONCURSO:
1. Editais típicos têm entre 10-20 seções principais numeradas
2. Seções comuns: "DOS CARGOS", "DOS REQUISITOS", "DAS INSCRIÇÕES", "DAS PROVAS", "DOS CONHECIMENTOS", etc.
3. Seções são numeradas sequencialmente: "1 TÍTULO", "2 TÍTULO", etc.
4. Subseções usam numeração decimal: "1.1", "1.2", etc.
5. A última seção geralmente é sobre "CONHECIMENTOS" ou "CONTEÚDO PROGRAMÁTICO"

ANÁLISE NECESSÁRIA:
- A estrutura está correta ou há fragmentação excessiva?
- As seções seguem uma numeração lógica?
- Alguma seção deveria ser agrupada com outra?
- Há títulos que não são realmente seções principais?

Responda APENAS em JSON no formato:
{
  "analysis": "breve análise da estrutura atual",
  "corrections_needed": boolean,
  "suggested_changes": [
    {
      "action": "merge|split|remove|rename",
      "target_sections": [números das seções],
      "reason": "motivo da correção"
    }
  ],
  "confidence": number entre 0-1
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de documentos legais e editais.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const llmAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`🔍 [LLMValidator] Análise: ${llmAnalysis.analysis}`);
      console.log(`📊 [LLMValidator] Confiança: ${(llmAnalysis.confidence * 100).toFixed(1)}%`);

      // Aplicar correções se necessário
      if (llmAnalysis.corrections_needed && llmAnalysis.suggested_changes) {
        console.log(`🔧 [LLMValidator] Aplicando ${llmAnalysis.suggested_changes.length} correções...`);
        return this.applyLLMCorrections(hierarchy, llmAnalysis.suggested_changes);
      }

      return hierarchy;

    } catch (error) {
      console.warn('⚠️ [LLMValidator] Erro na validação LLM, mantendo estrutura original:', error);
      return hierarchy;
    }
  }

  /**
   * Aplica correções sugeridas pelo LLM
   */
  private applyLLMCorrections(
    hierarchy: HierarchicalNode[], 
    corrections: any[]
  ): HierarchicalNode[] {
    let correctedHierarchy = [...hierarchy];

    for (const correction of corrections) {
      try {
        switch (correction.action) {
          case 'merge':
            if (correction.target_sections?.length >= 2) {
              correctedHierarchy = this.mergeSections(correctedHierarchy, correction.target_sections);
            }
            break;
          case 'remove':
            if (correction.target_sections?.length >= 1) {
              correctedHierarchy = this.removeSections(correctedHierarchy, correction.target_sections);
            }
            break;
          case 'rename':
            if (correction.target_sections?.length >= 1 && correction.new_title) {
              correctedHierarchy = this.renameSections(correctedHierarchy, correction.target_sections, correction.new_title);
            }
            break;
        }
        console.log(`✅ [LLMValidator] Correção aplicada: ${correction.action} - ${correction.reason}`);
      } catch (error) {
        console.warn(`⚠️ [LLMValidator] Erro ao aplicar correção ${correction.action}:`, error);
      }
    }

    return correctedHierarchy;
  }

  /**
   * Merge seções especificadas
   */
  private mergeSections(hierarchy: HierarchicalNode[], targetSections: number[]): HierarchicalNode[] {
    targetSections.sort((a, b) => a - b);
    const firstSectionIndex = targetSections[0] - 1;
    
    if (firstSectionIndex < 0 || firstSectionIndex >= hierarchy.length) {
      return hierarchy;
    }

    const mergedSection = { ...hierarchy[firstSectionIndex] };
    
    // Merger conteúdo das outras seções
    for (let i = 1; i < targetSections.length; i++) {
      const sectionIndex = targetSections[i] - 1;
      if (sectionIndex >= 0 && sectionIndex < hierarchy.length) {
        const sectionToMerge = hierarchy[sectionIndex];
        mergedSection.content += '\n\n' + sectionToMerge.content;
        mergedSection.children.push(...sectionToMerge.children);
        mergedSection.pageRange.end = Math.max(mergedSection.pageRange.end, sectionToMerge.pageRange.end);
      }
    }

    // Remover seções mergeadas (exceto a primeira)
    const result = [...hierarchy];
    for (let i = targetSections.length - 1; i >= 1; i--) {
      const sectionIndex = targetSections[i] - 1;
      if (sectionIndex >= 0 && sectionIndex < result.length) {
        result.splice(sectionIndex, 1);
      }
    }

    result[firstSectionIndex] = mergedSection;
    return result;
  }

  /**
   * Remove seções especificadas
   */
  private removeSections(hierarchy: HierarchicalNode[], targetSections: number[]): HierarchicalNode[] {
    const result = [...hierarchy];
    targetSections.sort((a, b) => b - a); // Ordem decrescente para não afetar índices

    for (const sectionIndex of targetSections) {
      if (sectionIndex >= 1 && sectionIndex <= result.length) {
        result.splice(sectionIndex - 1, 1);
      }
    }

    return result;
  }

  /**
   * Renomeia seções especificadas
   */
  private renameSections(hierarchy: HierarchicalNode[], targetSections: number[], newTitle: string): HierarchicalNode[] {
    const result = [...hierarchy];
    
    for (const sectionIndex of targetSections) {
      if (sectionIndex >= 1 && sectionIndex <= result.length) {
        result[sectionIndex - 1].title = newTitle;
      }
    }

    return result;
  }

  /**
   * Converte estrutura avançada para formato compatível com sistema atual
   */
  convertToProcessedDocument(advancedStructure: AdvancedDocumentStructure): ProcessedDocument {
    const chunks: HierarchicalChunk[] = [];

    for (const node of advancedStructure.hierarchy) {
      // Chunk principal da seção
      chunks.push({
        id: node.id,
        title: node.title,
        content: node.content,
        level: node.level,
        startPosition: 0,
        endPosition: node.content.length,
        parentId: undefined,
        metadata: {
          wordCount: node.content.split(/\s+/).length,
          hasNumbers: /\d/.test(node.title),
          hasSpecialTerms: /(?:edital|concurso|prova|cargo|requisito)/i.test(node.content),
          confidence: 0.9,
          sectionType: this.classifySectionType(node.title)
        }
      });

      // Chunks das subseções
      for (const child of node.children) {
        chunks.push({
          id: child.id,
          title: child.title,
          content: child.content,
          level: child.level,
          startPosition: 0,
          endPosition: child.content.length,
          parentId: node.id,
          metadata: {
            wordCount: child.content.split(/\s+/).length,
            hasNumbers: /\d/.test(child.title),
            hasSpecialTerms: /(?:edital|concurso|prova|cargo|requisito)/i.test(child.content),
            confidence: 0.9,
            sectionType: this.classifySectionType(child.title)
          }
        });
      }
    }

    return {
      documentName: advancedStructure.documentName,
      totalChunks: chunks.length,
      structure: chunks,
      extractedAt: new Date(),
      metadata: {
        structureQuality: advancedStructure.confidence > 0.8 ? 'excellent' : 'good',
        processingMethod: 'pdf2json_enhanced',
        totalPages: advancedStructure.totalPages,
        avgConfidence: advancedStructure.confidence,
        detectedSections: advancedStructure.hierarchy.map(h => h.title),
        recommendations: []
      }
    };
  }

  /**
   * Classifica o tipo de seção baseado no título
   */
  private classifySectionType(title: string): 'preambulo' | 'inscricoes' | 'provas' | 'requisitos' | 'resultado' | 'disposicoes' | 'anexo' | 'outros' {
    const titleUpper = title.toUpperCase();
    
    if (titleUpper.includes('ANEXO')) return 'anexo';
    if (titleUpper.includes('INSCRIÇ') || titleUpper.includes('INSCRICAO')) return 'inscricoes';
    if (titleUpper.includes('PROVA') || titleUpper.includes('EXAME')) return 'provas';
    if (titleUpper.includes('REQUISITO') || titleUpper.includes('CARGO')) return 'requisitos';
    if (titleUpper.includes('RESULTADO') || titleUpper.includes('CLASSIF')) return 'resultado';
    if (titleUpper.includes('DISPOSIÇ') || titleUpper.includes('FINAL')) return 'disposicoes';
    if (titleUpper.includes('PREÂMBULO') || titleUpper.includes('OBJETO')) return 'preambulo';
    
    return 'outros';
  }
}

// Instância singleton
export const advancedDocumentProcessor = new AdvancedDocumentProcessor();