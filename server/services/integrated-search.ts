import { cebraspeEmbeddingsService, ConcursoDetalhado } from './cebraspe';
import { webScraperService } from './web-scraper';
import { db } from '../db';
import { searchSites, siteSearchTypes } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Serviço integrado que combina busca do Cebraspe com sites configurados
 */
export class IntegratedSearchService {
  
  /**
   * Mapeia tipos de busca para categorias de concurso
   */
  private getSearchCategoriesFromTypes(searchTypes: string[]): string[] {
    const categoryMap: Record<string, string[]> = {
      'concurso_publico': ['concurso', 'governo', 'publico'],
      'vestibular': ['vestibular', 'universidade', 'enem'],
      'escola': ['escola', 'educacao', 'ensino'],
      'faculdade': ['faculdade', 'superior', 'graduacao'],
      'desenvolvimento_profissional': ['profissional', 'capacitacao', 'certificacao'],
      'outras': ['geral', 'diversos']
    };
    
    const categories: string[] = [];
    for (const type of searchTypes) {
      if (categoryMap[type]) {
        categories.push(...categoryMap[type]);
      }
    }
    
    return categories.length > 0 ? categories : ['geral'];
  }

  /**
   * Determina tipos de busca baseado na query do usuário
   */
  private inferSearchTypesFromQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const types: string[] = [];

    // Palavras-chave para concurso público
    if (queryLower.match(/\b(concurso|público|governo|prefeitura|estado|federal|municipal|tribunal|polícia|bombeiro|fiscal|auditor)\b/)) {
      types.push('concurso_publico');
    }

    // Palavras-chave para vestibular
    if (queryLower.match(/\b(vestibular|enem|universidade|faculdade|medicina|direito|engenharia|sisu|prouni)\b/)) {
      types.push('vestibular');
    }

    // Palavras-chave para escola
    if (queryLower.match(/\b(escola|ensino|fundamental|médio|professor|pedagogia|educação)\b/)) {
      types.push('escola');
    }

    // Palavras-chave para faculdade
    if (queryLower.match(/\b(superior|graduação|bacharelado|licenciatura|pós|mestrado|doutorado)\b/)) {
      types.push('faculdade');
    }

    // Palavras-chave para desenvolvimento profissional
    if (queryLower.match(/\b(certificação|capacitação|treinamento|curso|profissional|qualificação)\b/)) {
      types.push('desenvolvimento_profissional');
    }

