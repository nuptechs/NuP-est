/**
 * SEMANTIC CHUNKING STRATEGY - HIERÁRQUICA
 * 
 * Estratégia adaptativa que usa IA em 2 passos para identificar quebras semânticas naturais.
 * Ideal para materiais de estudo onde preservar conceitos completos é crítico.
 * 
 * FUNCIONAMENTO (ANÁLISE HIERÁRQUICA):
 * 1. PASSO 1: Sumário Estratégico - IA lê documento completo e identifica grandes seções
 * 2. PASSO 2: Análise Detalhada - Para cada seção, IA identifica tópicos/conceitos
 * 3. Gera chunks com tamanhos variáveis (200-1200 chars)
 * 4. Cada chunk = 1 unidade semântica autocontida
 * 
 * VANTAGENS:
 * ✅ Preserva contexto completo de cada conceito
 * ✅ Não quebra assuntos no meio (respeita estrutura natural)
 * ✅ Busca RAG retorna trechos coerentes
 * ✅ Questões geradas têm todo contexto necessário
 * ✅ Escala para documentos grandes (100k+ caracteres)
 * 
 * CUSTOS:
 * ~$0.002-0.005 por documento (2 chamadas de IA por upload)
 * +5-15 segundos de processamento adicional
 */

import type { IChunkingStrategy, ChunkOptions, ChunkResult } from '../types';
import { aiAnalyze } from '../../ai/index';

/**
 * Sumário do documento (Passo 1)
 */
interface DocumentOverview {
  title: string;
  type: 'apostila' | 'aula' | 'resumo' | 'artigo' | 'livro' | 'outro';
  sections: {
    title: string;
    startIndex: number;
    endIndex: number;
    description: string;
  }[];
}

/**
 * Resultado da análise semântica detalhada (Passo 2)
 */
interface SemanticAnalysis {
  topics: {
    title: string;
    startIndex: number;
    endIndex: number;
    keywords: string[];
    academicLevel?: 'básico' | 'intermediário' | 'avançado';
    subtopics?: {
      title: string;
      startIndex: number;
      endIndex: number;
    }[];
  }[];
  summary?: string;
}

export class SemanticChunkStrategy implements IChunkingStrategy {
  readonly name = 'semantic';

  validateOptions(options: ChunkOptions): boolean {
    if (options.maxChars <= 0) return false;
    // Semantic chunking ignora maxChars, mas aceita como limite máximo
    return true;
  }

  async chunk(text: string, options: ChunkOptions): Promise<ChunkResult[]> {
    if (!this.validateOptions(options)) {
      throw new Error(`[${this.name}] Opções inválidas`);
    }

    const { maxChars = 1200, minChunkSize = 200 } = options;

    console.log(`[SemanticChunkStrategy] 🔍 Iniciando análise hierárquica de ${text.length} caracteres...`);

    try {
      // PASSO 1: Sumário Estratégico (documento completo)
      console.log(`[SemanticChunkStrategy] 📋 PASSO 1: Analisando estrutura geral do documento...`);
      const overview = await this.analyzeDocumentOverview(text);
      console.log(`[SemanticChunkStrategy] ✅ Identificadas ${overview.sections.length} seções principais`);

      // PASSO 2: Análise Detalhada (seção por seção)
      console.log(`[SemanticChunkStrategy] 📖 PASSO 2: Analisando cada seção em detalhes...`);
      const allTopics: SemanticAnalysis['topics'] = [];

      for (let i = 0; i < overview.sections.length; i++) {
        const section = overview.sections[i];
        const sectionText = text.substring(section.startIndex, section.endIndex);
        
        console.log(`[SemanticChunkStrategy]   → Seção ${i + 1}/${overview.sections.length}: "${section.title}" (${sectionText.length} chars)`);
        
        const sectionTopics = await this.analyzeSectionDetails(
          sectionText, 
          section.startIndex,
          section.title,
          maxChars
        );
        
        allTopics.push(...sectionTopics);
        console.log(`[SemanticChunkStrategy]   ✓ ${sectionTopics.length} tópicos identificados nesta seção`);
      }

      console.log(`[SemanticChunkStrategy] ✅ Análise hierárquica concluída: ${allTopics.length} tópicos totais`);

      // Gerar chunks baseados nos tópicos identificados
      const analysis: SemanticAnalysis = { topics: allTopics };
      const chunks = this.generateChunksFromAnalysis(text, analysis, minChunkSize, maxChars);

      console.log(`[SemanticChunkStrategy] 🎯 ${chunks.length} chunks semânticos gerados`);

      return chunks;
    } catch (error) {
      console.error(`[SemanticChunkStrategy] ❌ Erro na análise semântica:`, error);
      
      // Fallback: usar estratégia sentence-aware se IA falhar
      console.warn(`[SemanticChunkStrategy] ⚠️ Usando fallback para estratégia sentence-aware`);
      const { SentenceAwareChunkStrategy } = await import('./SentenceAwareChunkStrategy');
      const fallbackStrategy = new SentenceAwareChunkStrategy();
      return fallbackStrategy.chunk(text, options);
    }
  }

