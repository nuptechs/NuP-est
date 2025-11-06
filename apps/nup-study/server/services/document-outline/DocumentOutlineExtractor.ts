/**
 * Document Outline Extractor
 * 
 * Extracts hierarchical structure (table of contents) from documents
 * Supports multiple extraction strategies with AI fallback
 * 
 * Uses existing processedFiles deduplication - outline extracted once, shared by all users
 */

import { db } from '../../db.js';
import { processedFiles } from '@shared/schema';
import type { DocumentOutline, DocumentOutlineNode } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractMarkdownOutline } from './strategies/MarkdownStrategy';
import { extractWithAI } from './strategies/AIStrategy';

export class DocumentOutlineExtractor {
  
  /**
   * Get or extract outline from processedFile
   * Uses cache (documentOutline field) to avoid re-processing
   */
  async getOrExtractOutline(processedFileId: string): Promise<DocumentOutline> {
    console.log('[DocumentOutline] Getting outline for processedFile:', processedFileId);
    
    const processedFile = await db.query.processedFiles.findFirst({
      where: eq(processedFiles.id, processedFileId)
    });
    
    if (!processedFile) {
      throw new Error(`ProcessedFile ${processedFileId} not found`);
    }
    
    // Cache hit: outline already exists
    if (processedFile.documentOutline) {
      console.log('[DocumentOutline] ✅ Using cached outline');
      return processedFile.documentOutline;
    }
    
    // Cache miss: extract and save
    console.log('[DocumentOutline] 📝 Extracting new outline...');
    const outline = await this.extractOutline(
      processedFile.fileType,
      processedFile.extractedContent || '',
      processedFile.filePath
    );
    
    // Save to database (shared for all users of this file)
    await db
      .update(processedFiles)
      .set({
        documentOutline: outline,
        outlineGeneratedAt: new Date()
      })
      .where(eq(processedFiles.id, processedFileId));
    
    console.log('[DocumentOutline] ✅ Outline extracted and cached');
    console.log('[DocumentOutline] Sections found:', outline.structure.length);
    
    return outline;
  }
  
  /**
   * Extract outline using appropriate strategy based on file type
   */
  private async extractOutline(
    fileType: string,
    extractedContent: string,
    filePath: string
  ): Promise<DocumentOutline> {
    
    // STRATEGY 1: Markdown/Text with headings
    if (fileType === 'text' || extractedContent.includes('#')) {
      const markdownOutline = extractMarkdownOutline(extractedContent);
      if (markdownOutline.structure.length > 0) {
        console.log('[DocumentOutline] Used Markdown strategy');
        return markdownOutline;
      }
    }
    
    // STRATEGY 2: PDF with TOC (future)
    // if (fileType === 'pdf') {
    //   const pdfOutline = await extractPDFTOC(filePath);
    //   if (pdfOutline) return pdfOutline;
    // }
    
    // STRATEGY 3: DOCX with heading styles (future)
    // if (fileType === 'document') {
    //   const docxOutline = await extractDOCXHeadings(filePath);
    //   if (docxOutline) return docxOutline;
    // }
    
    // STRATEGY 4: AI Fallback (GPT-4o-mini)
    console.log('[DocumentOutline] Using AI fallback strategy');
    return await extractWithAI(extractedContent);
  }
  
  /**
   * Get content from selected sections
   * Extracts text based on startOffset/endOffset
   */
  async getContentBySelections(
    processedFileId: string,
    selectedSectionIds: string[]
  ): Promise<string> {
    const processedFile = await db.query.processedFiles.findFirst({
      where: eq(processedFiles.id, processedFileId)
    });
    
    if (!processedFile) {
      throw new Error(`ProcessedFile ${processedFileId} not found`);
    }
    
    const outline = processedFile.documentOutline;
    if (!outline) {
      throw new Error('Document outline not available');
    }
    
    const fullContent = processedFile.extractedContent || '';
    
    // Find selected nodes (including their children recursively)
    const selectedNodes = this.findNodesByIds(outline.structure, selectedSectionIds);
    
    // Extract text for each selected section
    let combinedContent = '';
    for (const node of selectedNodes) {
      if (node.startOffset !== undefined && node.endOffset !== undefined) {
        const sectionText = fullContent.substring(node.startOffset, node.endOffset);
        combinedContent += `\n\n## ${node.title}\n\n${sectionText}`;
      }
    }
    
    return combinedContent.trim();
  }
  
  /**
   * Find nodes by IDs (recursive, includes children)
   */
  private findNodesByIds(
    nodes: DocumentOutlineNode[],
    selectedIds: string[]
  ): DocumentOutlineNode[] {
    const result: DocumentOutlineNode[] = [];
    const selectedSet = new Set(selectedIds);
    
    const traverse = (node: DocumentOutlineNode) => {
      if (selectedSet.has(node.id)) {
        result.push(node);
        // If parent is selected, include all children
        if (node.children) {
          node.children.forEach(traverse);
        }
      } else if (node.children) {
        // Check children even if parent not selected
        node.children.forEach(traverse);
      }
    };
    
    nodes.forEach(traverse);
    return result;
  }
  
  /**
   * Calculate flat list of all nodes (for UI rendering)
   */
  flattenOutline(outline: DocumentOutline): DocumentOutlineNode[] {
    const result: DocumentOutlineNode[] = [];
    
    const traverse = (node: DocumentOutlineNode) => {
      result.push(node);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    outline.structure.forEach(traverse);
    return result;
  }
}

export const documentOutlineExtractor = new DocumentOutlineExtractor();
