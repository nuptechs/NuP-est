import { embeddingsService } from './embeddings';
import { pineconeService } from './pinecone';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

interface ScrapingOptions {
  maxPages?: number;
  maxDepth?: number;
  includeExternalLinks?: boolean;
  delay?: number;
}

export class WebScraperService {
  private visitedUrls = new Set<string>();
  private baseUrl = '';
  
  constructor() {}

  /**
   * Escaneia uma URL completa incluindo suas paginações
   */
  async scrapeWebsite(
    url: string, 
    searchTypes: string[],
    siteId: string,
    options: ScrapingOptions = {}
  ): Promise<void> {
    try {
      console.log(`🕷️ Iniciando scraping de: ${url}`);
      
      const {
        maxPages = 50,
        maxDepth = 3,
        includeExternalLinks = false,
        delay = 1000
      } = options;

      this.baseUrl = new URL(url).origin;
      this.visitedUrls.clear();

      // Fazer scraping real da URL
      const scrapedPages = await this.realScrapeWithPagination(url, maxPages, maxDepth);
      
      console.log(`📄 Coletadas ${scrapedPages.length} páginas para processamento`);

      // Processar cada página coletada
      for (let index = 0; index < scrapedPages.length; index++) {
        const page = scrapedPages[index];
        console.log(`📝 Processando página ${index + 1}/${scrapedPages.length}: ${page.title}`);
        
        // Quebrar conteúdo em chunks
        const chunks = this.chunkContent(page.content, 1000);
        
        // Preparar metadados
        const metadata = {
          userId: 'admin_scraped', // Namespace para conteúdo scrapado
          title: page.title,
          category: 'website',
          siteId: siteId,
          sourceUrl: page.url,
          searchTypes: searchTypes.join(','),
          scrapedAt: new Date().toISOString()
        };

        // Enviar para Pinecone
        await pineconeService.upsertDocument(
          `scraped_${siteId}_${index}`,
          chunks,
          metadata
        );

        console.log(`✅ Página processada: ${page.title}`);
        
        // Pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`🎉 Scraping completo! ${scrapedPages.length} páginas processadas e enviadas para Pinecone`);
      
    } catch (error: any) {
      console.error('❌ Erro durante scraping:', error);
      throw error;
    }
  }

  /**
   * Scraping real com paginação usando fetch e cheerio
   */
  private async realScrapeWithPagination(url: string, maxPages: number, maxDepth: number): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];
    const urlsToVisit: { url: string; depth: number }[] = [{ url, depth: 0 }];
    
    while (urlsToVisit.length > 0 && pages.length < maxPages) {
      const { url: currentUrl, depth } = urlsToVisit.shift()!;
      
      if (this.visitedUrls.has(currentUrl) || depth > maxDepth) {
        continue;
      }

      this.visitedUrls.add(currentUrl);
      
      try {
        // Fazer requisição HTTP real e extração de conteúdo
        const page = await this.realExtractPageContent(currentUrl);
        if (page.content.trim()) { // Só adicionar se tiver conteúdo
          pages.push(page);
        }
        
        // Se não atingiu a profundidade máxima, adicionar links encontrados
        if (depth < maxDepth) {
          for (const link of page.links) {
            if (!this.visitedUrls.has(link) && this.isValidUrl(link)) {
              urlsToVisit.push({ url: link, depth: depth + 1 });
            }
          }
        }
        
        console.log(`📊 Coletada: ${page.title} (${pages.length}/${maxPages})`);
        
        // Pausa entre requisições para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.warn(`⚠️ Erro ao processar ${currentUrl}:`, error.message);
      }
    }
    
