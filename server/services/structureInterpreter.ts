import type { DocumentStructure, LayoutElement } from './pdf2jsonExtractor';

export interface HierarchicalChunk {
  id: string;
  title: string;
  level: number;
  content: string;
  startPosition: number;
  endPosition: number;
  parentId?: string;
  metadata: {
    wordCount: number;
    hasNumbers: boolean;
    hasSpecialTerms: boolean;
    confidence: number; // 0-1, quão confiante estamos que é um título real
    sectionType: 'preambulo' | 'inscricoes' | 'provas' | 'requisitos' | 'resultado' | 'disposicoes' | 'anexo' | 'outros';
  };
}

export interface InterpreterResult {
  chunks: HierarchicalChunk[];
  documentSummary: {
    totalChunks: number;
    structureQuality: 'excellent' | 'good' | 'fair' | 'poor';
    detectedSections: string[];
    recommendations: string[];
  };
}

export class StructureInterpreter {
  
  /**
   * Processa estrutura extraída e aplica análise semântica avançada
   */
  async interpretDocumentStructure(structure: DocumentStructure): Promise<InterpreterResult> {
    console.log(`🧠 [StructureInterpreter] Iniciando análise semântica de ${structure.elements.length} elementos`);
    
    // 1. Pré-processar elementos para melhorar detecção
    const enhancedElements = this.enhanceElementClassification(structure.elements);
    
    // 2. Agrupar elementos em chunks hierárquicos
    const rawChunks = this.groupElementsIntoChunks(enhancedElements);
    
    // 3. Aplicar análise semântica e correções
    const refinedChunks = this.applySemanticAnalysis(rawChunks);
    
    // 4. Validar e corrigir hierarquia
    const validatedChunks = this.validateAndCorrectHierarchy(refinedChunks);
    
    // 5. Gerar insights sobre a qualidade da estrutura
    const documentSummary = this.generateDocumentSummary(validatedChunks);
    
    console.log(`✅ Análise concluída: ${validatedChunks.length} chunks hierárquicos gerados`);
    
    return {
      chunks: validatedChunks,
      documentSummary
    };
  }
  
  /**
   * Melhora classificação de elementos usando análise contextual
   */
  private enhanceElementClassification(elements: LayoutElement[]): LayoutElement[] {
    console.log(`🔍 Melhorando classificação de ${elements.length} elementos...`);
    
    return elements.map((element, index) => {
      const enhanced = { ...element };
      
      // Analisar contexto (elementos vizinhos)
      const prevElement = index > 0 ? elements[index - 1] : null;
      const nextElement = index < elements.length - 1 ? elements[index + 1] : null;
      
      // Detectar títulos baseado em contexto
      if (this.isLikelyTitleByContext(element, prevElement, nextElement)) {
        enhanced.type = element.fontInfo.size >= 14 ? 'title' : 'subtitle';
        enhanced.level = this.calculateSemanticLevel(element.text);
      }
      
      // Melhorar detecção de listas
      if (this.isEnhancedListItem(element, prevElement, nextElement)) {
        enhanced.type = 'list';
        enhanced.level = 3;
      }
      
      return enhanced;
    });
  }
  
  /**
   * Detecta títulos usando análise contextual
   */
  private isLikelyTitleByContext(
    element: LayoutElement,
    prevElement: LayoutElement | null,
    nextElement: LayoutElement | null
  ): boolean {
    const text = element.text.trim();
    
    // Título isolado (linha anterior/posterior vazia ou diferente)
    const isIsolated = (
      (!prevElement || prevElement.text.trim().length < 10) &&
      (!nextElement || nextElement.text.trim().length < 10)
    );
    
    // Formatação diferenciada
    const isDifferentlyFormatted = (
      element.fontInfo.bold ||
      element.fontInfo.size > 12 ||
      (prevElement && element.fontInfo.size > prevElement.fontInfo.size)
    );
    
    // Posição típica de título (margem esquerda)
    const isLeftAligned = element.position.x < 100;
    
    // Padrões semânticos de edital
    const hasEditalPatterns = this.containsEditalPatterns(text);
    
    return (isIsolated && isDifferentlyFormatted && isLeftAligned) || hasEditalPatterns;
  }
  
