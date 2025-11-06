/**
 * Flashcard Generator Service
 * FASE 3: Mind Map → Flashcards conversion
 * 
 * Converts mind map nodes into intelligent flashcards with AI-enhanced questions
 * Now includes pre-generation validation layer for quality assurance
 */

import OpenAI from "openai";
import { validateMindMapForFlashcards } from "./content-validator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MindMapNode {
  id: string;
  data: {
    label: string;
    description?: string;
    level?: number;
    type?: string;
  };
}

interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

interface GeneratedFlashcard {
  front: string;
  back: string;
  contentType: "markdown";
  order: number;
}

/**
 * Generate flashcards from mind map structure
 */
export async function generateFlashcardsFromMindMap(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: {
    maxCards?: number;
    difficulty?: "easy" | "medium" | "hard";
    includeContext?: boolean;
  } = {}
): Promise<GeneratedFlashcard[]> {
  const { maxCards = 20, difficulty = "medium", includeContext = true } = options;

  // 🔍 VALIDATION LAYER: Check content quality before AI processing
  console.log("🔍 Validating mind map content before generating flashcards...");
  const validation = validateMindMapForFlashcards(nodes, edges);
  
  if (!validation.isValid) {
    console.error("❌ Validation failed:", validation.error);
    console.error("📊 Metrics:", validation.metrics);
    throw new Error(`${validation.error}: ${validation.details}`);
  }
  
  console.log("✅ Validation passed. Content metrics:", validation.metrics);

  // Build hierarchy map
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  
  edges.forEach(edge => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  });

  // Find root node (node with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target));
  const rootNode = nodes.find(n => !targetIds.has(n.id));

  if (!rootNode) {
    throw new Error("No root node found in mind map");
  }

  // Generate flashcards using AI
  const prompt = buildPrompt(nodes, edges, rootNode, childrenMap, difficulty, includeContext);
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educator creating study flashcards from mind maps. Generate clear, pedagogical flashcards that help students learn effectively."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = completion.choices[0].message.content || "";
    const flashcards = parseFlashcardsFromResponse(responseText);

    // Limit to maxCards
    return flashcards.slice(0, maxCards);
  } catch (error) {
    console.error("Error generating flashcards:", error);
    
    // Fallback: Generate basic flashcards without AI
    return generateBasicFlashcards(nodes, edges, childrenMap, maxCards);
  }
}

function buildPrompt(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  rootNode: MindMapNode,
  childrenMap: Map<string, string[]>,
  difficulty: string,
  includeContext: boolean
): string {
  const nodeList = nodes.map(n => {
    const children = childrenMap.get(n.id) || [];
    const childLabels = children.map(childId => {
      const child = nodes.find(n => n.id === childId);
      return child?.data.label || "";
    }).filter(Boolean);

    return `- ${n.data.label}${childLabels.length > 0 ? ` (subtopics: ${childLabels.join(", ")})` : ""}`;
  }).join("\n");

  return `Generate study flashcards from this mind map structure:

Topic: ${rootNode.data.label}

Mind Map Structure:
${nodeList}

Requirements:
- Difficulty level: ${difficulty}
- ${includeContext ? "Include context and hierarchical relationships" : "Focus on core concepts"}
- Create questions that test understanding, not just memorization
- Use clear, concise language
- Format each flashcard as:
  FRONT: [question]
  BACK: [answer]
  ---

Generate 15-20 high-quality flashcards that cover the main concepts and their relationships.`;
}

function parseFlashcardsFromResponse(responseText: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = [];
  const cards = responseText.split("---").map(s => s.trim()).filter(Boolean);

  cards.forEach((card, index) => {
    const frontMatch = card.match(/FRONT:\s*([\s\S]+?)(?=BACK:|$)/);
    const backMatch = card.match(/BACK:\s*([\s\S]+?)$/);

    if (frontMatch && backMatch) {
      flashcards.push({
        front: frontMatch[1].trim(),
        back: backMatch[1].trim(),
        contentType: "markdown",
        order: index,
      });
    }
  });

  return flashcards;
}

function generateBasicFlashcards(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  childrenMap: Map<string, string[]>,
  maxCards: number
): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = [];

  // Generate simple definition flashcards for each node
  nodes.forEach((node, index) => {
    if (flashcards.length >= maxCards) return;

    const children = childrenMap.get(node.id) || [];
    const childLabels = children.map(childId => {
      const child = nodes.find(n => n.id === childId);
      return child?.data.label || "";
    }).filter(Boolean);

    const front = `O que é ${node.data.label}?`;
    const back = node.data.description || 
      (childLabels.length > 0 
        ? `${node.data.label} inclui:\n${childLabels.map(l => `- ${l}`).join("\n")}`
        : `Conceito relacionado a ${node.data.label}`);

    flashcards.push({
      front,
      back,
      contentType: "markdown",
      order: index,
    });
  });

  return flashcards;
}