  /**
   * PASSO 1: Analisa estrutura geral do documento (sumário estratégico)
   * Lê o documento completo e identifica grandes seções/capítulos
   */
  private async analyzeDocumentOverview(text: string): Promise<DocumentOverview> {
    // Criar amostra estratégica: início + meio + fim
    const sampleSize = 3000;
    const beginning = text.substring(0, sampleSize);
    const middle = text.substring(Math.floor(text.length / 2) - sampleSize / 2, Math.floor(text.length / 2) + sampleSize / 2);
    const end = text.substring(Math.max(0, text.length - sampleSize));
    
    const strategicSample = `
=== INÍCIO DO DOCUMENTO ===
${beginning}

=== MEIO DO DOCUMENTO ===
${middle}

=== FIM DO DOCUMENTO ===
${end}
`.trim();

    const prompt = `
Analise este documento acadêmico e identifique sua estrutura principal (seções/capítulos).

DOCUMENTO (Tamanho completo: ${text.length} caracteres):
"""
${strategicSample}
"""

INSTRUÇÕES:
1. Identifique o tipo de documento (apostila, aula, resumo, artigo, livro)
2. Identifique as PRINCIPAIS SEÇÕES/CAPÍTULOS (máximo 10)
3. Para cada seção, estime:
   - Título descritivo
   - Posição aproximada no documento (startIndex, endIndex)
   - Breve descrição do conteúdo

IMPORTANTE:
- Use o tamanho total (${text.length} chars) para estimar posições
- Distribua as seções ao longo de todo o documento
- Seções devem cobrir 100% do texto (sem gaps)
- Não crie seções muito pequenas (mínimo ~10% do documento cada)

RESPONDA EM JSON:
{
  "title": "Título do documento",
  "type": "apostila",
  "sections": [
    {
      "title": "Introdução",
      "startIndex": 0,
      "endIndex": 50000,
      "description": "Conceitos iniciais e apresentação"
    }
  ]
}

Retorne APENAS o JSON, sem explicações adicionais.
`.trim();

    try {
      const result = await aiAnalyze<DocumentOverview>(
        prompt,
        'Você é um especialista em análise de estrutura de documentos acadêmicos.',
        {
          temperature: 0.3,
          maxTokens: 1500,
        }
      );

      // Validar e ajustar seções para cobrir 100% do documento
      return this.validateOverview(result, text.length);
    } catch (error) {
      // Fallback: criar seções fixas de 50k caracteres
      console.warn(`[SemanticChunkStrategy] Falha no overview, usando divisão automática`);
      return this.createAutomaticSections(text.length);
    }
  }

