/**
 * Semantic Analyzer Service
 * Advanced content analysis with stopwords, concept extraction, and quality metrics
 */

// Portuguese stopwords (common words to ignore)
const PORTUGUESE_STOPWORDS = new Set([
  'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'os', 'as', 'dos', 'das',
  'para', 'com', 'por', 'no', 'na', 'ao', 'à', 'pelo', 'pela', 'seus', 'suas',
  'que', 'qual', 'quais', 'este', 'esta', 'esse', 'essa', 'isto', 'isso',
  'ele', 'ela', 'eles', 'elas', 'seu', 'sua', 'meu', 'minha', 'nosso', 'nossa',
  'são', 'ser', 'foi', 'foram', 'está', 'estão', 'tem', 'têm', 'ter', 'tinha',
  'foi', 'será', 'seria', 'sendo', 'sido', 'tido', 'tendo',
  'muito', 'muita', 'muitos', 'muitas', 'mais', 'menos', 'pouco', 'pouca',
  'como', 'quando', 'onde', 'porque', 'pois', 'mas', 'porém', 'contudo',
  'já', 'ainda', 'também', 'só', 'apenas', 'até', 'depois', 'antes',
  'sim', 'não', 'nem', 'ou', 'se', 'caso', 'embora', 'enquanto',
]);

// Generic/vague concepts to flag
const GENERIC_CONCEPTS = new Set([
  'coisa', 'coisas', 'algo', 'nada', 'tudo', 'isso', 'isto', 'aquilo',
  'tipo', 'tipos', 'exemplo', 'exemplos', 'item', 'itens',
  'parte', 'partes', 'aspecto', 'aspectos', 'elemento', 'elementos',
  'conceito', 'conceitos', 'ideia', 'ideias', 'tópico', 'tópicos',
]);

export interface SemanticAnalysis {
  // Concept extraction
  meaningfulConcepts: string[];
  conceptCount: number;
  conceptDiversity: number; // 0-1 scale
  
  // Quality metrics
  genericConceptRatio: number; // 0-1 scale
  averageConceptLength: number;
  
  // Complexity metrics
  vocabularyRichness: number; // 0-1 scale
  textComplexity: number; // 0-1 scale based on sentence length
  
  // Warnings
  warnings: string[];
}

/**
 * Extract meaningful concepts from text using stopword filtering
 */
