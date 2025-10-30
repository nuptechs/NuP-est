import { pineconeService } from './pinecone';
import { hybridSearchService } from './rag/HybridSearchService';
import { IStorage } from '../storage';

/**
 * Serviço especializado em RAG estrito para matérias
 * Garante que respostas sejam baseadas APENAS nos materiais carregados
 */
export class SubjectRAGService {
  constructor(private storage: IStorage) {}

  /**
   * Busca contexto RAG estrito para uma matéria específica
   * Retorna contexto + lista de tópicos disponíveis nos materiais
   */
  async getSubjectContext(
    userId: string,
    subjectId: string,
    query: string,
    options: {
      topK?: number;
      minSimilarity?: number;
      enableMultiLayer?: boolean; // Novo: permite desativar multi-camadas se necessário
    } = {}
  ): Promise<{
    hasContext: boolean;
    context: string;
    sources: Array<{ title: string; similarity: number }>;
    availableTopics: string[];
    materialCount: number;
    confidence: { score: number; level: 'none' | 'low' | 'medium' | 'high'; reason: string };
  }> {
    const { 
      topK = 10,  // Default aumentado de 5 para 10
      minSimilarity = 0.65,  // Default reduzido de 0.7 para 0.65
      enableMultiLayer = true  // Ativa multi-camadas por padrão
    } = options;

    // 1. Buscar TODOS os materiais desta matéria
    const materials = await this.storage.getMaterials(userId, subjectId);
    
    if (materials.length === 0) {
      console.log(`⚠️ [SubjectRAG] Nenhum material encontrado para subjectId: ${subjectId}`);
      return {
        hasContext: false,
        context: '',
        sources: [],
        availableTopics: [],
        materialCount: 0,
        confidence: {
          score: 0,
          level: 'none',
          reason: 'Nenhum material carregado para esta matéria',
        },
      };
    }

    const materialIds = materials.map(m => m.id);
    console.log(`📚 [SubjectRAG] Buscando RAG em ${materials.length} materiais: ${materialIds.join(', ')}`);

    // 2. BUSCA HÍBRIDA (Semantic + BM25 + Reranking)
    console.log(`🔍 [SubjectRAG] Iniciando busca híbrida (Semantic + BM25 + Reranking)`);
    
    const hybridResults = await hybridSearchService.search(query, {
      userId,
      materialIds,
      topK,
      minSimilarity,
      semanticWeight: 0.6, // 60% peso semântico
      bm25Weight: 0.4, // 40% peso keyword
      useReranking: true, // Ativar reranking com LLM
    });

    // Converter formato hybrid para formato esperado
    const results = hybridResults.map(r => ({
      content: r.content,
      title: r.title,
      category: r.category,
      similarity: r.finalScore, // Usar score final (pós-reranking)
    }));

    console.log(`✅ [SubjectRAG] Busca híbrida retornou ${results.length} resultados`)

    // 3. CONFIDENCE SCORING - Avaliar confiança nos resultados
    const confidence = this.calculateConfidence(results);
    const hasRelevantContext = confidence.level !== 'none';
    
    console.log(`📊 [SubjectRAG] Confidence: ${confidence.level} (score: ${confidence.score.toFixed(2)})`);
    
    let context = '';
    const sources: Array<{ title: string; similarity: number }> = [];
    
    if (hasRelevantContext) {
      context = results
        .map((r, idx) => `[Trecho ${idx + 1} - ${r.title}]:\n${r.content}`)
        .join('\n\n---\n\n');
      
      // Deduplicate sources by title
      const uniqueSources = new Map<string, number>();
      results.forEach(r => {
        if (!uniqueSources.has(r.title) || uniqueSources.get(r.title)! < r.similarity) {
          uniqueSources.set(r.title, r.similarity);
        }
      });
      
      uniqueSources.forEach((similarity, title) => {
        sources.push({ title, similarity });
      });
    }

    // 4. Extrair tópicos REAIS dos materiais (amostrar chunks para obter tópicos do conteúdo)
    const availableTopics = await this.extractRealTopics(userId, materialIds);

    console.log(`✅ [SubjectRAG] Contexto: ${hasRelevantContext ? 'SIM' : 'NÃO'} | Resultados: ${results.length} | Materiais: ${materials.length}`);

    return {
      hasContext: hasRelevantContext,
      context,
      sources,
      availableTopics,
      materialCount: materials.length,
      confidence, // Adicionar confidence aos resultados
    };
  }