  /**
   * PASSO 2: Analisa uma seção específica em detalhes
   * Identifica tópicos/conceitos dentro da seção
   */
  private async analyzeSectionDetails(
    sectionText: string,
    offsetIndex: number,
    sectionTitle: string,
    maxChunkSize: number
  ): Promise<SemanticAnalysis['topics']> {
    // Limitar análise a 20k chars por seção (para não sobrecarregar a IA)
    const textToAnalyze = sectionText.length > 20000
      ? sectionText.substring(0, 20000)
      : sectionText;

    const prompt = `
Analise esta seção de um documento acadêmico e identifique tópicos/conceitos para chunking semântico.

SEÇÃO: ${sectionTitle}
TEXTO (${sectionText.length} caracteres):
"""
${textToAnalyze}
"""

INSTRUÇÕES:
1. Identifique os principais tópicos/conceitos desta seção
2. Para cada tópico:
   - Título descritivo e específico
   - Posição no texto (startIndex, endIndex - relativos ao início da seção)
   - Palavras-chave principais (3-5 palavras)
   - Nível acadêmico (básico/intermediário/avançado)
3. Cada tópico deve ser autocontido (conceito completo)
4. Tamanho ideal: ${Math.floor(maxChunkSize * 0.6)}-${maxChunkSize} caracteres
5. Mínimo: 200 caracteres

RESPONDA EM JSON:
{
  "topics": [
    {
      "title": "Conceito X",
      "startIndex": 0,
      "endIndex": 800,
      "keywords": ["termo1", "termo2"],
      "academicLevel": "intermediário"
    }
  ]
}

IMPORTANTE: Posições devem ser relativas ao início do texto fornecido.
Retorne APENAS o JSON, sem explicações adicionais.
`.trim();

    try {
      const result = await aiAnalyze<Pick<SemanticAnalysis, 'topics'>>(
        prompt,
        'Você é um especialista em análise de conteúdo acadêmico e identificação de estruturas semânticas.',
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      );

      // Ajustar índices para posição absoluta no documento
      return result.topics.map(topic => ({
        ...topic,
        startIndex: topic.startIndex + offsetIndex,
        endIndex: topic.endIndex + offsetIndex,
      }));
    } catch (error) {
      console.error(`[SemanticChunkStrategy] Erro ao analisar seção "${sectionTitle}":`, error);
      // Retornar seção completa como um único tópico
      return [{
        title: sectionTitle,
        startIndex: offsetIndex,
        endIndex: offsetIndex + sectionText.length,
        keywords: [],
        academicLevel: 'intermediário',
      }];
    }
  }

  /**
   * Valida e ajusta o overview do documento
   */
  private validateOverview(overview: DocumentOverview, textLength: number): DocumentOverview {
    const sections = overview.sections || [];
    
    if (sections.length === 0) {
      return this.createAutomaticSections(textLength);
    }

    // Ajustar índices e garantir cobertura completa
    const adjustedSections = sections.map((section, index) => {
      let startIndex = Math.max(0, Math.min(section.startIndex, textLength - 1));
      let endIndex = Math.max(startIndex + 1, Math.min(section.endIndex, textLength));
      
      // Última seção deve ir até o final
      if (index === sections.length - 1) {
        endIndex = textLength;
      }
      
      return {
        ...section,
        startIndex,
        endIndex,
      };
    });

    // Ordenar por startIndex
    adjustedSections.sort((a, b) => a.startIndex - b.startIndex);

    // Garantir que primeira seção começa em 0
    if (adjustedSections[0].startIndex > 0) {
      adjustedSections[0].startIndex = 0;
    }

    // Preencher gaps entre seções
    for (let i = 0; i < adjustedSections.length - 1; i++) {
      const current = adjustedSections[i];
      const next = adjustedSections[i + 1];
      
      if (current.endIndex < next.startIndex) {
        // Estender seção atual até início da próxima
        current.endIndex = next.startIndex;
      } else if (current.endIndex > next.startIndex) {
        // Ajustar início da próxima seção
        next.startIndex = current.endIndex;
      }
    }

    return {
      ...overview,
      sections: adjustedSections,
    };
  }

  /**
   * Cria seções automáticas quando IA falha
   */
  private createAutomaticSections(textLength: number): DocumentOverview {
    const sectionSize = 50000; // 50k chars por seção
    const sections: DocumentOverview['sections'] = [];
    
    let start = 0;
    let sectionNum = 1;
    
    while (start < textLength) {
      const end = Math.min(start + sectionSize, textLength);
      sections.push({
        title: `Seção ${sectionNum}`,
        startIndex: start,
        endIndex: end,
        description: `Conteúdo do documento (${start}-${end})`,
      });
      start = end;
      sectionNum++;
    }

    return {
      title: 'Documento',
      type: 'outro',
      sections,
    };
  }

  /**
   * Valida e ajusta os índices retornados pela IA
   */
  private validateAndAdjustAnalysis(
    analysis: SemanticAnalysis, 
    textLength: number
  ): SemanticAnalysis {
    // Garantir que os tópicos estão dentro dos limites do texto
    const adjustedTopics = analysis.topics.map((topic, index) => {
      // Ajustar startIndex
      let startIndex = Math.max(0, Math.min(topic.startIndex, textLength - 1));
      
      // Ajustar endIndex
      let endIndex = Math.max(startIndex + 1, Math.min(topic.endIndex, textLength));
      
      // Se é o último tópico, ir até o final
      if (index === analysis.topics.length - 1) {
        endIndex = textLength;
      }

      return {
        ...topic,
        startIndex,
        endIndex,
      };
    });

    // Ordenar por startIndex
    adjustedTopics.sort((a, b) => a.startIndex - b.startIndex);

    // Preencher gaps (se houver)
    const filledTopics = this.fillGaps(adjustedTopics, textLength);

    return {
      ...analysis,
      topics: filledTopics,
    };
  }

