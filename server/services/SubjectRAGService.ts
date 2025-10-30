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
    } = {}
  ): Promise<{
    hasContext: boolean;
    context: string;
    sources: Array<{ title: string; similarity: number }>;
    availableTopics: string[];
    materialCount: number;
  }> {
    const { topK = 5, minSimilarity = 0.7 } = options;

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

    // 2. Buscar chunks similares APENAS nesses materiais
    const results = await pineconeService.searchSimilarContent(
      query,
      userId,
      {
        materialIds,
        topK,
        minSimilarity,
      }
    );

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

    // 4. Extrair tópicos disponíveis dos materiais (títulos simplificados)
    const availableTopics = materials
      .map(m => m.title)
      .filter((title): title is string => !!title)
      .slice(0, 10); // Limitar a 10 tópicos principais

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
