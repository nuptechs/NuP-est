/**
 * Content Validator Service
 * Pre-generation validation layer to ensure content quality before AI processing
 * 
 * Validates content sufficiency and provides helpful error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
  metrics?: Record<string, any>;
}

interface MindMapNode {
  id: string;
  data: {
    label: string;
    description?: string;
    level?: number;
  };
}

interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

/**
 * Validation Configuration
 */
const VALIDATION_CONFIG = {
  mindmap: {
    minNodes: 3,
    minLabelLength: 2,
    minTotalTextLength: 20,
    minUniqueLabels: 2,
  },
  flashcard: {
    minCards: 3,
    minTextPerCard: 10,
    minTotalTextLength: 50,
    minUniqueConcepts: 2,
  }
};

/**
 * Validate Mind Map content before flashcard generation
 */
export function validateMindMapForFlashcards(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): ValidationResult {
  const metrics = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    totalTextLength: 0,
    uniqueLabels: new Set<string>(),
    nodesWithDescription: 0,
    avgLabelLength: 0,
  };

  // Basic validation: check if nodes exist
  if (!nodes || nodes.length === 0) {
    return {
      isValid: false,
      error: "Mapa mental vazio",
      details: "O mapa mental não contém nenhum nó. Adicione conceitos e ideias ao mapa antes de gerar flashcards.",
    };
  }

  // Check minimum nodes
  if (nodes.length < VALIDATION_CONFIG.mindmap.minNodes) {
    return {
      isValid: false,
      error: "Conteúdo insuficiente para gerar flashcards",
      details: `O mapa mental possui apenas ${nodes.length} nó(s). Para gerar flashcards de qualidade, adicione pelo menos ${VALIDATION_CONFIG.mindmap.minNodes} conceitos ao mapa.`,
      metrics,
    };
  }

  // Analyze content quality
  let totalTextLength = 0;
  let emptyLabelCount = 0;
  let shortLabelCount = 0;

  nodes.forEach(node => {
    const label = (node.data.label || "").trim();
    const description = (node.data.description || "").trim();

    // Track metrics
    totalTextLength += label.length + description.length;
    if (label) metrics.uniqueLabels.add(label.toLowerCase());
    if (description) metrics.nodesWithDescription++;

    // Count issues
    if (!label || label.length === 0) {
      emptyLabelCount++;
    } else if (label.length < VALIDATION_CONFIG.mindmap.minLabelLength) {
      shortLabelCount++;
    }
  });

  metrics.totalTextLength = totalTextLength;
  metrics.avgLabelLength = totalTextLength / nodes.length;

  // Check for empty labels
  if (emptyLabelCount > 0) {
    return {
      isValid: false,
      error: "Nós com conteúdo vazio",
      details: `${emptyLabelCount} nó(s) do mapa não possuem texto. Adicione descrições aos conceitos para gerar flashcards relevantes.`,
      metrics,
    };
  }

  // Check for too many short labels
  if (shortLabelCount > nodes.length / 2) {
    return {
      isValid: false,
      error: "Conteúdo muito superficial",
      details: `Muitos nós possuem apenas 1-2 caracteres. Expanda os conceitos com descrições mais detalhadas para criar flashcards de qualidade.`,
      metrics,
    };
  }

  // Check total text length
  if (totalTextLength < VALIDATION_CONFIG.mindmap.minTotalTextLength) {
    return {
      isValid: false,
      error: "Quantidade de texto insuficiente",
      details: `O mapa contém muito pouco texto (${totalTextLength} caracteres). Adicione mais detalhes e descrições aos conceitos para gerar flashcards úteis.`,
      metrics,
    };
  }

  // Check for diversity (unique concepts)
  if (metrics.uniqueLabels.size < VALIDATION_CONFIG.mindmap.minUniqueLabels) {
    return {
      isValid: false,
      error: "Falta de diversidade nos conceitos",
      details: `O mapa possui conceitos muito repetitivos. Adicione ideias diferentes para criar flashcards variados.`,
      metrics,
    };
  }

  // Check if mind map has structure (edges)
  if (edges.length === 0 && nodes.length > 1) {
    return {
      isValid: false,
      error: "Mapa mental sem conexões",
      details: "Os conceitos não estão conectados. Crie relações entre os nós para gerar flashcards que explorem as conexões entre ideias.",
      metrics,
    };
  }

  // All validations passed
  return {
    isValid: true,
    metrics,
  };
}

