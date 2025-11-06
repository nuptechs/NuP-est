/**
 * Markdown Outline Extraction Strategy
 * 
 * Extracts hierarchical structure from Markdown/TXT files
 * Detects # headings and organizes them into a tree
 */

import type { DocumentOutline, DocumentOutlineNode } from '@shared/schema';
import crypto from 'crypto';

export function extractMarkdownOutline(content: string): DocumentOutline {
  const lines = content.split('\n');
  const structure: DocumentOutlineNode[] = [];
  const stack: Array<{ node: DocumentOutlineNode; level: number }> = [];
  
  let currentOffset = 0;
  let totalSections = 0;
  let maxDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      // Calculate offset (approximate - sum of previous lines)
      const startOffset = currentOffset;
      
      // Create node
      const node: DocumentOutlineNode = {
        id: crypto.randomUUID(),
        level,
        title,
        startOffset,
        endOffset: undefined, // Will be set when next section starts
        wordCount: 0,
        estimatedFlashcards: 0,
        children: []
      };
      
      // Update previous node's endOffset
      if (stack.length > 0) {
        const prev = stack[stack.length - 1];
        if (prev.node.endOffset === undefined) {
          prev.node.endOffset = startOffset;
          prev.node.wordCount = Math.floor((startOffset - (prev.node.startOffset || 0)) / 5);
          prev.node.estimatedFlashcards = Math.ceil((prev.node.wordCount || 0) / 100);
        }
      }
      
      // Build hierarchy
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        const popped = stack.pop();
        if (popped && popped.node.endOffset === undefined) {
          popped.node.endOffset = startOffset;
          popped.node.wordCount = Math.floor((startOffset - (popped.node.startOffset || 0)) / 5);
          popped.node.estimatedFlashcards = Math.ceil((popped.node.wordCount || 0) / 100);
        }
      }
      
      if (stack.length === 0) {
        // Top-level node
        structure.push(node);
      } else {
        // Child node
        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
      
      stack.push({ node, level });
      totalSections++;
      maxDepth = Math.max(maxDepth, level);
    }
    
    currentOffset += line.length + 1; // +1 for newline
  }
  
  // Close remaining nodes
  for (const item of stack) {
    if (item.node.endOffset === undefined) {
      item.node.endOffset = content.length;
      item.node.wordCount = Math.floor((content.length - (item.node.startOffset || 0)) / 5);
      item.node.estimatedFlashcards = Math.ceil((item.node.wordCount || 0) / 100);
    }
  }
  
  return {
    version: '1.0',
    extractedAt: new Date().toISOString(),
    extractionMethod: 'headings',
    structure,
    metadata: {
      totalSections,
      maxDepth,
      hasTOC: false,
      estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200) // 200 words/min
    }
  };
}
