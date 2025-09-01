import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class EmbeddingsService {
  
  /**
   * Gera embeddings para um texto usando OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // modelo mais eficiente
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Erro ao gerar embedding:", error);
      throw new Error("Falha ao gerar embedding");
    }
  }

  /**
   * Gera embeddings para múltiplos textos (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error("Erro ao gerar embeddings em lote:", error);
      throw new Error("Falha ao gerar embeddings");
    }
  }

  /**
   * Calcula a similaridade de cosseno entre dois vetores
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vetores devem ter o mesmo tamanho");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

  /**
   * Prepara texto para embedding (limpa e normaliza)
   */
  prepareTextForEmbedding(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normaliza espaços
      .replace(/\n+/g, '\n') // Normaliza quebras de linha
      .substring(0, 8000); // Limita tamanho (OpenAI tem limite)
  }
}

export const embeddingsService = new EmbeddingsService();