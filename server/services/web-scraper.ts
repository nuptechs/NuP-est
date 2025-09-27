import { embeddingsService } from './embeddings';
import { pineconeService } from './pinecone';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
// Browser rendering removido - não funciona em ambientes containerizados como Replit

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
      console.log(`🕷️ Iniciando scraping completo de: ${url}`);
      
      const {
        maxPages = 50,
        maxDepth = 3,
        includeExternalLinks = false,
        delay = 1000
      } = options;

      this.baseUrl = new URL(url).origin;
      this.visitedUrls.clear();

      // Validar se a URL é acessível antes de começar
      await this.validateUrl(url);

      // Fazer scraping real da URL
      console.log(`🌐 Coletando páginas com parâmetros: maxPages=${maxPages}, maxDepth=${maxDepth}`);
      const scrapedPages = await this.realScrapeWithPagination(url, maxPages, maxDepth);
      
      if (scrapedPages.length === 0) {
        throw new Error('Nenhuma página foi coletada. Verifique se a URL está acessível.');
      }
      
      console.log(`📄 Coletadas ${scrapedPages.length} páginas para processamento`);

      // Processar cada página coletada
      let processedCount = 0;
      for (let index = 0; index < scrapedPages.length; index++) {
        const page = scrapedPages[index];
        console.log(`📝 Processando página ${index + 1}/${scrapedPages.length}: ${page.title}`);
        
        try {
          // Quebrar conteúdo em chunks
          const chunks = this.chunkContent(page.content, 1000);
          
          if (chunks.length === 0) {
            console.warn(`⚠️ Página sem conteúdo válido: ${page.url}`);
            continue;
          }
          
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

          // Enviar para Pinecone com retry
          await this.sendToPineconeWithRetry(
            `scraped_${siteId}_${index}`,
            chunks,
            metadata
          );

          processedCount++;
          console.log(`✅ Página processada: ${page.title} (${processedCount}/${scrapedPages.length})`);
          
        } catch (pageError: any) {
          console.error(`❌ Erro ao processar página ${page.url}:`, pageError.message);
          // Continuar com a próxima página ao invés de parar
        }
        
        // Pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (processedCount === 0) {
        throw new Error('Nenhuma página foi processada com sucesso.');
      }

      console.log(`🎉 Scraping concluído com sucesso! ${processedCount}/${scrapedPages.length} páginas processadas e enviadas para Pinecone`);
      
    } catch (error: any) {
      console.error('❌ Erro crítico durante scraping:', error);
      throw new Error(`Falha no scraping de ${url}: ${error.message}`);
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
   * Extração real de conteúdo da página usando fetch e cheerio
   */
  private async realExtractPageContent(url: string): Promise<ScrapedPage> {
    try {
      console.log(`🔍 Fazendo scraping de: ${url}`);
      
      // Fazer requisição HTTP com timeout aumentado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout maior para sites lentos
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
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

      // Extrair conteúdo principal com lógica específica para sites de concurso
      let content = '';
      
      let extraData: any = {};

      // Verificar se é página do Cebraspe para usar extração específica
      if (this.isCebraspeUrl(url)) {
        console.log('🏛️ URL do Cebraspe detectada - aplicando lógica específica');
        content = $('body').text().trim();
        
        // Processar dados específicos do Cebraspe
        if (content.length > 100) {
          extraData = this.processCebraspeContent(content, url);
          console.log(`📊 Dados estruturados extraídos: ${extraData.concursos?.length || 0} concursos`);
        }
      }
      
      // Se não extraiu conteúdo específico, usar seletores gerais
      if (!content || content.length < 100) {
        const contentSelectors = [
          'main',
          '.content',
          '.main-content', 
          '#content',
          'article',
          '.post',
          '.entry-content',
          '.container',
          '.lista-concursos',
          '.concurso-item',
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
      }

      // Se ainda não encontrou conteúdo, usar todo o body
      if (!content || content.length < 100) {
        content = $('body').text().trim();
      }

      // Se conteúdo é muito pequeno ou contém JavaScript warning, tentar estratégias alternativas
      if (!content || content.length < 50 || (content.includes('javascript') && content.length < 100)) {
        console.warn(`⚠️ Conteúdo requer JavaScript - site não é compatível com scraping simples`);
        
        // Marcar como site incompatível em vez de tentar browser rendering
        return {
          url,
          title: `${title} (Requer JavaScript)`,
          content: `SITE_REQUIRES_JAVASCRIPT: Este site usa JavaScript dinâmico e não pode ser processado pelo sistema de scraping atual. URL: ${url}`,
          links: []
        };
      }

      // Limpar conteúdo (remover quebras de linha excessivas, espaços)
      content = content.replace(/\s+/g, ' ').trim();

      // Extrair links da mesma origem
      const links: string[] = [];
      $('a[href]').each((_: any, element: any) => {
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
   * Valida se uma URL é acessível antes de iniciar o scraping
   */
  private async validateUrl(url: string): Promise<void> {
    try {
      console.log(`🔗 Validando URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'HEAD', // Usar HEAD para validar sem baixar conteúdo
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`URL não acessível: HTTP ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ URL validada com sucesso: ${url}`);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout ao acessar a URL. Verifique se o site está online.');
      }
      throw new Error(`Erro ao validar URL: ${error.message}`);
    }
  }

  /**
   * Extrai conteúdo específico de páginas do Cebraspe
   * Inclui fallback para páginas que exigem JavaScript
   */
  private extractCebraspeContent($: any, title: string): string {
    // Primeiro verificar se o conteúdo é apenas JavaScript warning
    const bodyText = $('body').text().trim();
    if (bodyText.includes('javascript') && bodyText.length < 100) {
      console.log('⚠️ Página requer JavaScript - será tratada pelo Puppeteer posteriormente');
      return ''; // Retornar vazio para ser processado pelo Puppeteer
    }
    let concursos: string[] = [];
    
    try {
      // Buscar por diferentes padrões de listagem de concursos
      const concursoSelectors = [
        '.lista-concursos .item',
        '.concurso-item',
        '.card-concurso',
        '.concurso',
        '.item-concurso',
        'div[class*="concurso"]',
        'li[class*="concurso"]',
        '.box-concurso',
        'article'
      ];
      
      for (const selector of concursoSelectors) {
        $(selector).each((_, element) => {
          const $item = $(element);
          
          // Extrair informações do concurso
          let nome = '';
          let vagas = '';
          let salario = '';
          let link = '';
          
          // Buscar nome do concurso em vários seletores
          const nomeSelectors = ['h1', 'h2', 'h3', 'h4', '.titulo', '.nome', '.title', 'strong', '.concurso-nome'];
          for (const nomeSelector of nomeSelectors) {
            const nomeEl = $item.find(nomeSelector).first();
            if (nomeEl.length && nomeEl.text().trim()) {
              nome = nomeEl.text().trim();
              break;
            }
          }
          
          // Se não encontrou nome específico, usar texto principal
          if (!nome) {
            nome = $item.text().trim().split('\n')[0].substring(0, 100);
          }
          
          // Buscar vagas
          const vagasText = $item.text();
          const vagasMatch = vagasText.match(/(\d+(?:\.\d+)*)\s*vagas?/i);
          if (vagasMatch) {
            vagas = vagasMatch[0];
          }
          
          // Buscar salário
          const salarioMatch = vagasText.match(/(?:até\s*)?R\$\s*([\d.,]+)/i);
          if (salarioMatch) {
            salario = `Até R$ ${salarioMatch[1]}`;
          }
          
          // Buscar link
          const linkEl = $item.find('a').first();
          if (linkEl.length) {
            link = linkEl.attr('href') || '';
          }
          
          // Se encontrou informações válidas, adicionar à lista
          if (nome && nome.length > 5) {
            let concursoInfo = `CONCURSO: ${nome}`;
            if (vagas) concursoInfo += ` | VAGAS: ${vagas}`;
            if (salario) concursoInfo += ` | SALÁRIO: ${salario}`;
            if (link) concursoInfo += ` | LINK: ${link}`;
            
            concursos.push(concursoInfo);
          }
        });
        
        // Se encontrou concursos com este seletor, parar de buscar
        if (concursos.length > 0) {
          break;
        }
      }
      
      // Se não encontrou via seletores específicos, tentar buscar padrões no texto
      if (concursos.length === 0) {
        const bodyText = $('body').text();
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (const line of lines) {
          // Buscar linhas que parecem ser nomes de concursos
          if (this.isLikelyContestName(line)) {
            const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 5);
            let concursoInfo = `CONCURSO: ${line}`;
            
            // Buscar vagas e salário nas próximas linhas
            for (const nextLine of nextLines) {
              const vagasMatch = nextLine.match(/(\d+(?:\.\d+)*)\s*vagas?/i);
              const salarioMatch = nextLine.match(/(?:até\s*)?R\$\s*([\d.,]+)/i);
              
              if (vagasMatch && !concursoInfo.includes('VAGAS:')) {
                concursoInfo += ` | VAGAS: ${vagasMatch[0]}`;
              }
              if (salarioMatch && !concursoInfo.includes('SALÁRIO:')) {
                concursoInfo += ` | SALÁRIO: Até R$ ${salarioMatch[1]}`;
              }
            }
            
            concursos.push(concursoInfo);
          }
        }
      }
      
    } catch (error) {
      console.warn('Erro ao extrair conteúdo específico do Cebraspe:', error);
    }
    
    // Se encontrou concursos, retornar lista formatada
    if (concursos.length > 0) {
      return `PÁGINA DE CONCURSOS CEBRASPE - ${title}\n\n${concursos.join('\n\n')}`;
    }
    
    // Se não encontrou concursos específicos, retornar texto geral
    return '';
  }
  
  /**
   * Verifica se uma linha de texto parece ser nome de concurso
   */
  private isLikelyContestName(text: string): boolean {
    const contestKeywords = [
      'polícia', 'federal', 'civil', 'militar', 'bombeiros',
      'tribunal', 'trt', 'tre', 'trf', 'tjdft', 'tjba', 'tjce',
      'inss', 'ibama', 'anvisa', 'anatel', 'antt',
      'procurador', 'delegado', 'escrivão', 'agente',
      'auditor', 'técnico', 'analista',
      'prefeitura', 'câmara', 'assembleia',
      'banco', 'banrisul', 'caixa',
      'universidade', 'ifb', 'unb', 'fub'
    ];
    
    const textLower = text.toLowerCase();
    
    // Deve ter pelo menos uma palavra-chave de concurso
    const hasKeyword = contestKeywords.some(keyword => textLower.includes(keyword));
    
    // Deve ter tamanho razoável
    const hasReasonableLength = text.length >= 8 && text.length <= 100;
    
    // Não deve ser apenas números ou caracteres especiais
    const hasLetters = /[a-zA-Z]/.test(text);
    
    return hasKeyword && hasReasonableLength && hasLetters;
  }

  /**
   * Detecta automaticamente se é uma URL do Cebraspe e aplica lógica específica
   */
  private isCebraspeUrl(url: string): boolean {
    return url.includes('cebraspe.org.br') || url.includes('cespe.unb.br');
  }

  /**
   * Processa dados específicos do Cebraspe extraindo informações estruturadas
   */
  private processCebraspeContent(content: string, url: string): {
    concursos: Array<{
      name: string;
      url: string;
      vagas: string;
      salario: string;
      orgao: string;
      cargo: string;
      status: string;
    }>;
  } {
    console.log('🏛️ Processando conteúdo específico do Cebraspe');
    
    const concursos: Array<{
      name: string;
      url: string;
      vagas: string;
      salario: string;
      orgao: string;
      cargo: string;
      status: string;
    }> = [];

    // Regex para extrair concursos do formato Cebraspe
    const concursoRegex = /###\s*([^#]+?)\s*(?:\n.*?(\d+\s+vagas))?.*?(?:Até\s+(R\$[\d.,]+))?.*?\[MAIS INFORMAÇÕES\]\((https:\/\/[^)]+)\)/gs;
    
    let match;
    while ((match = concursoRegex.exec(content)) !== null) {
      const [, nome, vagas, salario, concursoUrl] = match;
      
      if (nome && concursoUrl) {
        concursos.push({
          name: nome.trim(),
          url: concursoUrl.trim(),
          vagas: vagas || '',
          salario: salario || '',
          orgao: this.extractOrgaoFromName(nome.trim()),
          cargo: this.extractCargoFromName(nome.trim()),
          status: url.includes('encerrado') ? 'Encerrado' : 'Disponível'
        });
      }
    }

    console.log(`✅ Extraídos ${concursos.length} concursos do Cebraspe`);
    return { concursos };
  }

  /**
   * Extrai nome do órgão a partir do nome do concurso
   */
  private extractOrgaoFromName(name: string): string {
    const orgaoMap: Record<string, string> = {
      'ABIN': 'Agência Brasileira de Inteligência',
      'AGU': 'Advocacia-Geral da União',
      'ANAC': 'Agência Nacional de Aviação Civil',
      'ANVISA': 'Agência Nacional de Vigilância Sanitária',
      'CBM': 'Corpo de Bombeiros Militar',
      'DPF': 'Departamento de Polícia Federal',
      'PRF': 'Polícia Rodoviária Federal',
      'TCU': 'Tribunal de Contas da União',
      'INSS': 'Instituto Nacional do Seguro Social'
    };

    for (const [sigla, nomeCompleto] of Object.entries(orgaoMap)) {
      if (name.toUpperCase().includes(sigla)) {
        return nomeCompleto;
      }
    }

    return name.split(' ')[0]; // Primeiro termo como fallback
  }

  /**
   * Extrai cargo a partir do nome do concurso
   */
  private extractCargoFromName(name: string): string {
    const cargoMap: Record<string, string> = {
      'DEFENSOR': 'Defensor Público',
      'ADVOGADO': 'Advogado',
      'AUDITOR': 'Auditor',
      'ANALISTA': 'Analista',
      'TÉCNICO': 'Técnico',
      'AGENTE': 'Agente',
      'POLICIAL': 'Policial',
      'BOMBEIRO': 'Bombeiro'
    };

    const nameUpper = name.toUpperCase();
    for (const [termo, cargo] of Object.entries(cargoMap)) {
      if (nameUpper.includes(termo)) {
        return cargo;
      }
    }

    return 'Servidor Público'; // Fallback genérico
  }



  /**
   * Envia dados para Pinecone com retry em caso de erro
   */
  private async sendToPineconeWithRetry(
    id: string,
    chunks: { content: string; chunkIndex: number }[],
    metadata: any,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Processando ${chunks.length} chunks para Pinecone...`);
        
        // Enviar para Pinecone
        await pineconeService.upsertDocument(id, chunks, metadata);
        
        console.log(`📤 Batch ${attempt} enviado para Pinecone`);
        console.log(`✅ Documento ${id} indexado no Pinecone com ${chunks.length} chunks`);
        
        return; // Sucesso, sair da função
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Tentativa ${attempt}/${maxRetries} falhou para ${id}:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw new Error(`Falha ao enviar para Pinecone após ${maxRetries} tentativas: ${lastError?.message}`);
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
      
      // Filtrar por tipos de busca e remover conteúdo inválido
      const filteredResults = results.filter((result: any) => {
        // Remover resultados com conteúdo JavaScript inválido ou marcadores de incompatibilidade
        if (result.content && (result.content.includes('SITE_REQUIRES_JAVASCRIPT') || (result.content.includes('javascript') && result.content.length < 100))) {
          console.log('⚠️ Removendo resultado de site incompatível (requer JavaScript)');
          return false;
        }
        
        // Tentar diferentes estruturas de metadata
        let searchTypesStr = result.metadata?.searchTypes || result.searchTypes || '';
        const resultTypes = searchTypesStr ? searchTypesStr.split(',') : [];
        return searchTypes.some(type => resultTypes.includes(type));
      });

      // Se não há resultados válidos, não retornar nada
      if (filteredResults.length === 0 && results.length > 0) {
        console.log('⚠️ Nenhum resultado válido encontrado nos sites configurados (conteúdo requer JavaScript)');
        return [];
      }
      
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
  /**
   * Valida uma URL para ver se é adequada para scraping
   */
  async validateUrlForScraping(url: string): Promise<{
    valid: boolean;
    accessible: boolean;
    scrapable: boolean;
    method?: 'simple' | 'advanced' | 'unsupported';
    error?: string;
    details?: string;
    suggestions?: string[];
  }> {
    try {
      console.log(`🔍 Validando capacidade de scraping para: ${url}`);

      // Teste 1: Acessibilidade básica
      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NuP-est Bot; Educational Content Indexing)'
          },
          timeout: 10000
        });
      } catch (error) {
        return {
          valid: false,
          accessible: false,
          scrapable: false,
          error: "URL inacessível",
          details: "Não foi possível conectar à URL. Verifique se está correta e acessível."
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          accessible: false,
          scrapable: false,
          error: `Erro HTTP ${response.status}`,
          details: "O servidor retornou um erro. Verifique se a URL está correta."
        };
      }

      console.log(`✅ URL acessível (HTTP ${response.status})`);

      // Teste 2: Tentativa de scraping simples
      try {
        const scrapingTest = await this.testSimpleScraping(url);
        
        if (scrapingTest.success) {
          return {
            valid: true,
            accessible: true,
            scrapable: true,
            method: 'simple',
            details: `Scraping simples funcionou! Encontrado ${scrapingTest.contentLength} caracteres de conteúdo útil.`,
            suggestions: [
              "Esta URL é compatível com scraping simples",
              "O processamento será rápido e eficiente",
              "Conteúdo será indexado automaticamente"
            ]
          };
        }
      } catch (error) {
        console.log(`⚠️ Scraping simples falhou: ${error}`);
      }

      // Teste 3: Verificar se pode usar métodos avançados
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/javascript') || 
          contentType.includes('application/json')) {
        return {
          valid: true,
          accessible: true,
          scrapable: false,
          method: 'unsupported',
          error: "Site requer JavaScript",
          details: "Este site usa conteúdo gerado dinamicamente por JavaScript. Atualmente não é suportado.",
          suggestions: [
            "Procure uma versão alternativa da página",
            "Verifique se existe uma API pública disponível",
            "Entre em contato se este site for essencial"
          ]
        };
      }

      // Site acessível mas scraping simples falhou
      return {
        valid: true,
        accessible: true,
        scrapable: false,
        method: 'advanced',
        error: "Requer método avançado",
        details: "Site acessível mas requer processamento mais avançado. Funcionalidade em desenvolvimento.",
        suggestions: [
          "O site pode usar proteções contra scraping",
          "Conteúdo pode ser carregado dinamicamente",
          "Tentaremos processar com métodos alternativos"
        ]
      };

    } catch (error) {
      console.error(`❌ Erro na validação de scraping:`, error);
      return {
        valid: false,
        accessible: false,
        scrapable: false,
        error: "Erro interno",
        details: "Erro inesperado durante a validação. Tente novamente."
      };
    }
  }

  /**
   * Testa scraping simples em uma URL
   */
  private async testSimpleScraping(url: string): Promise<{
    success: boolean;
    contentLength: number;
    hasUsefulContent: boolean;
  }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NuP-est Bot; Educational Content Indexing)'
        },
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remover scripts, styles e outros elementos desnecessários
      $('script, style, nav, footer, header, .advertisement, .ad').remove();

      // Extrair texto útil
      const bodyText = $('body').text().trim();
      const usefulContent = bodyText
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      const hasUsefulContent = usefulContent.length > 200 && 
        /[a-zA-ZÀ-ÿ]/.test(usefulContent);

      return {
        success: hasUsefulContent,
        contentLength: usefulContent.length,
        hasUsefulContent
      };
    } catch (error) {
      return {
        success: false,
        contentLength: 0,
        hasUsefulContent: false
      };
    }
  }

  /**
   * Processa um website de forma inteligente e progressiva
   */
  async processWebsiteIntelligently(
    url: string,
    searchTypes: string[],
    siteId: string
  ): Promise<{
    success: boolean;
    method: 'simple' | 'structured' | 'advanced' | 'failed';
    documentsProcessed: number;
    error?: string;
    details?: string;
  }> {
    try {
      console.log(`🧠 Iniciando processamento inteligente de: ${url}`);

      // Detectar se é um site com padrão conhecido
      const sitePattern = this.detectSitePattern(url);
      
      if (sitePattern) {
        console.log(`🎯 Padrão detectado: ${sitePattern.name}`);
        return await this.processWithPattern(url, searchTypes, siteId, sitePattern);
      }

      // Tentar scraping simples
      console.log(`🔄 Tentando processamento simples...`);
      try {
        const simpleResult = await this.processWithSimpleScraping(url, searchTypes, siteId);
        if (simpleResult.success) {
          return simpleResult;
        }
      } catch (error) {
        console.log(`⚠️ Processamento simples falhou: ${error}`);
      }

      // Se chegou aqui, tentar método avançado (futuro)
      return {
        success: false,
        method: 'failed',
        documentsProcessed: 0,
        error: "Método de processamento não suportado",
        details: "Este site requer processamento avançado que ainda não está implementado."
      };

    } catch (error) {
      console.error(`❌ Erro no processamento inteligente:`, error);
      return {
        success: false,
        method: 'failed',
        documentsProcessed: 0,
        error: "Erro interno",
        details: String(error)
      };
    }
  }

  /**
   * Detecta padrões conhecidos de sites
   */
  private detectSitePattern(url: string): {
    name: string;
    type: 'competition' | 'education' | 'news' | 'generic';
    patterns: {
      titleSelector?: string;
      contentSelector?: string;
      listSelector?: string;
      linkSelector?: string;
    };
  } | null {
    const urlLower = url.toLowerCase();

    // Padrão para sites de concurso similares ao Cebraspe
    if (urlLower.includes('cebraspe.org.br') || urlLower.includes('cespe.unb.br')) {
      return {
        name: 'Cebraspe/Cespe',
        type: 'competition',
        patterns: {
          titleSelector: 'h3, .titulo, .concurso-nome',
          contentSelector: '.conteudo, .informacoes, .detalhes',
          listSelector: '.lista-concursos, .concursos',
          linkSelector: 'a[href*="concurso"], a[href*="edital"]'
        }
      };
    }

    // Adicionar mais padrões conforme necessário
    return null;
  }

  /**
   * Processa usando padrão específico detectado
   */
  private async processWithPattern(
    url: string,
    searchTypes: string[],
    siteId: string,
    pattern: { name: string; type: string; patterns: any }
  ): Promise<{
    success: boolean;
    method: 'structured';
    documentsProcessed: number;
    details?: string;
  }> {
    console.log(`🏗️ Processando com padrão ${pattern.name}`);

    try {
      // Para padrão Cebraspe, usar lógica existente mas generalizada
      if (pattern.name === 'Cebraspe/Cespe') {
        const result = await this.processCompetitionSite(url, searchTypes, siteId);
        return {
          success: true,
          method: 'structured',
          documentsProcessed: result.count,
          details: `Processado usando padrão de concursos. ${result.count} itens indexados.`
        };
      }

      // Processar outros padrões conforme implementado
      throw new Error(`Padrão ${pattern.name} não implementado ainda`);

    } catch (error) {
      throw new Error(`Erro no processamento com padrão: ${error}`);
    }
  }

  /**
   * Processa usando scraping simples
   */
  private async processWithSimpleScraping(
    url: string,
    searchTypes: string[],
    siteId: string
  ): Promise<{
    success: boolean;
    method: 'simple';
    documentsProcessed: number;
    details?: string;
  }> {
    console.log(`📄 Processando com scraping simples`);

    const pages = await this.realScrapeWithPagination(url, 10, 2);
    
    if (pages.length === 0) {
      throw new Error('Nenhuma página coletada');
    }

    let processedCount = 0;
    for (const page of pages) {
      const chunks = this.chunkContent(page.content, 1000);
      
      for (const chunk of chunks) {
        if (chunk.trim().length > 100) {
          const embedding = await embeddingsService.generateEmbedding(chunk);
          
          await pineconeService.upsertDocument({
            id: `${siteId}-page-${processedCount}-${Date.now()}`,
            content: chunk,
            metadata: {
              url: page.url,
              title: page.title,
              source: 'web-scraping',
              searchTypes: searchTypes,
              siteId: siteId,
              scrapedAt: new Date().toISOString()
            },
            embedding
          });
          
          processedCount++;
        }
      }
    }

    return {
      success: true,
      method: 'simple',
      documentsProcessed: processedCount,
      details: `Processamento simples concluído. ${processedCount} chunks indexados de ${pages.length} páginas.`
    };
  }

  /**
   * Processa site de concursos (generalização da lógica Cebraspe)
   */
  private async processCompetitionSite(
    url: string,
    searchTypes: string[],
    siteId: string
  ): Promise<{ count: number }> {
    console.log(`🏛️ Processando site de concursos`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NuP-est Bot; Educational Content Indexing)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      
      // Processar conteúdo estruturado
      const competitions = this.extractCompetitionsFromContent(content, url);
      
      if (competitions.length === 0) {
        throw new Error('Nenhum concurso encontrado no conteúdo');
      }

      // Indexar cada concurso
      let count = 0;
      for (const competition of competitions) {
        const competitionText = this.formatCompetitionForIndexing(competition);
        const embedding = await embeddingsService.generateEmbedding(competitionText);
        
        await pineconeService.upsertDocument({
          id: `${siteId}-competition-${count}-${Date.now()}`,
          content: competitionText,
          metadata: {
            url: competition.url,
            title: competition.name,
            source: 'competition-site',
            searchTypes: searchTypes,
            siteId: siteId,
            orgao: competition.orgao,
            cargo: competition.cargo,
            status: competition.status,
            scrapedAt: new Date().toISOString()
          },
          embedding
        });
        
        count++;
      }

      console.log(`✅ Indexados ${count} concursos`);
      return { count };

    } catch (error) {
      console.error(`❌ Erro no processamento de concursos:`, error);
      throw error;
    }
  }

  /**
   * Extrai concursos do conteúdo (versão genérica)
   */
  private extractCompetitionsFromContent(content: string, url: string): Array<{
    name: string;
    url: string;
    vagas: string;
    salario: string;
    orgao: string;
    cargo: string;
    status: string;
  }> {
    const competitions: Array<{
      name: string;
      url: string;
      vagas: string;
      salario: string;
      orgao: string;
      cargo: string;
      status: string;
    }> = [];

    // Padrão Cebraspe (mantido por compatibilidade)
    const cebraspeRegex = /###\s*([^#]+?)\s*(?:\n.*?(\d+\s+vagas))?.*?(?:Até\s+(R\$[\d.,]+))?.*?\[MAIS INFORMAÇÕES\]\((https:\/\/[^)]+)\)/gs;
    
    let match;
    while ((match = cebraspeRegex.exec(content)) !== null) {
      const [, nome, vagas, salario, concursoUrl] = match;
      
      if (nome && concursoUrl) {
        competitions.push({
          name: nome.trim(),
          url: concursoUrl.trim(),
          vagas: vagas || '',
          salario: salario || '',
          orgao: this.extractOrgaoFromName(nome.trim()),
          cargo: this.extractCargoFromName(nome.trim()),
          status: url.includes('encerrado') ? 'Encerrado' : 'Disponível'
        });
      }
    }

    // TODO: Adicionar outros padrões de sites de concurso
    
    return competitions;
  }

  /**
   * Formatar concurso para indexação
   */
  private formatCompetitionForIndexing(competition: any): string {
    return `${competition.name}\n\nÓrgão: ${competition.orgao}\nCargo: ${competition.cargo}\nStatus: ${competition.status}\nVagas: ${competition.vagas}\nSalário: ${competition.salario}\nMais informações: ${competition.url}`;
  }
}

export const webScraperService = new WebScraperService();