  /**
   * Calcula confidence score baseado nos resultados da busca
   * Retorna nível de confiança: none, low, medium, high
   */
  private calculateConfidence(results: any[]): {
    score: number;
    level: 'none' | 'low' | 'medium' | 'high';
    reason: string;
  } {
    if (results.length === 0) {
      return {
        score: 0,
        level: 'none',
        reason: 'Nenhum resultado encontrado nos materiais',
      };
    }

    // Calcular score médio dos top-3 resultados
    const top3 = results.slice(0, Math.min(3, results.length));
    const avgScore = top3.reduce((sum, r) => sum + r.similarity, 0) / top3.length;
    
    // Considerar também quantidade de resultados
    const countFactor = Math.min(results.length / 5, 1); // Máximo 1 com 5+ resultados
    
    // Score final combina qualidade (avgScore) e quantidade (countFactor)
    const finalScore = avgScore * 0.7 + countFactor * 0.3;

    // Determinar nível baseado em thresholds
    let level: 'none' | 'low' | 'medium' | 'high';
    let reason: string;

    if (finalScore >= 0.7) {
      level = 'high';
      reason = `Encontrados ${results.length} resultados altamente relevantes (score médio: ${avgScore.toFixed(2)})`;
    } else if (finalScore >= 0.5) {
      level = 'medium';
      reason = `Encontrados ${results.length} resultados moderadamente relevantes (score médio: ${avgScore.toFixed(2)})`;
    } else if (finalScore >= 0.3) {
      level = 'low';
      reason = `Apenas ${results.length} resultados com baixa relevância (score médio: ${avgScore.toFixed(2)})`;
    } else {
      level = 'none';
      reason = `Resultados com relevância muito baixa (score médio: ${avgScore.toFixed(2)})`;
    }

    return { score: finalScore, level, reason };
  }

  /**
   * Expande query para capturar variações semânticas
   */
  private expandQuery(query: string): string[] {
    const expanded: string[] = [];
    
    // Adicionar variações comuns
    const lowerQuery = query.toLowerCase();
    
    // Variação 1: Conceitos relacionados
    if (lowerQuery.includes('princípio')) {
      expanded.push(query.replace(/princípio/gi, 'fundamento'));
      expanded.push(query.replace(/princípio/gi, 'base'));
    }
    
    // Variação 2: Pluralização e singularização
    if (query.endsWith('s')) {
      expanded.push(query.slice(0, -1)); // Remover 's'
    } else {
      expanded.push(query + 's'); // Adicionar 's'
    }
    
    // Variação 3: Termos-chave extraídos (pegar palavras principais)
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['sobre', 'como', 'qual', 'quais', 'onde', 'quando'].includes(word));
    
    if (keywords.length > 1) {
      // Buscar apenas pelas palavras-chave principais
      expanded.push(keywords.join(' '));
      
      // Buscar por cada palavra-chave individual (se houver poucas)
      if (keywords.length <= 3) {
        keywords.forEach(keyword => expanded.push(keyword));
      }
    }
    
