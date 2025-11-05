/**
 * INTELLIGENT DOCUMENT SPLITTER
 * 
 * Creates a plan to split large documents into parts while respecting
 * conceptual boundaries (chapters, sections). Ensures we don't break
 * concepts in the middle.
 */

import type {
  IIntelligentDocumentSplitter,
  DocumentStructure,
  DocumentSection,
  SplitPlan,
  DocumentPart,
} from './types';

export class IntelligentDocumentSplitter implements IIntelligentDocumentSplitter {
  /**
   * Creates an intelligent split plan that respects concept boundaries
   */
  createSplitPlan(structure: DocumentStructure, maxPagesPerPart: number = 250): SplitPlan {
    console.log(`[IntelligentSplitter] 📐 Criando plano de divisão (máx ${maxPagesPerPart} páginas/parte)`);

    // Group sections into parts
    const parts: DocumentPart[] = [];
    let currentPart: {
      sections: DocumentSection[];
      startPage: number;
      endPage: number;
      pageCount: number;
    } | null = null;

    for (const section of structure.sections) {
      if (!currentPart) {
        // Start new part
        currentPart = {
          sections: [section],
          startPage: section.startPage,
          endPage: section.endPage,
          pageCount: section.pageCount,
        };
      } else {
        // Check if we can add this section to current part
        const wouldExceedLimit = (currentPart.pageCount + section.pageCount) > maxPagesPerPart;
        
        if (wouldExceedLimit && currentPart.sections.length > 0) {
          // Finalize current part and start a new one
          parts.push(this.createPartFromSections(currentPart.sections, parts.length + 1));
          
          currentPart = {
            sections: [section],
            startPage: section.startPage,
            endPage: section.endPage,
            pageCount: section.pageCount,
          };
        } else {
          // Add section to current part
          currentPart.sections.push(section);
          currentPart.endPage = section.endPage;
          currentPart.pageCount += section.pageCount;
        }
      }
    }

    // Add last part
    if (currentPart && currentPart.sections.length > 0) {
      parts.push(this.createPartFromSections(currentPart.sections, parts.length + 1));
    }

    // If no parts created (shouldn't happen), create a single part
    if (parts.length === 0) {
      parts.push({
        partNumber: 1,
        title: `Parte 1: ${structure.title}`,
        startPage: 1,
        endPage: structure.totalPages,
        startIndex: 0,
        endIndex: structure.estimatedSizeBytes,
        sections: structure.sections.map(s => s.title),
        estimatedSizeBytes: structure.estimatedSizeBytes,
      });
    }

    // Calculate estimated processing time
    // Rough estimate: ~1 second per page for semantic analysis
    const estimatedProcessingTime = Math.ceil(structure.totalPages * 1.2);

    const plan: SplitPlan = {
      totalParts: parts.length,
      parts,
      strategy: parts.length === 1 ? 'page-based' : 'conceptual',
      estimatedProcessingTime,
    };

    console.log(`[IntelligentSplitter] ✅ Plano criado: ${plan.totalParts} partes`);
    parts.forEach((part, i) => {
      console.log(`  Parte ${i + 1}: ${part.title} (${part.endPage - part.startPage + 1} páginas)`);
    });

    return plan;
  }

  /**
   * Creates a DocumentPart from a group of sections
   */
  private createPartFromSections(sections: DocumentSection[], partNumber: number): DocumentPart {
    const firstSection = sections[0];
    const lastSection = sections[sections.length - 1];

    // Create descriptive title
    let title: string;
    if (sections.length === 1) {
      title = `Parte ${partNumber}: ${firstSection.title}`;
    } else {
      const sectionTitles = sections.slice(0, 3).map(s => s.title.substring(0, 30));
      if (sections.length > 3) {
        title = `Parte ${partNumber}: ${sectionTitles.join(', ')}...`;
      } else {
        title = `Parte ${partNumber}: ${sectionTitles.join(', ')}`;
      }
    }

    // Calculate total size
    const estimatedSizeBytes = sections.reduce((sum, s) => sum + s.estimatedSizeBytes, 0);

    return {
      partNumber,
      title,
      startPage: firstSection.startPage,
      endPage: lastSection.endPage,
      startIndex: firstSection.startIndex,
      endIndex: lastSection.endIndex,
      sections: sections.map(s => s.title),
      estimatedSizeBytes,
    };
  }

  /**
   * Validates that a split plan covers the entire document without gaps
   */
  validatePlan(plan: SplitPlan, structure: DocumentStructure): boolean {
    // Check that parts are sequential and cover everything
    let lastEndPage = 0;
    for (const part of plan.parts) {
      if (part.startPage !== lastEndPage + 1 && lastEndPage !== 0) {
        console.error(`[IntelligentSplitter] ❌ Gap detected: Part ${part.partNumber} starts at page ${part.startPage}, but previous ended at ${lastEndPage}`);
        return false;
      }
      lastEndPage = part.endPage;
    }

    // Check that last part covers the end of document
    if (lastEndPage !== structure.totalPages) {
      console.error(`[IntelligentSplitter] ❌ Coverage incomplete: Last part ends at page ${lastEndPage}, but document has ${structure.totalPages} pages`);
      return false;
    }

    console.log(`[IntelligentSplitter] ✅ Plano validado: cobertura completa de 1-${structure.totalPages}`);
    return true;
  }
}

// Singleton instance
export const intelligentDocumentSplitter = new IntelligentDocumentSplitter();
