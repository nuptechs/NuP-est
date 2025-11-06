/**
 * AI Outline Extraction Strategy (Fallback)
 * 
 * Uses GPT-4o-mini to extract document structure when no clear headings exist
 * This is a fallback for unstructured documents
 */

import type { DocumentOutline, DocumentOutlineNode } from '@shared/schema';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractWithAI(content: string): Promise<DocumentOutline> {
  console.log('[AIStrategy] Extracting outline with AI...');
  
  // Limit content size for API (max ~6000 chars for analysis)
  const contentSample = content.length > 6000 
    ? content.substring(0, 6000) + '\n\n[...documento continua...]'
    : content;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em análise de documentos. Sua tarefa é extrair a estrutura hierárquica (sumário) de um documento.

INSTRUÇÕES:
1. Identifique os principais tópicos, capítulos, seções e subseções
2. Organize em uma hierarquia de níveis (1 = capítulo, 2 = seção, 3 = subseção)
3. Retorne APENAS um JSON válido no formato especificado
4. Se o documento não tiver estrutura clara, divida em seções lógicas

FORMATO DE SAÍDA (JSON):
{
  "sections": [
    {"level": 1, "title": "Introdução"},
    {"level": 2, "title": "Contexto Histórico"},
    {"level": 2, "title": "Objetivos"},
    {"level": 1, "title": "Desenvolvimento"},
    {"level": 2, "title": "Metodologia"}
  ]
}

Retorne APENAS o JSON, sem texto adicional.`
        },
        {
          role: 'user',
          content: `Analise este documento e extraia sua estrutura:\n\n${contentSample}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });
    
    const responseText = response.choices[0]?.message?.content || '{}';
    
    // Parse AI response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid AI response format');
    }
    
    // Convert to DocumentOutlineNode structure
    const structure = buildHierarchy(parsed.sections, content);
    
    console.log('[AIStrategy] ✅ Extracted', structure.length, 'top-level sections');
    
    return {
      version: '1.0',
      extractedAt: new Date().toISOString(),
      extractionMethod: 'ai',
      structure,
      metadata: {
        totalSections: countNodes(structure),
        maxDepth: getMaxDepth(structure),
        hasTOC: false,
        estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200)
      }
    };
    
  } catch (error) {
    console.error('[AIStrategy] Error extracting with AI:', error);
    
    // Ultimate fallback: single section
    return {
      version: '1.0',
      extractedAt: new Date().toISOString(),
      extractionMethod: 'manual',
      structure: [{
        id: crypto.randomUUID(),
        level: 1,
        title: 'Documento Completo',
        startOffset: 0,
        endOffset: content.length,
        wordCount: content.split(/\s+/).length,
        estimatedFlashcards: Math.ceil(content.split(/\s+/).length / 100)
      }],
      metadata: {
        totalSections: 1,
        maxDepth: 1,
        hasTOC: false,
        estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200)
      }
    };
  }
}

/**
 * Build hierarchical tree from flat list of sections
 */
function buildHierarchy(
  sections: Array<{ level: number; title: string }>,
  fullContent: string
): DocumentOutlineNode[] {
  const root: DocumentOutlineNode[] = [];
  const stack: Array<{ node: DocumentOutlineNode; level: number }> = [];
  
  const contentLength = fullContent.length;
  const sectionSize = Math.floor(contentLength / (sections.length || 1));
  
  sections.forEach((section, index) => {
    const startOffset = index * sectionSize;
    const endOffset = index === sections.length - 1 ? contentLength : (index + 1) * sectionSize;
    const wordCount = Math.floor((endOffset - startOffset) / 5);
    
    const node: DocumentOutlineNode = {
      id: crypto.randomUUID(),
      level: section.level,
      title: section.title,
      startOffset,
      endOffset,
      wordCount,
      estimatedFlashcards: Math.ceil(wordCount / 100),
      children: []
    };
    
    // Build hierarchy
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    }
    
    stack.push({ node, level: section.level });
  });
  
  return root;
}

function countNodes(nodes: DocumentOutlineNode[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

function getMaxDepth(nodes: DocumentOutlineNode[], currentDepth = 1): number {
  let maxDepth = currentDepth;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      maxDepth = Math.max(maxDepth, getMaxDepth(node.children, currentDepth + 1));
    }
  }
  return maxDepth;
}