    console.log(`🔄 [SubjectRAG] Query expandida: "${query}" → [${expanded.slice(0, 3).join('", "')}"...]`);
    return expanded.slice(0, 5); // Limitar a 5 variações para não sobrecarregar
  }

  /**
   * Extrai tópicos reais do conteúdo dos materiais (não apenas títulos)
   * Busca chunks aleatórios para identificar assuntos abordados
   */
  private async extractRealTopics(userId: string, materialIds: string[]): Promise<string[]> {
    try {
      // Buscar chunks de amostra de cada material com query genérica
      const sampleQuery = 'conteúdo principal assunto tema tópico';
      const sampleResults = await pineconeService.searchSimilarContent(
        sampleQuery,
        userId,
        {
          materialIds,
          topK: 30,  // Buscar vários chunks para ter boa amostra
          minSimilarity: 0.1,  // Threshold muito baixo - apenas para pegar amostras
        }
      );

      if (sampleResults.length === 0) {
        // Fallback: retornar títulos dos materiais
        return [];
      }

      // Extrair sentenças-chave dos chunks (primeiras linhas de cada chunk)
      const topics = new Set<string>();
      
      sampleResults.forEach(result => {
        // Pegar primeira frase significativa do chunk
        const sentences = result.content.split(/[.!?]\s+/);
        const firstMeaningfulSentence = sentences.find(s => s.trim().length > 20);
        
        if (firstMeaningfulSentence) {
          // Limitar tamanho para não poluir UI
          const topic = firstMeaningfulSentence.trim().substring(0, 100);
          if (topic.length > 15) { // Evitar fragmentos muito curtos
            topics.add(topic);
          }
        }
      });

      const topicArray = Array.from(topics).slice(0, 10);
      console.log(`📋 [SubjectRAG] Tópicos extraídos do conteúdo: ${topicArray.length}`);
      
      return topicArray;
    } catch (error) {
      console.error(`❌ [SubjectRAG] Erro ao extrair tópicos reais:`, error);
      return [];
    }
  }

  /**
   * Constrói prompt estrito que força a IA a responder APENAS com base no contexto
   * Inclui confidence scoring para refusal lógico
   */
  buildStrictPrompt(
    context: string,
    availableTopics: string[],
    userQuery: string,
    confidence?: { score: number; level: string; reason: string }
  ): string {
    // STRICT REFUSAL LOGIC baseado em confidence
    if (!confidence || confidence.level === 'none') {
      return `Você é um assistente de estudos rigoroso baseado em materiais.

**SITUAÇÃO CRÍTICA:** Não encontrei informações relevantes sobre "${userQuery}" nos materiais carregados.

**INSTRUÇÃO OBRIGATÓRIA:**
Você DEVE responder EXATAMENTE assim:

"Desculpe, mas não encontrei informações sobre '${userQuery}' nos materiais carregados.

Os materiais disponíveis abordam os seguintes tópicos:
${availableTopics.slice(0, 8).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Se sua pergunta está relacionada a algum desses tópicos, posso ajudar reformulando a pergunta."

**PROIBIDO:**
- Usar conhecimento geral
- Tentar responder mesmo sem informação
- Inventar ou especular`;
    }

    // MEDIUM/LOW CONFIDENCE - Aviso ao estudante
    const confidenceWarning = confidence.level === 'low' 
      ? '\n\n⚠️ ATENÇÃO: As informações encontradas têm baixa relevância. Cite isso na resposta.'
      : '';

    return `Você é um assistente de estudos que responde EXCLUSIVAMENTE com base no material de referência fornecido.

**REGRAS ABSOLUTAS (ZERO TOLERÂNCIA):**

1. **FONTE ÚNICA**: Responda APENAS usando informações EXPLICITAMENTE presentes no contexto abaixo
2. **CITAÇÃO OBRIGATÓRIA**: Cite SEMPRE de qual trecho você está tirando cada informação (ex: "Segundo o Trecho 1...")
3. **REFUSAL ESTRITO**: Se a informação NÃO estiver EXPLÍCITA no contexto, você DEVE dizer:
   "Não encontrei essa informação específica nos materiais. Os tópicos disponíveis são: [listar]"
4. **ZERO HALLUCINATION**: NUNCA invente, especule, ou use conhecimento externo
5. **PRECISÃO**: Se não tiver certeza ABSOLUTA, diga que não encontrou

**CONFIDENCE SCORE:** ${confidence.score.toFixed(2)} (${confidence.level})
**RAZÃO:** ${confidence.reason}${confidenceWarning}

---

**MATERIAL DE REFERÊNCIA:**

${context}

---

**TÓPICOS DISPONÍVEIS NESTE MATERIAL:**
${availableTopics.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}

---

**PERGUNTA DO ESTUDANTE:**
${userQuery}

**SUA RESPOSTA (baseada APENAS no material acima, com citações):**`;
  }
}