export function extractMeaningfulConcepts(text: string): string[] {
  if (!text) return [];
  
  // Normalize text: lowercase, remove special chars
  const normalized = text
    .toLowerCase()
    .replace(/[^\wáàâãéèêíïóôõöúçñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words and filter
  const words = normalized.split(' ');
  const concepts = words.filter(word => {
    // Must be at least 3 characters
    if (word.length < 3) return false;
    
    // Skip stopwords
    if (PORTUGUESE_STOPWORDS.has(word)) return false;
    
    // Skip numbers
    if (/^\d+$/.test(word)) return false;
    
    return true;
  });
  
  return concepts;
}

/**
 * Analyze semantic quality of text content
 */
export function analyzeSemanticQuality(texts: string[]): SemanticAnalysis {
  const allText = texts.join(' ');
  const concepts = extractMeaningfulConcepts(allText);
  const uniqueConcepts = new Set(concepts);
  
  const warnings: string[] = [];
  
  // Calculate concept diversity (unique vs total)
  const conceptDiversity = concepts.length > 0 
    ? uniqueConcepts.size / concepts.length 
    : 0;
  
  // Calculate generic concept ratio
  const genericCount = concepts.filter(c => GENERIC_CONCEPTS.has(c)).length;
  const genericConceptRatio = concepts.length > 0 
    ? genericCount / concepts.length 
    : 0;
  
  // Calculate average concept length
  const averageConceptLength = concepts.length > 0
    ? concepts.reduce((sum, c) => sum + c.length, 0) / concepts.length
    : 0;
  
  // Calculate vocabulary richness (unique concepts / total words)
  const totalWords = allText.split(/\s+/).filter(w => w.length > 0).length;
  const vocabularyRichness = totalWords > 0
    ? uniqueConcepts.size / totalWords
    : 0;
  
  // Calculate text complexity (average sentence length)
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? totalWords / sentences.length
    : 0;
  const textComplexity = Math.min(avgSentenceLength / 20, 1); // Normalize to 0-1
  
  // Generate warnings
  if (genericConceptRatio > 0.3) {
    warnings.push('Muitos conceitos genéricos detectados (ex: "coisa", "tipo", "elemento")');
  }
  
  if (conceptDiversity < 0.4) {
    warnings.push('Conceitos muito repetitivos - adicione mais variedade');
  }
  
  if (uniqueConcepts.size < 5) {
    warnings.push('Poucos conceitos únicos - enriqueça o conteúdo com mais ideias');
  }
  
  if (averageConceptLength < 5) {
    warnings.push('Conceitos muito curtos - use termos mais descritivos');
  }
  
  return {
    meaningfulConcepts: Array.from(uniqueConcepts),
    conceptCount: uniqueConcepts.size,
    conceptDiversity,
    genericConceptRatio,
    averageConceptLength,
    vocabularyRichness,
    textComplexity,
    warnings,
  };
}

/**
 * Calculate overall quality score (0-100)
 */
export function calculateQualityScore(analysis: SemanticAnalysis, textLength: number): number {
  let score = 0;
  
  // Concept count (0-30 points)
  const conceptScore = Math.min((analysis.conceptCount / 10) * 30, 30);
  score += conceptScore;
  
  // Concept diversity (0-25 points)
  const diversityScore = analysis.conceptDiversity * 25;
  score += diversityScore;
  
  // Generic ratio penalty (0-20 points, inverse)
  const genericPenalty = (1 - analysis.genericConceptRatio) * 20;
  score += genericPenalty;
  
  // Vocabulary richness (0-15 points)
  const richnessScore = analysis.vocabularyRichness * 15;
  score += richnessScore;
  
  // Text length bonus (0-10 points)
  const lengthScore = Math.min((textLength / 200) * 10, 10);
  score += lengthScore;
  
  return Math.round(Math.min(score, 100));
}

/**
 * Generate improvement suggestions based on analysis
 */
export function generateImprovementSuggestions(
  analysis: SemanticAnalysis,
  textLength: number,
  contentType: 'mindmap' | 'flashcard' | 'quiz'
): string[] {
  const suggestions: string[] = [];
  
  // Add warnings first
  suggestions.push(...analysis.warnings);
  
  // Concept-specific suggestions
  if (analysis.conceptCount < 5) {
    if (contentType === 'mindmap') {
      suggestions.push('📝 Adicione mais nós ao mapa mental com conceitos específicos');
    } else if (contentType === 'flashcard') {
      suggestions.push('📝 Crie flashcards sobre diferentes aspectos do tema');
    }
  }
  
  // Text length suggestions
  if (textLength < 50) {
    suggestions.push('✍️ Expanda as descrições com mais detalhes e contexto');
  }
  
  // Diversity suggestions
  if (analysis.conceptDiversity < 0.5) {
    suggestions.push('🎨 Varie os conceitos - evite repetir as mesmas palavras');
  }
  
  // Generic concept suggestions
  if (analysis.genericConceptRatio > 0.2) {
    suggestions.push('🎯 Substitua termos genéricos por conceitos mais específicos');
  }
  
  // Complexity suggestions
  if (analysis.textComplexity < 0.3) {
    suggestions.push('📚 Desenvolva explicações mais completas e elaboradas');
  }
  
  // Positive reinforcement if quality is good
  if (suggestions.length === 0) {
    suggestions.push('✅ Conteúdo com boa qualidade e diversidade de conceitos!');
  }
  
  return suggestions;
}

/**
 * Validate content structure for anomalies
 */
export interface StructuralAnalysis {
  orphanedNodes?: number[];
  duplicateEdges?: string[];
  disconnectedComponents?: number;
  maxDepth?: number;
  warnings: string[];
}

export function analyzeStructure(
  nodes: Array<{ id: string; data: { label: string } }>,
  edges: Array<{ id: string; source: string; target: string }>
): StructuralAnalysis {
  const warnings: string[] = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // Find orphaned nodes (nodes with no connections)
  const connectedNodes = new Set<string>();
  edges.forEach(e => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  
  const orphanedNodes = nodes
    .map((n, idx) => !connectedNodes.has(n.id) ? idx : -1)
    .filter(idx => idx !== -1);
  
  if (orphanedNodes.length > 0) {
    warnings.push(`${orphanedNodes.length} nó(s) sem conexões - conecte-os ao mapa`);
  }
  
  // Find duplicate edges
  const edgeKeys = new Set<string>();
  const duplicateEdges: string[] = [];
  
  edges.forEach(edge => {
    const key = `${edge.source}->${edge.target}`;
    if (edgeKeys.has(key)) {
      duplicateEdges.push(key);
    }
    edgeKeys.add(key);
  });
  
  if (duplicateEdges.length > 0) {
    warnings.push(`${duplicateEdges.length} conexão(ões) duplicada(s) detectada(s)`);
  }
  
  // Calculate max depth (simple BFS from nodes with no incoming edges)
  const incomingEdges = new Map<string, number>();
  edges.forEach(e => {
    incomingEdges.set(e.target, (incomingEdges.get(e.target) || 0) + 1);
  });
  
  const rootNodes = Array.from(nodeIds).filter(id => !incomingEdges.has(id));
  let maxDepth = 0;
  
  if (rootNodes.length > 0) {
    // Simple depth calculation
    const visited = new Set<string>();
    const queue: Array<[string, number]> = rootNodes.map(id => [id, 0]);
    
    while (queue.length > 0) {
      const [nodeId, depth] = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);
      
      const children = edges
        .filter(e => e.source === nodeId)
        .map(e => e.target);
      
      children.forEach(childId => {
        queue.push([childId, depth + 1]);
      });
    }
  }
  
  // Check for disconnected components
  const disconnectedComponents = nodes.length - connectedNodes.size;
  
  return {
    orphanedNodes,
    duplicateEdges,
    disconnectedComponents,
    maxDepth,
    warnings,
  };
}
