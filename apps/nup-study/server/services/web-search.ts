interface WebSearchResult {
  title: string;
  content: string;
  url: string;
  relevance: number;
}

interface SearchEngine {
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>;
}

class MockWebSearch implements SearchEngine {
  async search(query: string, maxResults = 3): Promise<WebSearchResult[]> {
    // Para desenvolvimento, vamos simular alguns resultados web
    // Em produção, isso seria substituído por uma API real como Google Search ou Perplexity
    
    const mockResults: WebSearchResult[] = [
      {
        title: "Informações Acadêmicas Atualizadas",
        content: `Informações complementares sobre ${query}. Este é um resultado simulado que representa informações externas que complementariam sua base de conhecimento pessoal.`,
        url: "https://exemplo.com/fonte1",
        relevance: 0.9
      },
      {
        title: "Recursos de Estudo Adicionais", 
        content: `Recursos externos e materiais de apoio relacionados a ${query}. Em um sistema real, isso viria de fontes acadêmicas confiáveis.`,
        url: "https://exemplo.com/fonte2", 
        relevance: 0.8
      }
    ];

    return mockResults.slice(0, maxResults);
  }
}

class WebSearchService {
  private searchEngine: SearchEngine;

  constructor() {
    // Por enquanto usando mock, mas pode ser facilmente substituído
    this.searchEngine = new MockWebSearch();
  }

  async search(query: string, maxResults = 3): Promise<WebSearchResult[]> {
    try {
      return await this.searchEngine.search(query, maxResults);
    } catch (error) {
      console.error("Erro na busca web:", error);
      return [];
    }
  }

  // Determina se uma pergunta precisa de informações externas
  needsExternalInfo(question: string, hasKnowledgeBase: boolean): boolean {
    const externalKeywords = [
      'atual', 'recente', 'últim', 'nov', 'agora', 'hoje',
      'notícias', 'tendências', 'mercado', 'preço', 'valor',
      'comparar', 'alternativas', 'opções', 'diferenças',
      'como fazer', 'tutorial', 'passo a passo', 'exemplo prático'
    ];

    const questionLower = question.toLowerCase();
    const hasExternalKeyword = externalKeywords.some(keyword => 
      questionLower.includes(keyword)
    );

    // Se não tem base de conhecimento ou tem palavras-chave que sugerem info externa
    return !hasKnowledgeBase || hasExternalKeyword;
  }
}

export const webSearch = new WebSearchService();
export type { WebSearchResult };