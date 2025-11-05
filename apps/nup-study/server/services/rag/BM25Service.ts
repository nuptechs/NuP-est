/**
 * BM25 (Best Matching 25) - Algoritmo de ranking baseado em palavras-chave
 * Complementa busca semântica com matching exato de termos
 */

interface Document {
  id: string;
  content: string;
  metadata?: any;
}

interface BM25Result {
  id: string;
  score: number;
  metadata?: any;
}

export class BM25Service {
  private k1 = 1.5; // Controla importância da frequência do termo
  private b = 0.75; // Controla importância do tamanho do documento

  /**
   * Tokeniza texto (lowercase, remove pontuação, split por espaços)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .split(/\s+/)
      .filter(token => token.length > 2); // Remove palavras muito curtas
  }

  /**
   * Calcula IDF (Inverse Document Frequency) para cada termo
   */
  private calculateIDF(documents: Document[]): Map<string, number> {
    const N = documents.length;
    const termDocCount = new Map<string, number>();

    // Conta em quantos documentos cada termo aparece
    documents.forEach(doc => {
      const tokens = new Set(this.tokenize(doc.content));
      tokens.forEach(token => {
        termDocCount.set(token, (termDocCount.get(token) || 0) + 1);
      });
    });

    // Calcula IDF: log((N - df + 0.5) / (df + 0.5) + 1)
    const idf = new Map<string, number>();
    termDocCount.forEach((df, term) => {
      const idfValue = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      idf.set(term, idfValue);
    });

    return idf;
  }

  /**
   * Calcula BM25 score para query contra documentos
   */
  search(query: string, documents: Document[], topK: number = 10): BM25Result[] {
    if (documents.length === 0) {
      return [];
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Calcular IDF
    const idf = this.calculateIDF(documents);

    // Calcular comprimento médio dos documentos
    const docLengths = documents.map(doc => this.tokenize(doc.content).length);
    const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

    // Calcular score BM25 para cada documento
    const scores: BM25Result[] = documents.map((doc, docIdx) => {
      const docTokens = this.tokenize(doc.content);
      const docLength = docTokens.length;

      // Contagem de termos no documento
      const termFreq = new Map<string, number>();
      docTokens.forEach(token => {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      });

      // Calcular BM25 score
      let score = 0;
      queryTokens.forEach(queryTerm => {
        const tf = termFreq.get(queryTerm) || 0;
        const idfValue = idf.get(queryTerm) || 0;

        // BM25 formula
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength));
        
        score += idfValue * (numerator / denominator);
      });

      return {
        id: doc.id,
        score,
        metadata: doc.metadata,
      };
    });

    // Ordenar por score decrescente e retornar top-K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Normaliza scores BM25 para range 0-1
   */
  normalizeScores(results: BM25Result[]): BM25Result[] {
    if (results.length === 0) return [];
    
    const maxScore = Math.max(...results.map(r => r.score));
    if (maxScore === 0) return results;

    return results.map(r => ({
      ...r,
      score: r.score / maxScore,
    }));
  }

  /**
   * Extrai keywords relevantes de um texto (para metadata enrichment)
   */
  extractKeywords(text: string, maxKeywords: number = 20): string[] {
    const tokens = this.tokenize(text);
    const tokenFreq = new Map<string, number>();

    tokens.forEach(token => {
      if (token.length > 3) { // Apenas palavras com mais de 3 caracteres
        tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
      }
    });

    // Ordenar por frequência e retornar top keywords
    return Array.from(tokenFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([keyword]) => keyword);
  }
}

export const bm25Service = new BM25Service();