  /**
   * Verifica padrões específicos de editais
   */
  private containsEditalPatterns(text: string): boolean {
    const editalPatterns = [
      // Padrões estruturais
      /^(CAPÍTULO|SEÇÃO|TÍTULO|ANEXO|APÊNDICE)\s+[IVX\d]/i,
      
      // Numeração hierárquica
      /^\d+(\.\d+)*[\.\s\-]/,
      
      // Preposições estruturais
      /^(DAS?|DOS?|NAS?|NOS?|DO)\s+[A-ZÁÊÍÓÔÂ]/i,
      
      // Seções típicas de edital
      /^(EDITAL|CONCURSO|PROCESSO|SELEÇÃO|ABERTURA)/i,
      /^(REQUISITOS?|ATRIBUIÇÕES|REMUNERAÇÃO|SALÁRIO)/i,
      /^(INSCRIÇÕES?|TAXAS?|DOCUMENTAÇÃO|COMPROVANTES)/i,
      /^(PROVAS?|EXAMES?|AVALIAÇÃO|TESTES?|ETAPAS?)/i,
      /^(RESULTADO|CLASSIFICAÇÃO|CONVOCAÇÃO|NOMEAÇÃO)/i,
      /^(DISPOSIÇÕES|CRONOGRAMA|RECURSOS?|IMPUGNAÇÕES?)/i,
      
      // Cargos e vagas
      /^(CARGO|FUNÇÃO|VAGA|POSTO|ESPECIALIDADE)/i,
      /^(AUDITOR|FISCAL|TÉCNICO|ANALISTA|ASSISTENTE)/i,
      
      // Legislação
      /^(LEI|DECRETO|PORTARIA|RESOLUÇÃO|INSTRUÇÃO)/i,
    ];
    
    return editalPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Calcula nível semântico baseado no conteúdo
   */
  private calculateSemanticLevel(text: string): number {
    const trimmed = text.trim();
    
    // Nível 1: Títulos principais do documento
    if (/^(EDITAL|CONCURSO|PROCESSO\s+SELETIVO|SELEÇÃO\s+PÚBLICA)/i.test(trimmed)) return 1;
    if (/^(CAPÍTULO|TÍTULO|PARTE)\s+[IVX\d]+/i.test(trimmed)) return 1;
    
    // Nível 2: Seções principais
    if (/^(SEÇÃO|ANEXO|APÊNDICE)/i.test(trimmed)) return 2;
    if (/^(DAS?|DOS?|NAS?|NOS?)\s+[A-Z\s]{8,}/i.test(trimmed)) return 2;
    if (/^(DISPOSIÇÕES|CRONOGRAMA|RECURSOS|IMPUGNAÇÕES)/i.test(trimmed)) return 2;
    
    // Nível 3-5: Numeração hierárquica
    if (/^\d+\.\d+\.\d+\.\d+/.test(trimmed)) return 5;
    if (/^\d+\.\d+\.\d+/.test(trimmed)) return 4;
    if (/^\d+\.\d+/.test(trimmed)) return 3;
    if (/^\d+\./.test(trimmed)) return 2;
    
    // Nível 3: Subtítulos específicos
    if (/^(REQUISITOS|ATRIBUIÇÕES|INSCRIÇÕES|PROVAS|RESULTADO)/i.test(trimmed)) return 3;
    
    return 2; // Nível padrão para títulos não classificados
  }
  
  /**
   * Detecta listas de forma mais inteligente
   */
  private isEnhancedListItem(
    element: LayoutElement,
    prevElement: LayoutElement | null,
    nextElement: LayoutElement | null
  ): boolean {
    const text = element.text.trim();
    
    // Padrões de lista comuns
    const listPatterns = [
      /^[a-z]\)\s+/i,
      /^[IVX\d]+\.\s+/,
      /^[-•·∙▪▫]\s+/,
      /^\d+[\)\.]\s+/,
      /^[♦◦◆]\s+/
    ];
    
    return listPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Agrupa elementos em chunks hierárquicos
   */
  private groupElementsIntoChunks(elements: LayoutElement[]): HierarchicalChunk[] {
    console.log(`📑 Agrupando elementos em chunks hierárquicos...`);
    
    const chunks: HierarchicalChunk[] = [];
    let currentChunk: Partial<HierarchicalChunk> | null = null;
    let position = 0;
    let chunkId = 0;
    
    for (const element of elements) {
      if (element.type === 'title' || element.type === 'subtitle') {
        // Finalizar chunk anterior
        if (currentChunk && currentChunk.content) {
          this.finalizeChunk(currentChunk as HierarchicalChunk, position);
          chunks.push(currentChunk as HierarchicalChunk);
        }
        
        // Iniciar novo chunk
        currentChunk = {
          id: `structured_chunk_${chunkId++}`,
          title: this.cleanTitle(element.text),
          level: element.level,
          content: element.text + '\n',
          startPosition: position,
          parentId: element.parentId
        };
      } else if (currentChunk) {
        // Adicionar conteúdo ao chunk atual
        currentChunk.content += element.text + '\n';
      } else {
        // Primeiro elemento não é título - criar chunk preâmbulo
        currentChunk = {
          id: `structured_chunk_${chunkId++}`,
          title: 'Preâmbulo',
          level: 1,
          content: element.text + '\n',
          startPosition: position
        };
      }
      
      position += element.text.length + 1;
    }
    
    // Finalizar último chunk
    if (currentChunk && currentChunk.content) {
      this.finalizeChunk(currentChunk as HierarchicalChunk, position);
      chunks.push(currentChunk as HierarchicalChunk);
    }
    
    console.log(`📊 ${chunks.length} chunks criados na primeira passada`);
    return chunks;
  }
  