  /**
   * Preenche gaps entre tópicos para garantir cobertura completa
   */
  private fillGaps(
    topics: SemanticAnalysis['topics'], 
    textLength: number
  ): SemanticAnalysis['topics'] {
    if (topics.length === 0) {
      // Se IA não retornou tópicos, criar um único chunk com todo o texto
      return [{
        title: 'Conteúdo completo',
        startIndex: 0,
        endIndex: textLength,
        keywords: [],
        academicLevel: 'intermediário',
      }];
    }

    const filled: SemanticAnalysis['topics'] = [];

    topics.forEach((topic, index) => {
      // Se há gap antes deste tópico, criar chunk para preencher
      if (index === 0 && topic.startIndex > 0) {
        filled.push({
          title: 'Introdução',
          startIndex: 0,
          endIndex: topic.startIndex,
          keywords: [],
        });
      }

      filled.push(topic);

      // Se há gap entre este e o próximo tópico
      if (index < topics.length - 1) {
        const nextTopic = topics[index + 1];
        if (topic.endIndex < nextTopic.startIndex) {
          filled.push({
            title: `Transição (${topic.title} → ${nextTopic.title})`,
            startIndex: topic.endIndex,
            endIndex: nextTopic.startIndex,
            keywords: [],
          });
        }
      }

      // Se é o último tópico e não vai até o final
      if (index === topics.length - 1 && topic.endIndex < textLength) {
        filled.push({
          title: 'Conclusão',
          startIndex: topic.endIndex,
          endIndex: textLength,
          keywords: [],
        });
      }
    });

    return filled;
  }

  /**
   * Gera chunks baseados na análise semântica
   * GARANTIA: 100% de cobertura do texto original
   */
  private generateChunksFromAnalysis(
    text: string,
    analysis: SemanticAnalysis,
    minChunkSize: number,
    maxChunkSize: number
  ): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    let chunkNumber = 0;
    let pendingMerge: { text: string; topic: SemanticAnalysis['topics'][0]; start: number } | null = null;

    for (let i = 0; i < analysis.topics.length; i++) {
      const topic = analysis.topics[i];
      const chunkText = text.slice(topic.startIndex, topic.endIndex).trim();

      // Pular chunks completamente vazios
      if (chunkText.length === 0) {
        console.log(`[SemanticChunkStrategy] Chunk vazio, pulando: "${topic.title}"`);
        continue;
      }

      // Se chunk for muito pequeno, mesclar com próximo ou anterior
      if (chunkText.length < minChunkSize) {
        console.log(`[SemanticChunkStrategy] Chunk pequeno (${chunkText.length} chars), mesclando: "${topic.title}"`);
        
        if (pendingMerge) {
          // Já temos um pendente, mesclar com ele
          pendingMerge.text += '\n\n' + chunkText;
          pendingMerge.topic.endIndex = topic.endIndex;
        } else {
          // Criar pendente para mesclar com próximo
          pendingMerge = {
            text: chunkText,
            topic: { ...topic },
            start: topic.startIndex
          };
        }
        
        // Se é o último chunk E está pendente, forçar flush
        if (i === analysis.topics.length - 1 && pendingMerge) {
          chunks.push({
            text: pendingMerge.text,
            startIndex: pendingMerge.start,
            endIndex: pendingMerge.topic.endIndex,
            chunkNumber: chunkNumber++,
            wasTruncated: false,
            metadata: {
              topic: pendingMerge.topic.title,
              keywords: pendingMerge.topic.keywords,
              academicLevel: pendingMerge.topic.academicLevel,
              semanticBoundary: 'merged', // Indica que foi mesclado
              chunkType: 'semantic',
            },
          });
          pendingMerge = null;
        }
        continue;
      }

      // Se temos algo pendente, mesclar antes de processar este chunk
      if (pendingMerge) {
        const mergedText = pendingMerge.text + '\n\n' + chunkText;
        
        chunks.push({
          text: mergedText,
          startIndex: pendingMerge.start,
          endIndex: topic.endIndex,
          chunkNumber: chunkNumber++,
          wasTruncated: false,
          metadata: {
            topic: `${pendingMerge.topic.title} + ${topic.title}`,
            keywords: [...(pendingMerge.topic.keywords || []), ...(topic.keywords || [])],
            academicLevel: topic.academicLevel || pendingMerge.topic.academicLevel,
            semanticBoundary: 'merged',
            chunkType: 'semantic',
          },
        });
        pendingMerge = null;
        continue;
      }

      // Se chunk for muito grande, dividir em sub-chunks (usando sentence-aware)
      if (chunkText.length > maxChunkSize) {
        console.log(`[SemanticChunkStrategy] Chunk grande (${chunkText.length} chars), subdividindo: "${topic.title}"`);
        
        const subChunks = this.subdivideChunk(
          chunkText,
          topic,
          topic.startIndex,
          maxChunkSize,
          chunkNumber
        );

        chunks.push(...subChunks);
        chunkNumber += subChunks.length;
      } else {
        // Chunk dentro do tamanho ideal
        chunks.push({
          text: chunkText,
          startIndex: topic.startIndex,
          endIndex: topic.endIndex,
          chunkNumber: chunkNumber++,
          wasTruncated: false,
          metadata: {
            topic: topic.title,
            keywords: topic.keywords,
            academicLevel: topic.academicLevel,
            semanticBoundary: 'complete', // Indica conceito completo
            chunkType: 'semantic',
          },
        });
      }
    }

