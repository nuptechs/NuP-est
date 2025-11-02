/**
 * Mind Map Generator Service
 * FASE 3: Flashcards → Mind Map conversion
 * 
 * Aggregates flashcards into intelligent mind maps with AI-enhanced structure
 * Now includes pre-generation validation layer for quality assurance
 */

import OpenAI from "openai";
import { validateFlashcardsForMindMap } from "./content-validator";

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
 * Generate mind map from flashcards
 */
export async function generateMindMapFromFlashcards(
  flashcards: Flashcard[],
  options: {
    title: string;
    useAI?: boolean;
    layout?: "horizontal" | "vertical" | "radial";
  }
): Promise<GeneratedMindMap> {
  const { title, useAI = true, layout = "horizontal" } = options;

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
      return await generateAIMindMap(flashcards, title, layout);
    } catch (error) {
      console.error("AI generation failed, falling back to basic structure:", error);
    }
  }

  // Fallback: Generate basic hierarchical structure
  return generateBasicMindMap(flashcards, title, layout);
}

async function generateAIMindMap(
  flashcards: Flashcard[],
  title: string,
  layout: string
): Promise<GeneratedMindMap> {
  // Prepare flashcard content for AI
  const flashcardContent = flashcards
    .map((fc, idx) => `${idx + 1}. Q: ${fc.front}\n   A: ${fc.back}`)
    .join("\n\n");

  const prompt = `Create a mind map structure from these flashcards:

Title: ${title}

Flashcards:
${flashcardContent}

Generate a hierarchical mind map with:
1. A central topic (root node)
2. 3-7 main branches (level 1 categories)
3. Sub-branches for specific concepts (level 2-3)

Return JSON in this format:
{
  "rootLabel": "Main Topic",
  "branches": [
    {
      "label": "Category 1",
      "description": "Brief description",
      "children": [
        { "label": "Subconcept 1.1", "description": "Details" },
        { "label": "Subconcept 1.2", "description": "Details" }
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
  return buildMindMapFromStructure(structure, layout);
}

function buildMindMapFromStructure(
  structure: any,
  layout: string
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

  // Color palette for levels
  const levelColors = [
    { bg: "#3b82f6", text: "#ffffff", border: "#2563eb" }, // Root - blue
    { bg: "#8b5cf6", text: "#ffffff", border: "#7c3aed" }, // Level 1 - purple
    { bg: "#ec4899", text: "#ffffff", border: "#db2777" }, // Level 2 - pink
    { bg: "#f59e0b", text: "#ffffff", border: "#d97706" }, // Level 3 - amber
  ];

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