/**
 * Generate flashcards from material content
 */
export async function generateFlashcardsFromContent(
  content: string,
  options: {
    maxCards?: number;
    difficulty?: "easy" | "medium" | "hard";
    materialTitle?: string;
    userId?: string;
    storage?: any;
  } = {}
): Promise<GeneratedFlashcard[]> {
  const { maxCards = 15, difficulty = "medium", materialTitle = "Material de Estudo" } = options;

  if (!content || content.trim().length < 50) {
    throw new Error("Content is too short to generate flashcards");
  }

  // Truncate content if too long (keep first 10000 chars for AI processing)
  const truncatedContent = content.length > 10000 
    ? content.substring(0, 10000) + "\n\n[...conteúdo truncado...]"
    : content;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um professor especialista em criar flashcards pedagógicos eficazes. Crie flashcards que:
- Testem compreensão, não apenas memorização
- Sejam claros e concisos
- Cubram os conceitos mais importantes
- Usem linguagem apropriada ao nível de dificuldade solicitado`
        },
        {
          role: "user",
          content: `Gere ${maxCards} flashcards a partir deste material de estudo.

Material: ${materialTitle}

Conteúdo:
${truncatedContent}

Nível de dificuldade: ${difficulty}
- easy: Conceitos básicos e definições diretas
- medium: Compreensão e relações entre conceitos
- hard: Análise, aplicação e pensamento crítico

Formato de saída (exatamente assim):
FRONT: [pergunta ou conceito a ser testado]
BACK: [resposta detalhada]
---
FRONT: [próxima pergunta]
BACK: [próxima resposta]
---

Gere exatamente ${maxCards} flashcards de alta qualidade.`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = completion.choices[0].message.content || "";
    const flashcards = parseFlashcardsFromResponse(responseText);

    if (flashcards.length === 0) {
      throw new Error("No flashcards were generated from the response");
    }

    console.log(`[FlashcardGenerator] Generated ${flashcards.length} flashcards from content`);
    
    return flashcards.slice(0, maxCards);
  } catch (error) {
    console.error("Error generating flashcards from content:", error);
    throw error;
  }
}

/**
 * Extract content from selected sections based on outline
 */
export function extractContentFromSections(
  fullContent: string,
  outlineStructure: any[],
  selectedSectionIds: string[]
): string {
  const selectedSectionsSet = new Set(selectedSectionIds);
  const extractedParts: string[] = [];

  function traverseAndExtract(nodes: any[]) {
    for (const node of nodes) {
      if (selectedSectionsSet.has(node.id)) {
        // Extract content for this section
        const start = node.startOffset || 0;
        const end = node.endOffset || fullContent.length;
        
        if (start < fullContent.length) {
          const sectionContent = fullContent.substring(start, Math.min(end, fullContent.length));
          extractedParts.push(`\n## ${node.title}\n\n${sectionContent.trim()}`);
        }
      }
      
      // Recursively process children
      if (node.children && node.children.length > 0) {
        traverseAndExtract(node.children);
      }
    }
  }

  traverseAndExtract(outlineStructure);

  return extractedParts.join('\n\n');
}

/**
 * Suggest best content type for flashcard based on content analysis
 */
export async function suggestContentType(
  front: string,
  back: string
): Promise<"markdown" | "mindmap" | "diagram" | "table"> {
  // Quick heuristics
  if (back.includes("|") && back.split("\n").length > 2) {
    return "table";
  }

  if (back.length > 500 && (back.includes("•") || back.includes("-") || back.includes("1."))) {
    return "mindmap";
  }

  // Use AI for complex analysis
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analyze flashcard content and suggest the best format: markdown (default), mindmap (hierarchical/complex), diagram (process/flow), or table (comparative data)."
        },
        {
          role: "user",
          content: `Front: ${front}\nBack: ${back}\n\nBest format?`
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const response = completion.choices[0].message.content?.toLowerCase() || "markdown";
    
    if (response.includes("mindmap") || response.includes("mapa mental")) return "mindmap";
    if (response.includes("diagram") || response.includes("diagrama")) return "diagram";
    if (response.includes("table") || response.includes("tabela")) return "table";
    
    return "markdown";
  } catch (error) {
    console.error("Error suggesting content type:", error);
    return "markdown";
  }
}