  /**
   * Finaliza um chunk calculando metadata
   */
  private finalizeChunk(chunk: HierarchicalChunk, endPosition: number): void {
    chunk.endPosition = endPosition;
    chunk.content = chunk.content?.trim() || '';
    
    // Calcular metadata
    const wordCount = chunk.content.split(/\s+/).length;
    const hasNumbers = /\d/.test(chunk.content);
    const hasSpecialTerms = this.containsSpecialTerms(chunk.content);
    const confidence = this.calculateTitleConfidence(chunk.title, chunk.content);
    const sectionType = this.identifySectionType(chunk.title, chunk.content);
    
    chunk.metadata = {
      wordCount,
      hasNumbers,
      hasSpecialTerms,
      confidence,
      sectionType
    };
  }
  
  /**
   * Detecta termos especiais relacionados a concursos
   */
  private containsSpecialTerms(content: string): boolean {
    const specialTerms = [
      'carga horária', 'requisitos', 'escolaridade', 'experiência',
      'salário', 'remuneração', 'benefícios', 'inscrição', 'taxa',
      'documentos', 'prova', 'exame', 'avaliação', 'pontuação',
      'classificação', 'resultado', 'convocação', 'nomeação'
    ];
    
    const lowerContent = content.toLowerCase();
    return specialTerms.some(term => lowerContent.includes(term));
  }
  
  /**
   * Calcula confiança de que um título é válido
   */
  private calculateTitleConfidence(title: string, content: string): number {
    let confidence = 0.5; // Base
    
    // Fatores que aumentam confiança
    if (this.containsEditalPatterns(title)) confidence += 0.3;
    if (title.length >= 10 && title.length <= 80) confidence += 0.1;
    if (/^[A-ZÁÊÍÓÔÂ]/.test(title)) confidence += 0.1;
    if (content.length > 100) confidence += 0.1;
    
    // Fatores que diminuem confiança
    if (title.length < 5) confidence -= 0.2;
    if (title.length > 120) confidence -= 0.2;
    if (/^\d+$/.test(title)) confidence -= 0.4;
    if (content.length < 50) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Identifica tipo de seção baseado no conteúdo
   */
  private identifySectionType(title: string, content: string): HierarchicalChunk['metadata']['sectionType'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (/inscri[cç][aã]o/i.test(titleLower) || contentLower.includes('inscrever')) return 'inscricoes';
    if (/prova|exame|avalia[cç][aã]o/i.test(titleLower) || contentLower.includes('exame')) return 'provas';
    if (/requisito|escolaridade/i.test(titleLower) || contentLower.includes('requisitos')) return 'requisitos';
    if (/resultado|classifica[cç][aã]o/i.test(titleLower) || contentLower.includes('resultado')) return 'resultado';
    if (/disposi[cç][aã]o|cronograma/i.test(titleLower)) return 'disposicoes';
    if (/anexo|ap[eê]ndice/i.test(titleLower)) return 'anexo';
    if (/pre[aâ]mbulo|edital|concurso/i.test(titleLower)) return 'preambulo';
    
    return 'outros';
  }
  
  /**
   * Aplica análise semântica para melhorar chunks
   */
  private applySemanticAnalysis(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    console.log(`🔬 Aplicando análise semântica em ${chunks.length} chunks...`);
    
    // Filtrar chunks de baixa qualidade
    const qualityChunks = chunks.filter(chunk => {
      // Manter chunks com alta confiança ou conteúdo significativo
      return chunk.metadata.confidence > 0.3 || 
             chunk.metadata.wordCount > 20 ||
             chunk.metadata.hasSpecialTerms;
    });
    
    // Mesclar chunks muito pequenos com chunks vizinhos
    const mergedChunks = this.mergeSmallChunks(qualityChunks);
    
    // Corrigir títulos baseado no conteúdo
    const correctedChunks = this.correctTitlesBasedOnContent(mergedChunks);
    
    console.log(`📊 Análise semântica: ${chunks.length} → ${correctedChunks.length} chunks`);
    return correctedChunks;
  }
  
  /**
   * Mescla chunks muito pequenos
   */
  private mergeSmallChunks(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    const merged: HierarchicalChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Se chunk é muito pequeno, tentar mesclar com o próximo
      if (chunk.metadata.wordCount < 15 && i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        
        // Mesclar se são do mesmo nível ou próximos
        if (Math.abs(chunk.level - nextChunk.level) <= 1) {
          const mergedChunk: HierarchicalChunk = {
            ...nextChunk,
            content: chunk.content + '\n' + nextChunk.content,
            startPosition: chunk.startPosition,
            metadata: {
              ...nextChunk.metadata,
              wordCount: chunk.metadata.wordCount + nextChunk.metadata.wordCount
            }
          };
          
          merged.push(mergedChunk);
          i++; // Pular próximo chunk
          continue;
        }
      }
      
      merged.push(chunk);
    }
    
    return merged;
  }
  
