import { pineconeService } from './pinecone';
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
      };
    }

    const materialIds = materials.map(m => m.id);
    console.log(`📚 [SubjectRAG] Buscando RAG em ${materials.length} materiais: ${materialIds.join(', ')}`);

    let results: any[] = [];
    
    // Se multi-layer desativado, fazer busca simples com options do caller
    if (!enableMultiLayer) {
      console.log(`🔍 [SubjectRAG] Busca simples (multi-layer desativado)`);
      results = await pineconeService.searchSimilarContent(
        query,
        userId,
        {
          materialIds,
          topK,
          minSimilarity,
        }
      );
    } else {
      // 2. BUSCA MULTI-CAMADAS com fallback inteligente
      let searchAttempt = 1;
      
      // CAMADA 1: Busca com parâmetros do caller (ou defaults melhorados)
      console.log(`🔍 [SubjectRAG] Tentativa ${searchAttempt}: Parâmetros otimizados`);
      results = await pineconeService.searchSimilarContent(
        query,
        userId,
        {
          materialIds,
          topK,
          minSimilarity,
        }
      );
      
      // CAMADA 2: Se não encontrou nada, expandir query e tentar novamente
      if (results.length === 0) {
        searchAttempt++;
        console.log(`🔍 [SubjectRAG] Tentativa ${searchAttempt}: Query expandida com threshold médio`);
        
        // Gerar variações da query para capturar sinônimos e contextos relacionados
        const expandedQueries = this.expandQuery(query);
        
        // Threshold para camada 2: mais permissivo que camada 1
        const layer2Threshold = Math.min(minSimilarity * 0.8, 0.5);  // 80% do original (mais permissivo) ou 0.5 max
        
        for (const expandedQuery of expandedQueries) {
          const expandedResults = await pineconeService.searchSimilarContent(
            expandedQuery,
            userId,
            {
              materialIds,
              topK: Math.max(topK, 15),  // Pelo menos 15, ou mais se caller pediu
              minSimilarity: layer2Threshold,
            }
          );
          results.push(...expandedResults);
        }
        
        // Remover duplicatas e ordenar por similaridade
        const uniqueResults = new Map<string, any>();
        results.forEach(r => {
          const key = `${r.title}_${r.content.substring(0, 50)}`;
          if (!uniqueResults.has(key) || uniqueResults.get(key).similarity < r.similarity) {
            uniqueResults.set(key, r);
          }
        });
        results = Array.from(uniqueResults.values())
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK * 2); // Retornar até 2x o topK solicitado
      }
      
      // CAMADA 3: Se ainda não encontrou, busca ampla (último recurso)
      if (results.length === 0) {
        searchAttempt++;
        console.log(`🔍 [SubjectRAG] Tentativa ${searchAttempt}: Busca ampla (último recurso)`);
        
        // Threshold para camada 3: muito mais permissivo
        const layer3Threshold = Math.min(minSimilarity * 0.5, 0.3);  // 50% do original ou 0.3 max
        
        results = await pineconeService.searchSimilarContent(
          query,
          userId,
          {
            materialIds,
            topK: Math.max(topK, 20),  // Pelo menos 20, ou mais se caller pediu
            minSimilarity: layer3Threshold,
          }
        );
      }

      console.log(`✅ [SubjectRAG] Encontrados ${results.length} resultados após ${searchAttempt} tentativa(s)`);
    }

    // 3. Construir contexto enriquecido
    const hasRelevantContext = results.length > 0;
    
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
    };
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
   */
  buildStrictPrompt(
    context: string,
    availableTopics: string[],
    userQuery: string
  ): string {
    return `Você é um assistente de estudos que responde EXCLUSIVAMENTE com base no material de referência fornecido.

**REGRAS ESTRITAS:**
1. Você DEVE responder APENAS usando informações presentes no contexto abaixo
2. Se o assunto NÃO estiver no contexto, você DEVE responder:
   "Esse assunto não é abordado no material de referência, mas posso te explicar sobre:"
   E então listar os tópicos disponíveis
3. NUNCA invente, alucine ou use conhecimento externo
4. Se não tiver certeza, diga que a informação não está no material
5. Cite sempre de qual trecho você está tirando a informação

**MATERIAL DE REFERÊNCIA:**

${context}

---

**TÓPICOS DISPONÍVEIS NESTE MATERIAL:**
${availableTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

---

**PERGUNTA DO ESTUDANTE:**
${userQuery}

**SUA RESPOSTA (baseada APENAS no material acima):**`;
  }
}
