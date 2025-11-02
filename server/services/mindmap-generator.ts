/**
 * Mind Map Generator Service
 * FASE 3: Flashcards → Mind Map conversion
 * 
 * Aggregates flashcards into intelligent mind maps with AI-enhanced structure
 * Now includes:
 * - Pre-generation validation layer for quality assurance
 * - Adaptive AI based on user profile (TDAH, learning difficulties, objectives)
 * - Rich content with detailed descriptions in leaf nodes
 * - Adaptive colors and visual elements for better memorization
 */

import OpenAI from "openai";
import { validateFlashcardsForMindMap } from "./content-validator";
import { StudyContextBuilder } from "./adaptive-learning/StudyContextBuilder";
import type { IStorage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Flashcard {
  id: string;
  front: string;
  back: string;
  contentType?: string;
}

interface MindMapNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    level: number;
    type: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };
}

interface MindMapEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
}

interface GeneratedMindMap {
  nodes: MindMapNodeData[];
  edges: MindMapEdgeData[];
  layout: string;
  styleSheetId: string | null;
}

/**
 * Generate mind map from flashcards with adaptive AI
 */
export async function generateMindMapFromFlashcards(
  flashcards: Flashcard[],
  options: {
    title: string;
    useAI?: boolean;
    layout?: "horizontal" | "vertical" | "radial";
    userId?: string;
    subjectId?: string;
    storage?: IStorage;
  }
): Promise<GeneratedMindMap> {
  const { title, useAI = true, layout = "horizontal", userId, subjectId, storage } = options;

  // 🔍 VALIDATION LAYER: Check content quality before AI processing
  console.log("🔍 Validating flashcards content before generating mind map...");
  const validation = validateFlashcardsForMindMap(flashcards);
  
  if (!validation.isValid) {
    console.error("❌ Validation failed:", validation.error);
    console.error("📊 Metrics:", validation.metrics);
    throw new Error(`${validation.error}: ${validation.details}`);
  }
  
  console.log("✅ Validation passed. Content metrics:", validation.metrics);

  if (useAI) {
    try {
      // Load user context if available for adaptive generation
      let studyContext = null;
      if (userId && storage) {
        try {
          const contextBuilder = new StudyContextBuilder(storage);
          studyContext = await contextBuilder.build(userId, { subjectId, includeRAG: false });
          console.log("📚 Loaded study context for adaptive mind map generation");
        } catch (error) {
          console.warn("⚠️ Could not load study context, using default generation:", error);
        }
      }

      return await generateAIMindMap(flashcards, title, layout, studyContext);
    } catch (error) {
      console.error("AI generation failed, falling back to basic structure:", error);
    }
  }

  // Fallback: Generate basic hierarchical structure
  return generateBasicMindMap(flashcards, title, layout);
}

/**
 * Build adaptive instructions based on user profile and learning difficulties
 */
function buildAdaptiveInstructions(studyContext: any): string {
  if (!studyContext) {
    return "Create a clear, well-organized mind map optimized for learning and retention.";
  }

  const instructions: string[] = [];
  
  // Extract learning difficulties
  const difficulties = studyContext.difficulties || [];
  const hasADHD = difficulties.some((d: any) => 
    d.category === 'adhd' || d.difficultyName?.toLowerCase().includes('tdah') || d.difficultyName?.toLowerCase().includes('adhd')
  );
  const hasDyslexia = difficulties.some((d: any) => 
    d.category === 'dyslexia' || d.difficultyName?.toLowerCase().includes('dislexia')
  );
  const hasMemoryIssues = difficulties.some((d: any) => 
    d.category === 'memory' || d.difficultyName?.toLowerCase().includes('memória')
  );

  // Base instruction
  instructions.push("ADAPTIVE LEARNING PROFILE:");
  
  // ADHD adaptations
  if (hasADHD) {
    instructions.push(
      "- ADHD Support: Use vibrant, high-contrast colors to maintain attention",
      "- Break complex concepts into smaller, digestible chunks",
      "- Include visual cues and symbols for better engagement",
      "- Add mnemonic devices (acronyms, rhymes, associations) in descriptions",
      "- Keep text concise but informative - avoid long paragraphs"
    );
  }

  // Dyslexia adaptations
  if (hasDyslexia) {
    instructions.push(
      "- Dyslexia Support: Use clear, simple language",
      "- Avoid similar-looking words close together",
      "- Include visual metaphors and analogies in descriptions",
      "- Use bullet points for key information"
    );
  }

  // Memory adaptations
  if (hasMemoryIssues) {
    instructions.push(
      "- Memory Support: Include strong mnemonic devices",
      "- Create memorable associations and examples",
      "- Use storytelling techniques in descriptions",
      "- Add practical, real-world examples to aid retention"
    );
  }

  // General profile adaptations
  const motivationLevel = parseFloat(studyContext.profile?.motivationLevel || "0.5");
  if (motivationLevel < 0.4) {
    instructions.push(
      "- Add encouraging language and emphasize practical benefits",
      "- Highlight real-world applications to boost motivation"
    );
  }

  // Learning style preferences
  const preferredTypes = studyContext.profile?.preferredContentTypes || [];
  if (preferredTypes.includes('visual')) {
    instructions.push("- Emphasize visual organization and spatial relationships");
  }
  if (preferredTypes.includes('practical')) {
    instructions.push("- Include hands-on examples and practical applications");
  }

  // If no specific difficulties, use general best practices
  if (difficulties.length === 0) {
    instructions.push(
      "- Use a balanced color scheme for visual appeal",
      "- Include practical examples in leaf node descriptions",
      "- Structure information hierarchically for easy understanding"
    );
  }

  return instructions.join("\n");
}