  /**
   * Corrige títulos baseado no conteúdo analisado
   */
  private correctTitlesBasedOnContent(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    return chunks.map((chunk, index) => {
      let correctedTitle = chunk.title;
      
      // Se título genérico, tentar inferir do conteúdo
      if (chunk.metadata.confidence < 0.5 || /^(seção|item)\s*\d+/i.test(correctedTitle)) {
        const inferredTitle = this.inferTitleFromContent(chunk.content, index);
        if (inferredTitle && inferredTitle !== correctedTitle) {
          correctedTitle = inferredTitle;
          chunk.metadata.confidence = Math.min(0.8, chunk.metadata.confidence + 0.2);
        }
      }
      
      return {
        ...chunk,
        title: correctedTitle
      };
    });
  }
  
  /**
   * Infere título a partir do conteúdo
   */
  private inferTitleFromContent(content: string, chunkIndex: number): string | null {
    const lines = content.split('\n').filter(line => line.trim().length > 5);
    if (lines.length === 0) return null;
    
    // Procurar primeira linha que parece título
    for (const line of lines.slice(0, 3)) {
      const trimmed = line.trim();
      
      if (this.containsEditalPatterns(trimmed) && trimmed.length <= 100) {
        return this.cleanTitle(trimmed);
      }
    }
    
    // Fallback: título baseado no tipo de seção
    const fallbackTitles = [
      'Informações Gerais',
      'Das Inscrições', 
      'Das Provas',
      'Dos Requisitos',
      'Do Resultado',
      'Das Disposições Finais'
    ];
    
    return fallbackTitles[chunkIndex % fallbackTitles.length] || `Seção ${chunkIndex + 1}`;
  }
  
  /**
   * Valida e corrige hierarquia final
   */
  private validateAndCorrectHierarchy(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    console.log(`🔧 Validando e corrigindo hierarquia de ${chunks.length} chunks...`);
    
    // Normalizar níveis (evitar saltos grandes)
    const normalizedChunks = this.normalizeLevels(chunks);
    
    // Reestabelecer relações pai-filho
    const correctedChunks = this.reestablishParentChild(normalizedChunks);
    
    // Garantir que temos pelo menos alguns chunks principais
    const finalChunks = this.ensureMinimumStructure(correctedChunks);
    
    console.log(`✅ Hierarquia corrigida: ${finalChunks.length} chunks finais`);
    return finalChunks;
  }
  
  /**
   * Normaliza níveis hierárquicos
   */
  private normalizeLevels(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    if (chunks.length === 0) return chunks;
    
    const corrected = [...chunks];
    
    // Garantir que primeiro chunk seja nível 1
    if (corrected[0].level > 1) {
      corrected[0].level = 1;
    }
    
    // Normalizar níveis subsequentes
    for (let i = 1; i < corrected.length; i++) {
      const current = corrected[i];
      const previous = corrected[i - 1];
      
      // Não permitir saltos maiores que 1 nível
      if (current.level > previous.level + 1) {
        current.level = previous.level + 1;
      }
      
      // Mínimo nível 1
      if (current.level < 1) {
        current.level = 1;
      }
    }
    
    return corrected;
  }
  
  /**
   * Reestabelece relações pai-filho
   */
  private reestablishParentChild(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunk.parentId = undefined; // Limpar relação anterior
      
      // Procurar pai (chunk anterior com nível menor)
      for (let j = i - 1; j >= 0; j--) {
        const potentialParent = chunks[j];
        if (potentialParent.level < chunk.level) {
          chunk.parentId = potentialParent.id;
          break;
        }
      }
    }
    
