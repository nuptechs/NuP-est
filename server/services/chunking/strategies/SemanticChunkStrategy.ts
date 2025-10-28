/**
 * SEMANTIC CHUNKING STRATEGY
 * 
 * Estratégia adaptativa que usa IA para identificar quebras semânticas naturais.
 * Ideal para materiais de estudo onde preservar conceitos completos é crítico.
 * 
 * FUNCIONAMENTO:
 * 1. Analisa documento com IA (GPT-4o-mini via OpenRouter)
 * 2. Identifica tópicos, subtópicos e conceitos principais
 * 3. Gera chunks com tamanhos variáveis (200-2000 chars)
 * 4. Cada chunk = 1 unidade semântica autocontida
 * 
 * VANTAGENS:
 * ✅ Preserva contexto completo de cada conceito
 * ✅ Busca RAG retorna trechos coerentes
 * ✅ Questões geradas têm todo contexto necessário
 * ✅ Flexível para diferentes tipos de conteúdo acadêmico
 * 
 * CUSTOS:
 * ~$0.001-0.003 por documento (análise única por upload)
 * +2-5 segundos de processamento adicional
 */

import type { IChunkingStrategy, ChunkOptions, ChunkResult } from '../types';
import { aiAnalyze } from '../../ai/index';

/**
 * Resultado da análise semântica feita pela IA
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

    const { maxChars = 2000, minChunkSize = 200 } = options;

    console.log(`[SemanticChunkStrategy] Iniciando análise semântica de ${text.length} caracteres...`);

    try {
      // Passo 1: Análise semântica com IA
      const analysis = await this.analyzeSemanticStructure(text, maxChars);

      console.log(`[SemanticChunkStrategy] Análise concluída: ${analysis.topics.length} tópicos identificados`);

      // Passo 2: Gerar chunks baseados nos tópicos identificados
      const chunks = this.generateChunksFromAnalysis(text, analysis, minChunkSize, maxChars);

      console.log(`[SemanticChunkStrategy] ${chunks.length} chunks gerados com tamanhos variáveis`);

      return chunks;
    } catch (error) {
      console.error(`[SemanticChunkStrategy] Erro na análise semântica:`, error);
      
      // Fallback: usar estratégia sentence-aware se IA falhar
      console.warn(`[SemanticChunkStrategy] Usando fallback para estratégia sentence-aware`);
      const { SentenceAwareChunkStrategy } = await import('./SentenceAwareChunkStrategy');
      const fallbackStrategy = new SentenceAwareChunkStrategy();
      return fallbackStrategy.chunk(text, options);
    }
  }

  /**
   * Analisa estrutura semântica do texto usando IA
   */
  private async analyzeSemanticStructure(
    text: string, 
    maxChunkSize: number
  ): Promise<SemanticAnalysis> {
    // Limitar texto para análise (não enviar >10k chars para IA)
    const textToAnalyze = text.length > 10000 
      ? text.substring(0, 10000) + '\n...[texto truncado para análise]'
      : text;

    const prompt = `
Analise este texto acadêmico e identifique tópicos/subtópicos principais para chunking semântico.

TEXTO:
"""
${textToAnalyze}
"""

INSTRUÇÕES:
1. Identifique os principais tópicos/conceitos do texto
2. Para cada tópico, determine:
   - Título descritivo
   - Posição aproximada no texto (caracteres)
   - Palavras-chave principais (3-5 palavras)
   - Nível acadêmico (básico/intermediário/avançado)
3. Cada chunk deve ser autocontido (conceito completo)
4. Tamanho ideal de chunks: ${Math.floor(maxChunkSize * 0.6)}-${maxChunkSize} caracteres
5. Mínimo: 200 caracteres por chunk

RESPONDA EM JSON:
{
  "topics": [
    {
      "title": "Título do tópico",
      "startIndex": 0,
      "endIndex": 500,
      "keywords": ["palavra1", "palavra2"],
      "academicLevel": "intermediário"
    }
  ],
  "summary": "Resumo geral do documento em 1-2 frases"
}

IMPORTANTE: Use posições aproximadas baseadas no comprimento do texto original (${text.length} caracteres).
Retorne APENAS o JSON, sem explicações adicionais.
`.trim();

    try {
      const result = await aiAnalyze<SemanticAnalysis>(
        prompt,
        'Você é um especialista em análise de conteúdo acadêmico e identificação de estruturas semânticas.',
        {
          temperature: 0.3, // Baixa temperatura para consistência
          maxTokens: 2000,
        }
      );

      // Validar e ajustar índices se necessário
      return this.validateAndAdjustAnalysis(result, text.length);
    } catch (error) {
      throw new Error(`Falha na análise semântica: ${(error as Error).message}`);
    }
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