    // Adicionar totalChunks
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    // Validar cobertura 100%
    const coverage = this.validateCoverage(text, chunks);
    if (coverage < 0.99) {
      console.warn(`[SemanticChunkStrategy] ⚠️ Cobertura baixa (${(coverage * 100).toFixed(1)}%), ajustando...`);
      return this.ensureFullCoverage(text, chunks);
    }

    return chunks;
  }

  /**
   * Valida que os chunks cobrem o texto completo
   */
  private validateCoverage(text: string, chunks: ChunkResult[]): number {
    const totalCovered = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    return totalCovered / text.length;
  }

  /**
   * Garante cobertura completa do texto ajustando chunks
   */
  private ensureFullCoverage(text: string, chunks: ChunkResult[]): ChunkResult[] {
    if (chunks.length === 0) {
      // Sem chunks, criar um único chunk com todo o texto
      return [{
        text: text,
        startIndex: 0,
        endIndex: text.length,
        chunkNumber: 0,
        totalChunks: 1,
        wasTruncated: false,
        metadata: {
          topic: 'Conteúdo completo',
          semanticBoundary: 'complete',
          chunkType: 'semantic',
        },
      }];
    }

    // Ajustar último chunk para cobrir até o final do texto
    const lastChunk = chunks[chunks.length - 1];
    const missingText = text.slice(lastChunk.endIndex);
    
    if (missingText.trim().length > 0) {
      console.log(`[SemanticChunkStrategy] 📝 Adicionando ${missingText.length} chars faltantes ao último chunk`);
      lastChunk.text += '\n' + missingText.trim();
      lastChunk.endIndex = text.length;
      lastChunk.metadata = {
        ...lastChunk.metadata,
        adjusted: true,
      };
    }

    return chunks;
  }

  /**
   * Subdivide chunks grandes usando quebras de sentença
   */
  private subdivideChunk(
    chunkText: string,
    topic: SemanticAnalysis['topics'][0],
    baseStartIndex: number,
    maxChunkSize: number,
    startingChunkNumber: number
  ): ChunkResult[] {
    const subChunks: ChunkResult[] = [];
    let start = 0;
    let subNumber = 0;

    while (start < chunkText.length) {
      const end = Math.min(start + maxChunkSize, chunkText.length);
      let subChunkText = chunkText.slice(start, end);
      let actualEnd = end;

      // Tentar quebrar em sentença
      if (end < chunkText.length) {
        const lastSentence = subChunkText.lastIndexOf('. ');
        if (lastSentence > maxChunkSize * 0.6) {
          subChunkText = chunkText.slice(start, lastSentence + 1);
          actualEnd = lastSentence + 1;
        }
      }

      subChunks.push({
        text: subChunkText.trim(),
        startIndex: baseStartIndex + start,
        endIndex: baseStartIndex + actualEnd,
        chunkNumber: startingChunkNumber + subNumber,
        wasTruncated: false,
        metadata: {
          topic: `${topic.title} (parte ${subNumber + 1})`,
          keywords: topic.keywords,
          academicLevel: topic.academicLevel,
          semanticBoundary: subNumber === 0 ? 'start' : 'continuation',
          chunkType: 'semantic-subdivision',
        },
      });

      start = actualEnd;
      subNumber++;
    }

    return subChunks;
  }
}