    // Se não encontrou nenhum tipo específico, usar concurso público como padrão
    return types.length > 0 ? types : ['concurso_publico'];
  }

  /**
   * Busca sites ativos que correspondem aos tipos de busca
   */
  private async getActiveSitesForTypes(searchTypes: string[]): Promise<string[]> {
    try {
      // Buscar sites ativos
      const activeSites = await db
        .select({ 
          id: searchSites.id,
          name: searchSites.name,
          url: searchSites.url
        })
        .from(searchSites)
        .where(eq(searchSites.isActive, true));

      if (activeSites.length === 0) {
        return [];
      }

      // Buscar tipos de busca para esses sites
      const siteIds = activeSites.map(site => site.id);
      const siteTypesData = await db
        .select()
        .from(siteSearchTypes)
        .where(eq(siteSearchTypes.isEnabled, true));

      // Filtrar sites que têm pelo menos um tipo compatível
      const compatibleSites = activeSites.filter(site => {
        const siteTypes = siteTypesData
          .filter(st => st.siteId === site.id)
          .map(st => st.searchType);
        
        return searchTypes.some(type => siteTypes.includes(type as any));
      });

      console.log(`🌐 Encontrados ${compatibleSites.length} sites compatíveis para tipos: ${searchTypes.join(', ')}`);
      
      return compatibleSites.map(site => site.id);
      
    } catch (error) {
      console.error('❌ Erro ao buscar sites ativos:', error);
      return [];
    }
  }

  /**
   * Busca integrada que combina Cebraspe + sites configurados
   */
  async search(query: string, options: {
    includeWebSites?: boolean;
    maxResults?: number;
    searchTypes?: string[];
  } = {}): Promise<{
    cebraspeResults: ConcursoDetalhado[];
    webResults: any[];
    totalResults: number;
    searchTypes: string[];
  }> {
    try {
      const {
        includeWebSites = true,
        maxResults = 10,
        searchTypes: providedTypes
      } = options;

      console.log(`🔍 Busca integrada iniciada: "${query}"`);

      // Determinar tipos de busca
      const searchTypes = providedTypes || this.inferSearchTypesFromQuery(query);
      console.log(`📋 Tipos de busca inferidos: ${searchTypes.join(', ')}`);

      // Iniciar buscas em paralelo
      const searches = [];

      // 1. Busca no Cebraspe (sempre incluir se for tipo concurso_publico)
      if (searchTypes.includes('concurso_publico')) {
        searches.push(
          cebraspeEmbeddingsService.buscarConcursoPorRAG(query)
            .catch(error => {
              console.warn('⚠️ Erro na busca Cebraspe:', error);
              return [];
            })
        );
      } else {
        searches.push(Promise.resolve([]));
      }

      // 2. Busca em sites configurados (se habilitado)
      if (includeWebSites) {
        searches.push(
          this.searchInConfiguredSites(query, searchTypes, maxResults)
            .catch(error => {
              console.warn('⚠️ Erro na busca de sites configurados:', error);
              return [];
            })
        );
      } else {
        searches.push(Promise.resolve([]));
      }

      // Aguardar resultados
      const [cebraspeResults, webResults] = await Promise.all(searches);

      const totalResults = cebraspeResults.length + webResults.length;

      console.log(`📊 Busca concluída: ${cebraspeResults.length} do Cebraspe + ${webResults.length} de sites = ${totalResults} total`);
      
      // Se não encontrou resultados de sites configurados, adicionar mensagem informativa
      if (webResults.length === 0 && includeWebSites) {
        console.log('ℹ️ Nenhum resultado encontrado nos sites configurados - possivelmente requerem JavaScript');
      }

      return {
        cebraspeResults: cebraspeResults.slice(0, Math.floor(maxResults / 2)),
        webResults: webResults.slice(0, Math.floor(maxResults / 2)),
        totalResults,
        searchTypes
      };

    } catch (error) {
      console.error('❌ Erro na busca integrada:', error);
      throw error;
    }
  }

  /**
   * Busca em sites configurados usando web scraper
   */
  private async searchInConfiguredSites(
    query: string, 
    searchTypes: string[], 
    maxResults: number = 5
  ): Promise<any[]> {
    try {
      // Verificar se há sites configurados para esses tipos
      const activeSiteIds = await this.getActiveSitesForTypes(searchTypes);
      
      if (activeSiteIds.length === 0) {
        console.log('📭 Nenhum site configurado para os tipos de busca especificados');
        return [];
      }

      console.log(`🌐 Buscando em ${activeSiteIds.length} sites configurados...`);

      // Buscar usando o web scraper service
      const results = await webScraperService.searchScrapedContent(
        query,
        searchTypes,
        {
          topK: maxResults,
          minSimilarity: 0.3
        }
      );

      return results;

    } catch (error) {
      console.error('❌ Erro ao buscar em sites configurados:', error);
      return [];
    }
  }

  /**
   * Busca apenas em sites configurados (sem Cebraspe)
   */
  async searchWebsitesOnly(
    query: string,
    searchTypes: string[],
    maxResults: number = 10
  ): Promise<any[]> {
    console.log(`🌐 Busca exclusiva em sites: "${query}" | Tipos: ${searchTypes.join(', ')}`);
    
    return await this.searchInConfiguredSites(query, searchTypes, maxResults);
  }

  /**
   * Lista sites configurados por tipo
   */
  async getConfiguredSitesByType(): Promise<Record<string, any[]>> {
    try {
      const sites = await db
        .select({
          id: searchSites.id,
          name: searchSites.name,
          url: searchSites.url,
          isActive: searchSites.isActive
        })
        .from(searchSites);

      const siteTypesData = await db.select().from(siteSearchTypes);

      const sitesByType: Record<string, any[]> = {};

      for (const site of sites) {
        const types = siteTypesData
          .filter(st => st.siteId === site.id && st.isEnabled)
          .map(st => st.searchType);

        for (const type of types) {
          if (!sitesByType[type]) {
            sitesByType[type] = [];
          }
          sitesByType[type].push(site);
        }
      }

      return sitesByType;

    } catch (error) {
      console.error('❌ Erro ao listar sites por tipo:', error);
      return {};
    }
  }
}

export const integratedSearchService = new IntegratedSearchService();