    return chunks;
  }
  
  /**
   * Garante estrutura mínima do documento
   */
  private ensureMinimumStructure(chunks: HierarchicalChunk[]): HierarchicalChunk[] {
    if (chunks.length === 0) {
      return [{
        id: 'fallback_chunk_0',
        title: 'Documento',
        level: 1,
        content: 'Documento sem estrutura detectada.',
        startPosition: 0,
        endPosition: 0,
        metadata: {
          wordCount: 4,
          hasNumbers: false,
          hasSpecialTerms: false,
          confidence: 0.1,
          sectionType: 'outros'
        }
      }];
    }
    
    // Se temos muito poucos chunks, dividir o maior
    if (chunks.length < 3) {
      const largestChunk = chunks.reduce((max, chunk) => 
        chunk.metadata.wordCount > max.metadata.wordCount ? chunk : max
      );
      
      if (largestChunk.metadata.wordCount > 200) {
        return this.subdivideChunk(largestChunk, chunks);
      }
    }
    
    return chunks;
  }
  
  /**
   * Subdivide um chunk grande em chunks menores
   */
  private subdivideChunk(largeChunk: HierarchicalChunk, allChunks: HierarchicalChunk[]): HierarchicalChunk[] {
    const lines = largeChunk.content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 10) return allChunks;
    
    const midPoint = Math.floor(lines.length / 2);
    const firstHalf = lines.slice(0, midPoint).join('\n');
    const secondHalf = lines.slice(midPoint).join('\n');
    
    const chunk1: HierarchicalChunk = {
      ...largeChunk,
      id: largeChunk.id + '_part1',
      content: firstHalf,
      endPosition: largeChunk.startPosition + firstHalf.length,
      metadata: {
        ...largeChunk.metadata,
        wordCount: firstHalf.split(/\s+/).length
      }
    };
    
    const chunk2: HierarchicalChunk = {
      ...largeChunk,
      id: largeChunk.id + '_part2',
      title: this.inferTitleFromContent(secondHalf, 1) || largeChunk.title + ' (Continuação)',
      content: secondHalf,
      startPosition: chunk1.endPosition,
      metadata: {
        ...largeChunk.metadata,
        wordCount: secondHalf.split(/\s+/).length
      }
    };
    
    // Substituir chunk original pelos dois novos
    const index = allChunks.findIndex(c => c.id === largeChunk.id);
    const result = [...allChunks];
    result.splice(index, 1, chunk1, chunk2);
    
    return result;
  }
  
  /**
   * Gera resumo da qualidade do documento
   */
  private generateDocumentSummary(chunks: HierarchicalChunk[]) {
    const totalChunks = chunks.length;
    const avgConfidence = chunks.reduce((sum, chunk) => sum + chunk.metadata.confidence, 0) / totalChunks;
    const sectionsWithSpecialTerms = chunks.filter(chunk => chunk.metadata.hasSpecialTerms).length;
    
    // Determinar qualidade da estrutura
    let structureQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgConfidence > 0.8 && totalChunks >= 5) structureQuality = 'excellent';
    else if (avgConfidence > 0.6 && totalChunks >= 3) structureQuality = 'good';
    else if (avgConfidence > 0.4 && totalChunks >= 2) structureQuality = 'fair';
    else structureQuality = 'poor';
    
    // Listar seções detectadas
    const detectedSections = chunks.map(chunk => chunk.title);
    
    // Gerar recomendações
    const recommendations: string[] = [];
    if (avgConfidence < 0.5) recommendations.push('Revisar títulos detectados automaticamente');
    if (totalChunks < 3) recommendations.push('Documento pode precisar de divisão manual adicional');
    if (sectionsWithSpecialTerms < totalChunks * 0.3) recommendations.push('Verificar se documento é realmente um edital');
    
    return {
      totalChunks,
      structureQuality,
      detectedSections,
      recommendations
    };
  }
  
  /**
   * Limpa título removendo caracteres desnecessários
   */
  private cleanTitle(title: string): string {
    return title
      .trim()
      .replace(/^[-–—\s]+/, '') // Remove hífens/espaços do início
      .replace(/[-–—\s]+$/, '') // Remove hífens/espaços do final
      .replace(/\s+/g, ' ')     // Normaliza espaços múltiplos
      .slice(0, 120);           // Limita tamanho
  }
}

export const structureInterpreter = new StructureInterpreter();