/**
 * Validate Flashcards content before mind map generation
 */
export function validateFlashcardsForMindMap(
  flashcards: Flashcard[]
): ValidationResult {
  const metrics = {
    cardCount: flashcards.length,
    totalTextLength: 0,
    avgCardLength: 0,
    uniqueConcepts: new Set<string>(),
    cardsWithShortContent: 0,
    emptyCards: 0,
  };

  // Basic validation: check if flashcards exist
  if (!flashcards || flashcards.length === 0) {
    return {
      isValid: false,
      error: "Baralho vazio",
      details: "Este baralho não contém flashcards. Adicione flashcards antes de gerar um mapa mental.",
    };
  }

  // Check minimum cards
  if (flashcards.length < VALIDATION_CONFIG.flashcard.minCards) {
    return {
      isValid: false,
      error: "Número insuficiente de flashcards",
      details: `O baralho possui apenas ${flashcards.length} flashcard(s). Para criar um mapa mental significativo, adicione pelo menos ${VALIDATION_CONFIG.flashcard.minCards} flashcards.`,
      metrics,
    };
  }

  // Analyze content quality
  let totalTextLength = 0;
  let emptyCardCount = 0;
  let shortCardCount = 0;

  flashcards.forEach(card => {
    const front = (card.front || "").trim();
    const back = (card.back || "").trim();
    const cardLength = front.length + back.length;

    totalTextLength += cardLength;
    metrics.totalTextLength = totalTextLength;

    // Extract concepts (simple keyword extraction)
    const words = [...front.split(/\s+/), ...back.split(/\s+/)]
      .filter(w => w.length > 3)
      .map(w => w.toLowerCase());
    words.forEach(w => metrics.uniqueConcepts.add(w));

    // Count issues
    if (!front || !back) {
      emptyCardCount++;
    } else if (cardLength < VALIDATION_CONFIG.flashcard.minTextPerCard) {
      shortCardCount++;
    }
  });

  metrics.avgCardLength = totalTextLength / flashcards.length;

  // Check for empty cards
  if (emptyCardCount > 0) {
    return {
      isValid: false,
      error: "Flashcards incompletos",
      details: `${emptyCardCount} flashcard(s) possuem frente ou verso vazios. Complete os flashcards antes de gerar o mapa mental.`,
      metrics,
    };
  }

  // Check for too many short cards
  if (shortCardCount > flashcards.length / 2) {
    return {
      isValid: false,
      error: "Flashcards muito curtos",
      details: `Muitos flashcards possuem conteúdo muito curto. Adicione mais detalhes às perguntas e respostas para gerar um mapa mental rico.`,
      metrics,
    };
  }

  // Check total text length
  if (totalTextLength < VALIDATION_CONFIG.flashcard.minTotalTextLength) {
    return {
      isValid: false,
      error: "Quantidade de conteúdo insuficiente",
      details: `O baralho contém muito pouco texto (${totalTextLength} caracteres). Enriqueça os flashcards com mais informações para criar um mapa mental detalhado.`,
      metrics,
    };
  }

  // Check for concept diversity
  if (metrics.uniqueConcepts.size < VALIDATION_CONFIG.flashcard.minUniqueConcepts) {
    return {
      isValid: false,
      error: "Falta de diversidade nos conceitos",
      details: `Os flashcards são muito repetitivos. Adicione perguntas sobre diferentes aspectos do tema para criar um mapa mental abrangente.`,
      metrics,
    };
  }

  // All validations passed
  return {
    isValid: true,
    metrics,
  };
}

/**
 * Get validation configuration (for testing/customization)
 */
export function getValidationConfig() {
  return { ...VALIDATION_CONFIG };
}

/**
 * Update validation thresholds (for admin/testing purposes)
 */
export function updateValidationConfig(
  type: "mindmap" | "flashcard",
  updates: Partial<typeof VALIDATION_CONFIG.mindmap | typeof VALIDATION_CONFIG.flashcard>
) {
  Object.assign(VALIDATION_CONFIG[type], updates);
}