    return pages;
  }

  /**
   * Versão mock do scraping com paginação
   * Em produção, seria substituído por Puppeteer real
   */
  private async mockScrapeWithPagination(url: string, maxPages: number, maxDepth: number): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];
    const urlsToVisit: { url: string; depth: number }[] = [{ url, depth: 0 }];
    
    while (urlsToVisit.length > 0 && pages.length < maxPages) {
      const { url: currentUrl, depth } = urlsToVisit.shift()!;
      
      if (this.visitedUrls.has(currentUrl) || depth > maxDepth) {
        continue;
      }

      this.visitedUrls.add(currentUrl);
      
      try {
        // Simular requisição HTTP e extração de conteúdo
        const page = await this.mockExtractPageContent(currentUrl);
        pages.push(page);
        
        // Se não atingiu a profundidade máxima, adicionar links encontrados
        if (depth < maxDepth) {
          for (const link of page.links) {
            if (!this.visitedUrls.has(link)) {
              urlsToVisit.push({ url: link, depth: depth + 1 });
            }
          }
        }
        
        console.log(`📊 Coletada: ${page.title} (${pages.length}/${maxPages})`);
        
      } catch (error: any) {
        console.warn(`⚠️ Erro ao processar ${currentUrl}:`, error.message);
      }
    }
    
    return pages;
  }

  /**
   * Mock de extração de conteúdo da página
   * Em produção, usaria Puppeteer, Cheerio ou similar
   */
  private async mockExtractPageContent(url: string): Promise<ScrapedPage> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Determinar tipo de conteúdo baseado na URL
    const urlLower = url.toLowerCase();
    let content = '';
    let title = '';
    let links: string[] = [];
    
    if (urlLower.includes('cebraspe') || urlLower.includes('concurso')) {
      title = `Concurso Público - ${new URL(url).pathname}`;
      content = `
        Informações sobre concurso público organizado pelo Cebraspe.
        
        Detalhes do Concurso:
        - Órgão: Secretaria de Educação
        - Cargo: Professor de Ensino Fundamental
        - Vagas: 100 vagas
        - Salário: R$ 3.500,00 a R$ 5.200,00
        - Inscrições: De 01/10/2025 a 30/10/2025
        - Prova: 15/12/2025
        
        Requisitos:
        - Ensino Superior Completo em Pedagogia ou Licenciatura
        - Experiência mínima de 2 anos (desejável)
        
        Etapas do Concurso:
        1. Prova Objetiva (eliminatória e classificatória)
        2. Prova de Títulos (classificatória)
        3. Exame Médico (eliminatório)
        
        Conteúdo Programático:
        - Língua Portuguesa
        - Matemática
        - Conhecimentos Pedagógicos
        - Conhecimentos Específicos do Cargo
        
        Como se inscrever:
        Acesse o site oficial e preencha o formulário de inscrição.
        Taxa de inscrição: R$ 85,00
      `;
      
      links = [
        `${this.baseUrl}/edital-completo`,
        `${this.baseUrl}/cronograma`,
        `${this.baseUrl}/local-prova`,
        `${this.baseUrl}/resultado`
      ];
      
    } else if (urlLower.includes('vestibular') || urlLower.includes('enem')) {
      title = `Vestibular - ${new URL(url).pathname}`;
      content = `
        Processo Seletivo para Ensino Superior - Vestibular 2025
        
        Informações Gerais:
        - Instituição: Universidade Federal de Exemplo
        - Modalidade: Vestibular + ENEM
        - Vagas Oferecidas: 2.500 vagas
        - Cursos: 45 cursos de graduação
        
        Cronograma:
        - Inscrições: 15/08/2025 a 15/09/2025
        - Primeira Fase: 20/10/2025
        - Segunda Fase: 25/11/2025
        - Resultado: 15/01/2026
        
        Modalidades de Ingresso:
        - Ampla Concorrência: 60%
        - Cotas Sociais: 25%
        - Cotas Étnico-Raciais: 15%
        
        Cursos Mais Concorridos:
        - Medicina (relação 50 candidatos/vaga)
        - Direito (relação 35 candidatos/vaga)
        - Engenharia (relação 25 candidatos/vaga)
        
        Disciplinas da Prova:
        - Redação
        - Língua Portuguesa e Literatura
        - Matemática
        - História e Geografia
        - Física, Química e Biologia
        - Língua Estrangeira (Inglês ou Espanhol)
      `;
      
      links = [
        `${this.baseUrl}/cursos-oferecidos`,
        `${this.baseUrl}/manual-candidato`,
        `${this.baseUrl}/simulados`,
        `${this.baseUrl}/biblioteca-virtual`
      ];
      
    } else if (urlLower.includes('escola') || urlLower.includes('educacao')) {
      title = `Educação Básica - ${new URL(url).pathname}`;
      content = `
        Sistema de Ensino Fundamental e Médio
        
        Estrutura Educacional:
        - Ensino Fundamental I (1º ao 5º ano)
        - Ensino Fundamental II (6º ao 9º ano)
        - Ensino Médio (1º ao 3º ano)
        - Educação de Jovens e Adultos (EJA)
        
        Metodologia:
        - Ensino híbrido com tecnologia
        - Projetos interdisciplinares
        - Acompanhamento pedagógico individual
        - Preparação para vestibulares e ENEM
        
        Atividades Extracurriculares:
        - Esportes (futebol, vôlei, basquete)
        - Artes (teatro, música, dança)
        - Idiomas (inglês, espanhol)
        - Robótica e programação
        
        Avaliação e Acompanhamento:
        - Sistema de avaliação continuada
        - Reuniões pedagógicas trimestrais
        - Portal do aluno para acompanhamento
        - Orientação vocacional no ensino médio
        
        Recursos e Infraestrutura:
        - Laboratórios de ciências
        - Biblioteca digital
        - Quadras esportivas
        - Auditório multimídia
      `;
      
      links = [
        `${this.baseUrl}/projeto-pedagogico`,
        `${this.baseUrl}/calendario-escolar`,
        `${this.baseUrl}/eventos`,
        `${this.baseUrl}/matriculas`
      ];
      
    } else {
      title = `Página Web - ${new URL(url).hostname}`;
      content = `
        Conteúdo genérico extraído da página web.
        URL: ${url}
        
        Esta é uma página que foi processada pelo sistema de scraping.
        O conteúdo real seria extraído usando ferramentas como Puppeteer
        ou Cheerio em um ambiente de produção.
        
        Informações que seriam coletadas:
        - Texto principal da página
        - Títulos e subtítulos
        - Links internos e externos
        - Metadados relevantes
        - Estrutura de navegação
        
        Este conteúdo mock permite testar o sistema de embeddings
        e busca sem depender de scraping real.
      `;
      
      links = [
        `${this.baseUrl}/sobre`,
        `${this.baseUrl}/contato`,
        `${this.baseUrl}/servicos`
      ];
    }
    
    return {
      url,
      title,
      content: content.trim(),
      links: links.filter(link => !this.visitedUrls.has(link))
    };
  }

  /**
   * Extração real de conteúdo da página usando fetch e cheerio
   */
  private async realExtractPageContent(url: string): Promise<ScrapedPage> {
    try {
      console.log(`🔍 Fazendo scraping de: ${url}`);
      
      // Fazer requisição HTTP com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remover scripts, styles e outros elementos não desejados
      $('script, style, nav, header, footer, .menu, .navigation').remove();

      // Extrair título
      let title = $('title').text().trim() || $('h1').first().text().trim() || 'Página sem título';

      // Extrair conteúdo principal
      let content = '';
      
      // Tentar extrair conteúdo de containers principais
      const contentSelectors = [
        'main',
        '.content',
        '.main-content', 
        '#content',
        'article',
        '.post',
        '.entry-content',
        'body'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          if (content.length > 100) { // Se encontrou conteúdo substancial, usar este
            break;
          }
        }
      }

      // Se não encontrou conteúdo nos seletores específicos, usar todo o body
      if (!content || content.length < 100) {
        content = $('body').text().trim();
      }

      // Limpar conteúdo (remover quebras de linha excessivas, espaços)
      content = content.replace(/\s+/g, ' ').trim();

      // Extrair links da mesma origem
      const links: string[] = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const absoluteUrl = this.resolveUrl(href, url);
          if (absoluteUrl && this.isSameOrigin(absoluteUrl, url)) {
            links.push(absoluteUrl);
          }
        }
      });

      // Remover duplicatas dos links
      const uniqueLinks = Array.from(new Set(links));

      console.log(`✅ Coletado: ${title} - ${content.length} caracteres, ${uniqueLinks.length} links`);

      return {
        url,
        title,
        content,
        links: uniqueLinks.slice(0, 20) // Limitar a 20 links por página
      };

    } catch (error: any) {
      console.warn(`⚠️ Erro ao fazer scraping de ${url}:`, error.message);
      return {
        url,
        title: `Erro ao carregar: ${url}`,
        content: '',
        links: []
      };
    }
  }

  /**
   * Resolve URL relativa para absoluta
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se duas URLs são da mesma origem
   */
  private isSameOrigin(url1: string, url2: string): boolean {
    try {
      const origin1 = new URL(url1).origin;
      const origin2 = new URL(url2).origin;
      return origin1 === origin2;
    } catch {
      return false;
    }
  }

  /**
   * Valida se uma URL é válida e deve ser processada
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Filtrar apenas HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      // Filtrar arquivos que não queremos processar
      const pathname = parsedUrl.pathname.toLowerCase();
      const excludeExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.gif'];
      if (excludeExtensions.some(ext => pathname.endsWith(ext))) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Quebra conteúdo em chunks para processamento
   */
  private chunkContent(content: string, chunkSize: number = 1000): { content: string; chunkIndex: number }[] {
    const words = content.split(/\s+/);
    const chunks: { content: string; chunkIndex: number }[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        content: chunk,
        chunkIndex: chunks.length
      });
    }
    
    return chunks.length > 0 ? chunks : [{ content, chunkIndex: 0 }];
  }

  /**
   * Busca conteúdo scrapado por tipo
   */
  async searchScrapedContent(
    query: string,
    searchTypes: string[],
    options: {
      topK?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const { topK = 5, minSimilarity = 0.3 } = options;
      
      console.log(`🔍 Buscando em conteúdo scrapado: "${query}"`);
      console.log(`📋 Tipos de busca: ${searchTypes.join(', ')}`);
      
      // Buscar no Pinecone usando o namespace de admin
      const results = await pineconeService.searchSimilarContent(
        query,
        'admin_scraped',
        {
          topK,
          category: 'website',
          minSimilarity
        }
      );
      
      // Filtrar por tipos de busca
      const filteredResults = results.filter((result: any) => {
        const resultTypes = result.metadata?.searchTypes?.split(',') || [];
        return searchTypes.some(type => resultTypes.includes(type));
      });
      
      console.log(`📊 Encontrados ${filteredResults.length} resultados em conteúdo scrapado`);
      
      return filteredResults.map((result: any) => ({
        id: `scraped_${Date.now()}_${Math.random()}`,
        name: result.title,
        url: result.metadata?.sourceUrl || '',
        description: result.content.substring(0, 200) + '...',
        fullContent: result.content,
        score: result.similarity,
        source: 'scraped'
      }));
      
    } catch (error) {
      console.error('❌ Erro na busca de conteúdo scrapado:', error);
      return [];
    }
  }
}

export const webScraperService = new WebScraperService();