async function generateAIMindMap(
  flashcards: Flashcard[],
  title: string,
  layout: string,
  studyContext?: any
): Promise<GeneratedMindMap> {
  // Prepare flashcard content for AI
  const flashcardContent = flashcards
    .map((fc, idx) => `${idx + 1}. Q: ${fc.front}\n   A: ${fc.back}`)
    .join("\n\n");

  // Build adaptive instructions based on user profile
  let adaptiveInstructions = buildAdaptiveInstructions(studyContext);

  const prompt = `Create an intelligent, adaptive mind map from these flashcards.

Title: ${title}

Flashcards:
${flashcardContent}

${adaptiveInstructions}

STRUCTURE REQUIREMENTS:
1. A clear central topic (root node with title)
2. 3-7 main category branches (level 1)
3. Sub-branches with specific concepts (level 2-3)
4. **LEAF NODES MUST HAVE DETAILED DESCRIPTIONS** - Include summaries, examples, or key points (2-4 sentences)

CONTENT QUALITY:
- Root and branch nodes: Short, clear titles
- Leaf nodes (final concepts): Title + detailed description/summary
- Use mnemonic devices when helpful
- Include practical examples in descriptions

Return JSON in this format:
{
  "rootLabel": "Main Topic",
  "rootDescription": "Brief overview of the topic",
  "branches": [
    {
      "label": "Category 1",
      "description": "Category summary",
      "children": [
        {
          "label": "Concept 1.1",
          "description": "DETAILED: Explain this concept with examples, key points, and practical applications. 2-4 sentences minimum."
        }
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert at organizing knowledge into clear, hierarchical mind maps. Return ONLY valid JSON, no markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  let responseText = completion.choices[0].message.content || "{}";
  
  // Clean up potential markdown code blocks
  responseText = responseText.trim();
  if (responseText.startsWith("```json")) {
    responseText = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (responseText.startsWith("```")) {
    responseText = responseText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  
  // Log the response for debugging
  console.log("📝 AI Response length:", responseText.length);
  
  let structure;
  try {
    structure = JSON.parse(responseText);
  } catch (parseError) {
    console.error("❌ JSON Parse Error:", parseError);
    console.error("📄 First 500 chars of response:", responseText.substring(0, 500));
    console.error("📄 Last 500 chars of response:", responseText.substring(Math.max(0, responseText.length - 500)));
    throw parseError;
  }

  // Convert AI structure to nodes and edges
  return buildMindMapFromStructure(structure, layout, studyContext);
}

/**
 * Get adaptive color palette based on user profile
 */
function getAdaptiveColorPalette(studyContext?: any): Array<{bg: string, text: string, border: string}> {
  const difficulties = studyContext?.difficulties || [];
  const hasADHD = difficulties.some((d: any) => 
    d.category === 'adhd' || d.difficultyName?.toLowerCase().includes('tdah') || d.difficultyName?.toLowerCase().includes('adhd')
  );

  if (hasADHD) {
    // Vibrant, high-contrast colors for ADHD
    return [
      { bg: "#3b82f6", text: "#ffffff", border: "#1e40af" }, // Bright blue
      { bg: "#f59e0b", text: "#ffffff", border: "#d97706" }, // Bright amber
      { bg: "#10b981", text: "#ffffff", border: "#059669" }, // Bright green
      { bg: "#ef4444", text: "#ffffff", border: "#dc2626" }, // Bright red
      { bg: "#8b5cf6", text: "#ffffff", border: "#7c3aed" }, // Bright purple
      { bg: "#ec4899", text: "#ffffff", border: "#db2777" }, // Bright pink
      { bg: "#06b6d4", text: "#ffffff", border: "#0891b2" }, // Bright cyan
    ];
  }

  // Default balanced colors
  return [
    { bg: "#3b82f6", text: "#ffffff", border: "#2563eb" }, // Blue
    { bg: "#8b5cf6", text: "#ffffff", border: "#7c3aed" }, // Purple
    { bg: "#ec4899", text: "#ffffff", border: "#db2777" }, // Pink
    { bg: "#f59e0b", text: "#ffffff", border: "#d97706" }, // Amber
  ];
}

function buildMindMapFromStructure(
  structure: any,
  layout: string,
  studyContext?: any
): GeneratedMindMap {
  const nodes: MindMapNodeData[] = [];
  const edges: MindMapEdgeData[] = [];
  let nodeIdCounter = 0;

  // Root node
  const rootId = `node-${nodeIdCounter++}`;
  nodes.push({
    id: rootId,
    type: "mindMapNode",
    position: { x: 400, y: 300 },
    data: {
      label: structure.rootLabel || "Central Topic",
      description: structure.rootDescription || "",
      level: 0,
      type: "root",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
      borderColor: "#2563eb",
    },
  });

  // Adaptive color palette based on user profile
  const levelColors = getAdaptiveColorPalette(studyContext);

  // Process branches
  (structure.branches || []).forEach((branch: any, branchIdx: number) => {
    const branchId = `node-${nodeIdCounter++}`;
    const angle = (branchIdx / (structure.branches.length || 1)) * 2 * Math.PI;
    const radius = 200;

    nodes.push({
      id: branchId,
      type: "mindMapNode",
      position: {
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
      },
      data: {
        label: branch.label,
        description: branch.description || "",
        level: 1,
        type: "branch",
        ...levelColors[1],
      },
    });

    edges.push({
      id: `edge-${rootId}-${branchId}`,
      source: rootId,
      target: branchId,
      type: "smoothstep",
      animated: false,
    });

    // Process children
    (branch.children || []).forEach((child: any, childIdx: number) => {
      const childId = `node-${nodeIdCounter++}`;
      const childAngle = angle + ((childIdx - (branch.children.length - 1) / 2) * 0.3);
      const childRadius = 350;

      nodes.push({
        id: childId,
        type: "mindMapNode",
        position: {
          x: 400 + Math.cos(childAngle) * childRadius,
          y: 300 + Math.sin(childAngle) * childRadius,
        },
        data: {
          label: child.label,
          description: child.description || "",
          level: 2,
          type: "leaf",
          ...levelColors[2],
        },
      });

      edges.push({
        id: `edge-${branchId}-${childId}`,
        source: branchId,
        target: childId,
        type: "smoothstep",
        animated: false,
      });
    });
  });

  return {
    nodes,
    edges,
    layout,
    styleSheetId: null,
  };
}

function generateBasicMindMap(
  flashcards: Flashcard[],
  title: string,
  layout: string
): GeneratedMindMap {
  const nodes: MindMapNodeData[] = [];
  const edges: MindMapEdgeData[] = [];

  // Root node
  const rootId = "node-0";
  nodes.push({
    id: rootId,
    type: "mindMapNode",
    position: { x: 400, y: 300 },
    data: {
      label: title,
      description: `${flashcards.length} flashcards`,
      level: 0,
      type: "root",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
      borderColor: "#2563eb",
    },
  });

  // Create nodes from flashcards (limit to first 12 for clarity)
  const limitedCards = flashcards.slice(0, 12);
  limitedCards.forEach((card, idx) => {
    const nodeId = `node-${idx + 1}`;
    const angle = (idx / limitedCards.length) * 2 * Math.PI;
    const radius = 250;

    // Extract concept from question (remove question marks, "O que é", etc.)
    const concept = card.front
      .replace(/O que (é|são|foi|foram)/gi, "")
      .replace(/\?/g, "")
      .trim()
      .substring(0, 50);

    nodes.push({
      id: nodeId,
      type: "mindMapNode",
      position: {
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
      },
      data: {
        label: concept || `Conceito ${idx + 1}`,
        description: card.back.substring(0, 100) + (card.back.length > 100 ? "..." : ""),
        level: 1,
        type: "branch",
        backgroundColor: "#8b5cf6",
        textColor: "#ffffff",
        borderColor: "#7c3aed",
      },
    });

    edges.push({
      id: `edge-${rootId}-${nodeId}`,
      source: rootId,
      target: nodeId,
      type: "smoothstep",
      animated: false,
    });
  });

  return {
    nodes,
    edges,
    layout,
    styleSheetId: null,
  };
}
