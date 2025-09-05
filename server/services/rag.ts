import { pineconeService } from './pinecone';
import { aiChatWithContext } from './ai/index';

interface RAGContext {
  content: string;
  similarity: number;
  title: string;
  category: string;
}

interface RAGOptions {
  userId: string;
  query: string;
  category?: string;
  maxContextLength?: number;
  minSimilarity?: number;
  enableReRanking?: boolean;
  initialTopK?: number;
  finalTopK?: number;
  documentId?: string; // NOVO: filtrar por documento específico
}

export class RAGService {
  
  /**
   * Método principal do RAG - sempre consulta a base antes de responder
   */
  async generateContextualResponse(options: RAGOptions): Promise<{
    response: string;
    contextUsed: RAGContext[];
    hasContext: boolean;
  }> {
    const {
      userId,
      query,
      category,
      maxContextLength = 4000,
      minSimilarity = 0.1,
      documentId
    } = options;

    try {
      console.log(`🔍 RAG: Processando query "${query.substring(0, 100)}..."`);

      // 1. SEMPRE buscar contexto relevante na base primeiro
      const initialTopK = options.enableReRanking ? (options.initialTopK || 15) : (options.finalTopK || 5);
      const rawResults = await pineconeService.searchSimilarContent(query, userId, {
        topK: initialTopK,
        // Não filtrar por categoria - buscar todos os dados do usuário  
        minSimilarity,
        documentId // CRÍTICO: filtrar por documento específico se fornecido
      });

      // 2. Re-ranking opcional dos resultados usando LLM
      let contextResults = rawResults;
      if (options.enableReRanking && rawResults.length > 1) {
        console.log(`🧠 RAG: Re-ranking ${rawResults.length} resultados para melhor relevância...`);
        contextResults = await this.reRankResults(query, rawResults, options.finalTopK || 5);
        console.log(`📈 RAG: Re-ranking concluído, selecionados ${contextResults.length} resultados mais relevantes`);
      }

      // 3. Preparar contexto limitado por tamanho
      let contextText = '';
      let usedContext: RAGContext[] = [];
      let currentLength = 0;

      for (const result of contextResults) {
        const resultLength = result.content.length;
        if (currentLength + resultLength <= maxContextLength) {
          contextText += `[${result.title}]\n${result.content}\n\n---\n\n`;
          usedContext.push(result);
          currentLength += resultLength;
        } else {
          break;
        }
      }

      const hasContext = usedContext.length > 0;

      // 4. Construir prompt inteligente
      const prompt = this.buildRAGPrompt(query, contextText, hasContext);

      console.log(`📚 RAG: ${hasContext ? `Usando ${usedContext.length} fontes da base` : 'Sem contexto da base, usando conhecimento geral'}`);

      // 5. Gerar resposta usando sistema de IA com injeção de dependência
      const systemPrompt = `Você é um assistente de estudos inteligente que SEMPRE prioriza informações da base de conhecimento do usuário. 

REGRAS CRÍTICAS:
- Se há contexto da base pessoal: BASE sua resposta EXCLUSIVAMENTE nessas informações
- Se NÃO há contexto: Use conhecimento geral, mas MENCIONE que não encontrou informações específicas na base do usuário
- SEMPRE seja preciso, didático e organizado
- Use formatação markdown para melhor apresentação
- Cite as fontes quando usar informações da base`;

      const aiResponse = await aiChatWithContext(prompt, systemPrompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const assistantResponse = aiResponse.content || 'Desculpe, não consegui gerar uma resposta.';

      console.log(`✅ RAG: Resposta gerada com ${assistantResponse.length} caracteres`);

      return {
        response: assistantResponse,
        contextUsed: usedContext,
        hasContext
      };

    } catch (error: any) {
      console.error('❌ RAG Error:', error);
      
      // Tratamento específico para diferentes tipos de erro
      let errorMessage = "Desculpe, ocorreu um erro ao processar sua pergunta.";
      
      if (error?.status === 429 || error?.code === 'insufficient_quota') {
        errorMessage = "⚠️ **Sua cota da OpenAI acabou!** Por favor, verifique seu plano e faturamento no painel da OpenAI.";
      } else if (error?.status === 401) {
        errorMessage = "🔑 **Erro de autenticação** - Verifique sua chave de API.";
      } else if (error?.status === 400) {
        errorMessage = "📝 **Erro na solicitação** - Por favor, reformule sua pergunta.";
      } else if (error?.message?.includes('OpenRouter falhou')) {
        errorMessage = "🔄 **Serviço de IA temporariamente indisponível** - Tente novamente em alguns instantes.";
      }
      
      return {
        response: errorMessage,
        contextUsed: [],
        hasContext: false
      };
    }
  }

  /**
   * Re-ordena resultados usando LLM para melhor relevância contextual
   */
  private async reRankResults(
    query: string, 
    results: RAGContext[], 
    finalCount: number = 5
  ): Promise<RAGContext[]> {
    try {
      // Preparar resultados para avaliação
      const resultsForRanking = results.map((result, index) => ({
        index,
        title: result.title,
        category: result.category,
        similarity: result.similarity,
        preview: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
      }));

      const systemPrompt = `Você é um especialista em relevância de documentos. Sua tarefa é reordenar os documentos por relevância específica para a query do usuário.

Critérios de avaliação:
1. Relevância direta ao tópico da query
2. Qualidade e especificidade da informação
3. Aplicabilidade prática para responder a query
4. Completude da informação no documento

Retorne APENAS uma lista de índices dos documentos ordenados do mais relevante para o menos relevante.
Formato: [2, 0, 4, 1, 3] (apenas números separados por vírgula)`;

      const userPrompt = `QUERY DO USUÁRIO: "${query}"

DOCUMENTOS PARA AVALIAR:
${resultsForRanking.map(r => 
        `[${r.index}] ${r.title} (${r.category}) [Sim: ${(r.similarity * 100).toFixed(1)}%]
${r.preview}`
      ).join('\n\n')}

Reordene os ${Math.min(finalCount, results.length)} documentos mais relevantes para responder a query.
RESPOSTA:`;

      const aiResponse = await aiChatWithContext(userPrompt, systemPrompt, {
        temperature: 0.1,
        maxTokens: 100
      });

      // Extrair índices da resposta
      const responseText = aiResponse.content || '';
      const indexMatches = responseText.match(/\d+/g);
      
      if (!indexMatches) {
        console.warn('⚠️ Re-ranking falhou, usando ordem original');
        return results.slice(0, finalCount);
      }

      // Reordenar baseado na resposta do LLM
      const rankedResults: RAGContext[] = [];
      const usedIndices = new Set<number>();

      for (const indexStr of indexMatches) {
        const index = parseInt(indexStr);
        if (index >= 0 && index < results.length && !usedIndices.has(index)) {
          rankedResults.push(results[index]);
          usedIndices.add(index);
          if (rankedResults.length >= finalCount) break;
        }
      }

      // Adicionar documentos restantes se necessário
      if (rankedResults.length < finalCount) {
        for (let i = 0; i < results.length && rankedResults.length < finalCount; i++) {
          if (!usedIndices.has(i)) {
            rankedResults.push(results[i]);
          }
        }
      }

      console.log(`🎯 Re-ranking mudou ordem: ${indexMatches.slice(0, rankedResults.length).join(' → ')}`);
      return rankedResults;

    } catch (error) {
      console.error('❌ Erro no re-ranking, usando ordem original:', error);
      return results.slice(0, finalCount);
    }
  }

  /**
   * Constrói o prompt otimizado para RAG
   */
  private buildRAGPrompt(query: string, contextText: string, hasContext: boolean): string {
    if (hasContext) {
      return `Baseando-se EXCLUSIVAMENTE nas informações da base de conhecimento abaixo, responda à pergunta do usuário.

CONTEXTO DA BASE DE CONHECIMENTO:
${contextText}

PERGUNTA DO USUÁRIO:
${query}

INSTRUÇÕES:
- Use APENAS as informações fornecidas no contexto acima
- Se a pergunta não puder ser respondida com o contexto, diga claramente
- Organize a resposta de forma didática com markdown
- Cite as fontes entre [colchetes] quando relevante
- Seja preciso e educativo`;
    } else {
      return `O usuário fez a seguinte pergunta, mas NÃO encontrei informações específicas na base de conhecimento dele:

PERGUNTA: ${query}

INSTRUÇÕES:
- Comece mencionando que não encontrou informações específicas na base pessoal do usuário
- Forneça uma resposta educativa usando conhecimento geral
- Sugira que ele adicione materiais relacionados à sua base de conhecimento
- Use formatação markdown para melhor apresentação`;
    }
  }

  /**
   * Adiciona novo documento à base RAG
   */
  async addDocumentToRAG(
    documentId: string,
    title: string,
    content: string,
    userId: string,
    category: string = 'Geral'
  ) {
    try {
      console.log(`📝 RAG: Adicionando documento "${title}" à base...`);

      // 1. Dividir conteúdo em chunks inteligentes
      const chunks = this.splitIntoChunks(content);
      
      // 2. Adicionar ao Pinecone
      await pineconeService.upsertDocument(documentId, chunks, {
        userId,
        title,
        category
      });

      console.log(`✅ RAG: Documento "${title}" indexado com ${chunks.length} chunks`);
      
    } catch (error) {
      console.error('❌ RAG: Erro ao adicionar documento:', error);
      throw error;
    }
  }

  /**
   * Remove documento da base RAG
   */
  async removeDocumentFromRAG(documentId: string) {
    try {
      await pineconeService.deleteDocument(documentId);
      console.log(`🗑️ RAG: Documento ${documentId} removido da base`);
    } catch (error) {
      console.error('❌ RAG: Erro ao remover documento:', error);
      throw error;
    }
  }

  /**
   * Divide texto em chunks inteligentes
   */
  private splitIntoChunks(text: string, maxChunkSize: number = 1000): { content: string; chunkIndex: number }[] {
    const chunks: { content: string; chunkIndex: number }[] = [];
    
    // Dividir por parágrafos primeiro
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      // Se o parágrafo sozinho é maior que o limite, dividir por frases
      if (paragraph.length > maxChunkSize) {
        // Salvar chunk atual se não estiver vazio
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            chunkIndex: chunkIndex++
          });
          currentChunk = '';
        }
        
        // Dividir parágrafo grande em frases
        const sentences = paragraph.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (sentence.trim()) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              if (currentChunk.trim()) {
                chunks.push({
                  content: currentChunk.trim(),
                  chunkIndex: chunkIndex++
                });
              }
              currentChunk = sentence.trim() + '.';
            } else {
              currentChunk += sentence.trim() + '.';
            }
          }
        }
      } else {
        // Parágrafo normal
        if (currentChunk.length + paragraph.length > maxChunkSize) {
          if (currentChunk.trim()) {
            chunks.push({
              content: currentChunk.trim(),
              chunkIndex: chunkIndex++
            });
          }
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
    }
    
    // Adicionar último chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++
      });
    }
    
    return chunks;
  }

  /**
   * Estatísticas da base RAG
   */
  async getRAGStats() {
    try {
      return await pineconeService.getIndexStats();
    } catch (error) {
      console.error('❌ RAG: Erro ao obter estatísticas:', error);
      return { totalVectors: 0, dimension: 0, indexFullness: 0 };
    }
  }
}

export const ragService = new RAGService();