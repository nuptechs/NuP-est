import { GoogleGenerativeAI } from "@google/generative-ai";

// Usar Google Gemini para embeddings (gratuito)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export class EmbeddingsService {
  
  /**
   * Gera embeddings para um texto usando Google Gemini (gratuito)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error("Embedding não retornado pela API");
      }
      
      return result.embedding.values;
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
      const embeddings: number[][] = [];
      
      // Processar em lotes para evitar rate limits
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
        
        // Pequena pausa entre requests para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return embeddings;
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