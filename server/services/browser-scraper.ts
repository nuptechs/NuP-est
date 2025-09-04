import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';

export interface BrowserScrapingResult {
  success: boolean;
  content: string;
  error?: string;
  method: 'browser-scraping';
  documentsExtracted?: number;
}

/**
 * Serviço de scraping avançado usando Playwright para sites protegidos por JavaScript
 */
export class BrowserScraperService {
  private browser: Browser | null = null;
  
  /**
   * Inicializa o navegador (reutilizável para múltiplas páginas)
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      console.log('🚀 Iniciando navegador Playwright...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Fecha o navegador
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Navegador fechado');
    }
  }

  /**
   * Faz scraping de uma página usando navegador real
   */
  async scrapePage(url: string, options: {
    waitForSelector?: string;
    waitTime?: number;
    scrollToBottom?: boolean;
  } = {}): Promise<BrowserScrapingResult> {
    const browser = await this.initBrowser();
    const page: Page = await browser.newPage();
    
    try {
      console.log(`🌐 Navegando para: ${url}`);
      
      // Configurar User-Agent e headers
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Navegar para a página
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Aguardar elemento específico se fornecido
      if (options.waitForSelector) {
        console.log(`⏳ Aguardando elemento: ${options.waitForSelector}`);
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }
      
      // Aguardar tempo adicional se especificado
      if (options.waitTime) {
        console.log(`⏳ Aguardando ${options.waitTime}ms para carregamento completo`);
        await page.waitForTimeout(options.waitTime);
      }
      
      // Rolar até o final da página se solicitado
      if (options.scrollToBottom) {
        console.log('📜 Rolando até o final da página');
        await this.scrollToBottom(page);
      }
      
      // Obter conteúdo HTML da página
      const content = await page.content();
      
      console.log(`✅ Scraping concluído - ${content.length} caracteres extraídos`);
      
      return {
        success: true,
        content,
        method: 'browser-scraping'
      };
      
    } catch (error) {
      console.error(`❌ Erro no scraping de ${url}:`, error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        method: 'browser-scraping'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Extrai dados específicos do Cebraspe usando navegador
   */
  async scrapeCebraspePage(url: string): Promise<BrowserScrapingResult & { concursos?: any[] }> {
    console.log(`🏛️ Fazendo scraping avançado do Cebraspe: ${url}`);
    
    const result = await this.scrapePage(url, {
      waitTime: 3000, // Aguardar JavaScript carregar
      scrollToBottom: true // Garantir que todo conteúdo seja carregado
    });
    
    if (!result.success) {
      return result;
    }
    
    // Processar HTML com Cheerio
    const $ = cheerio.load(result.content);
    const concursos = [];
    
    // Tentar múltiplos seletores para encontrar concursos
    const selectors = [
      '.concurso-item',
      '.card-concurso', 
      '[data-concurso]',
      '.list-group-item',
      'article',
      '.row .col',
      'div[class*="concurso"]',
      'div[class*="card"]'
    ];
    
    console.log('🔍 Procurando concursos com múltiplos seletores...');
    
    for (const selector of selectors) {
      const elementos = $(selector);
      console.log(`  • ${selector}: ${elementos.length} elementos encontrados`);
      
      if (elementos.length > 0) {
        elementos.each((i, elem) => {
          const $elem = $(elem);
          const texto = $elem.text().trim();
          
          // Verificar se parece com informação de concurso
          if (texto.length > 50 && 
              (texto.toLowerCase().includes('concurso') || 
               texto.toLowerCase().includes('edital') ||
               texto.toLowerCase().includes('cargo') ||
               texto.toLowerCase().includes('vaga'))) {
            
            // Extrair informações básicas
            const titulo = $elem.find('h1, h2, h3, h4, .title, .nome').first().text().trim() || 
                          texto.split('\n')[0].trim();
            const link = $elem.find('a').attr('href') || $elem.attr('href');
            
            concursos.push({
              titulo,
              texto,
              link: link ? (link.startsWith('http') ? link : `https://www.cebraspe.org.br${link}`) : url,
              fonte: url,
              metodo: 'browser-scraping'
            });
          }
        });
        
        if (concursos.length > 0) {
          console.log(`✅ Encontrados ${concursos.length} concursos usando seletor: ${selector}`);
          break;
        }
      }
    }
    
    // Se não encontrou com seletores específicos, tentar extrair do texto geral
    if (concursos.length === 0) {
      console.log('🔍 Tentando extração de texto geral...');
      const textoCompleto = $('body').text();
      
      // Procurar padrões de concurso no texto
      const padroes = [
        /###\s*([^#\n]+?)[\s\S]*?(?:(\d+\s+vagas?))?[\s\S]*?(?:(R\$[\d.,]+))?[\s\S]*?\[MAIS INFORMAÇÕES\]\((https:\/\/[^)]+)\)/gi,
        /([A-Z\s]+(?:20\d{2})?)\s*\n.*?(\d+\s+vagas?).*?(R\$[\d.,]+)?.*?(https:\/\/\S+)/gi,
        /(POLÍCIA|TRIBUNAL|MINISTÉRIO|SECRETARIA|PREFEITURA)[A-Z\s]+[\s\S]{0,200}?(vagas?|salário|edital)/gi
      ];
      
      for (const padrao of padroes) {
        let match;
        while ((match = padrao.exec(textoCompleto)) !== null && concursos.length < 50) {
          concursos.push({
            titulo: match[1]?.trim() || 'Concurso encontrado',
            texto: match[0],
            link: match[4] || url,
            fonte: url,
            metodo: 'browser-scraping-regex'
          });
        }
      }
    }
    
    console.log(`📊 Total extraído: ${concursos.length} concursos`);
    
    return {
      ...result,
      concursos,
      documentsExtracted: concursos.length
    };
  }

  /**
   * Rola até o final da página para carregar conteúdo dinâmico
   */
  private async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Processa múltiplas URLs do Cebraspe
   */
  async scrapeMultipleCebraspePages(urls: string[]): Promise<{
    success: boolean;
    totalConcursos: number;
    results: any[];
    errors: string[];
  }> {
    console.log(`🌐 Processando ${urls.length} páginas do Cebraspe com navegador...`);
    
    const results = [];
    const errors = [];
    let totalConcursos = 0;
    
    try {
      for (const url of urls) {
        try {
          const result = await this.scrapeCebraspePage(url);
          
          if (result.success && result.concursos) {
            totalConcursos += result.concursos.length;
            results.push(...result.concursos);
            console.log(`✅ ${url}: ${result.concursos.length} concursos extraídos`);
          } else {
            errors.push(`${url}: ${result.error || 'Nenhum concurso encontrado'}`);
            console.warn(`⚠️ ${url}: ${result.error || 'Nenhum concurso encontrado'}`);
          }
        } catch (error) {
          const errorMsg = `${url}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
        
        // Aguardar entre requests para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } finally {
      await this.closeBrowser();
    }
    
    console.log(`📊 Scraping concluído: ${totalConcursos} concursos de ${urls.length} páginas`);
    
    return {
      success: totalConcursos > 0,
      totalConcursos,
      results,
      errors
    };
  }
}

// Instância singleton
export const browserScraperService = new BrowserScraperService();