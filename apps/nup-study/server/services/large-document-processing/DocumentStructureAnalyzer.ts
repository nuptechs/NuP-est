/**
 * DOCUMENT STRUCTURE ANALYZER
 * 
 * Uses AI to analyze large documents and identify natural boundaries
 * for intelligent splitting. This ensures we don't break concepts/chapters.
 */

import { aiAnalyze } from '../ai/index';
import type {
  IDocumentStructureAnalyzer,
  DocumentStructure,
  DocumentSection,
  DocumentMetadata,
} from './types';

export class AIDocumentStructureAnalyzer implements IDocumentStructureAnalyzer {
  /**
   * Analyzes document structure using AI
   * For very large documents, analyzes only first 50k chars to get overview
   */
  async analyze(text: string, metadata: DocumentMetadata): Promise<DocumentStructure> {
    console.log(`[DocumentStructureAnalyzer] 🔍 Analisando estrutura de "${metadata.fileName}" (${metadata.pageCount} páginas)`);

    // For very large documents, analyze only a sample to get structure
    const MAX_CHARS_FOR_ANALYSIS = 50000; // ~25 pages
    const textToAnalyze = text.length > MAX_CHARS_FOR_ANALYSIS 
      ? text.substring(0, MAX_CHARS_FOR_ANALYSIS)
      : text;

    const prompt = `
Analise este documento acadêmico e identifique sua estrutura de alto nível.
O documento tem ${metadata.pageCount} páginas e ${Math.round(text.length / 1000)}k caracteres.

TAREFA:
1. Identifique as principais SEÇÕES/CAPÍTULOS do documento
2. Para cada seção, forneça:
   - Título da seção
   - Página inicial aproximada
   - Página final aproximada  
   - Descrição breve (1-2 sentenças)
   - Se a seção pode ser dividida sem perder contexto (isConceptComplete)

REGRAS:
- Identifique seções GRANDES (capítulos, partes principais)
- NÃO liste subtópicos ou seções pequenas
- Cada seção deve ter pelo menos 10 páginas
- Máximo de 15 seções
- Use estimativa de páginas baseada na posição no texto

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título geral do documento",
  "sections": [
    {
      "title": "Nome da Seção",
      "startPage": 1,
      "endPage": 50,
      "description": "Descrição do que esta seção aborda",
      "isConceptComplete": true
    }
  ]
}

TEXTO DO DOCUMENTO (primeiras ${Math.round(textToAnalyze.length / 1000)}k caracteres):
${textToAnalyze}
`;

    try {
      const response = await aiAnalyze(
        prompt,
        'HIGH', // Use HIGH priority for structure analysis (DeepSeek R1)
        { maxTokens: 4000 }
      );

      // Parse AI response
      const parsed = this.parseAIResponse(response);
      
      // Convert to full DocumentStructure with character indices
      const structure: DocumentStructure = {
        title: parsed.title || metadata.fileName,
        totalPages: metadata.pageCount,
        estimatedSizeBytes: text.length,
        sections: parsed.sections.map(section => {
          // Calculate approximate character positions based on pages
          const startIndex = Math.floor((section.startPage - 1) * (text.length / metadata.pageCount));
          const endIndex = Math.floor(section.endPage * (text.length / metadata.pageCount));
          const pageCount = section.endPage - section.startPage + 1;

          return {
            title: section.title,
            startPage: section.startPage,
            endPage: section.endPage,
            startIndex: Math.min(startIndex, text.length),
            endIndex: Math.min(endIndex, text.length),
            description: section.description || '',
            pageCount,
            estimatedSizeBytes: endIndex - startIndex,
            isConceptComplete: section.isConceptComplete ?? true,
          };
        }),
      };

      console.log(`[DocumentStructureAnalyzer] ✅ Identificadas ${structure.sections.length} seções principais`);
      
      return structure;
    } catch (error) {
      console.error(`[DocumentStructureAnalyzer] ❌ Erro ao analisar estrutura:`, error);
      
      // Fallback: create simple page-based sections
      return this.createFallbackStructure(text, metadata);
    }
  }

  /**
   * Parses AI response (handles both JSON and text responses)
   */
  private parseAIResponse(response: string): any {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response;

    try {
      return JSON.parse(jsonText);
    } catch (e) {
      // If JSON parsing fails, try to extract from plain text
      console.warn(`[DocumentStructureAnalyzer] ⚠️ Falha ao parsear JSON, tentando extração manual`);
      
      // Look for JSON-like structure in the text
      const match = response.match(/\{[\s\S]*"sections"[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {
          // Give up and return fallback
        }
      }
      
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Creates a simple fallback structure when AI analysis fails
   */
  private createFallbackStructure(text: string, metadata: DocumentMetadata): DocumentStructure {
    console.log(`[DocumentStructureAnalyzer] 📋 Criando estrutura fallback (divisão por páginas)`);

    const PAGES_PER_SECTION = 50; // 50 pages per section
    const sections: DocumentSection[] = [];
    const charsPerPage = text.length / metadata.pageCount;

    for (let startPage = 1; startPage <= metadata.pageCount; startPage += PAGES_PER_SECTION) {
      const endPage = Math.min(startPage + PAGES_PER_SECTION - 1, metadata.pageCount);
      const startIndex = Math.floor((startPage - 1) * charsPerPage);
      const endIndex = Math.floor(endPage * charsPerPage);

      sections.push({
        title: `Seção ${Math.floor(startPage / PAGES_PER_SECTION) + 1} (Páginas ${startPage}-${endPage})`,
        startPage,
        endPage,
        startIndex,
        endIndex,
        description: `Páginas ${startPage} a ${endPage} do documento`,
        pageCount: endPage - startPage + 1,
        estimatedSizeBytes: endIndex - startIndex,
        isConceptComplete: true,
      });
    }

    return {
      title: metadata.fileName,
      totalPages: metadata.pageCount,
      estimatedSizeBytes: text.length,
      sections,
    };
  }
}

// Singleton instance
export const documentStructureAnalyzer = new AIDocumentStructureAnalyzer();
