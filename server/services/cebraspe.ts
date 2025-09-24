import { embeddingsService } from './embeddings';
import { pineconeService } from './pinecone';
import { legacyRAGAdapter } from './rag/adapters/LegacyRAGAdapter';
import { webScraperService } from './web-scraper';
import { browserScraperService } from './browser-scraper';

// Interface para dados detalhados dos concursos
export interface ConcursoDetalhado {
  id: string;
  name: string;
  url: string;
  vagas?: string;
  salario?: string;
  orgao?: string;
  cargo?: string;
  requisitos?: string;
  inscricoes?: string;
  dataProva?: string;
  status?: string;
  description?: string;
  fullContent: string; // Conteúdo completo para embeddings
}

// Namespace específico para concursos no Pinecone
const CONCURSOS_NAMESPACE = 'concursos-cebraspe';

// ❌ DADOS HARDCODED REMOVIDOS PARA TRANSPARÊNCIA TOTAL  
// Sistema usa APENAS dados reais extraídos via scraping

class CebraspeEmbeddingsService {
  async processarConcursosParaPinecone(): Promise<void> {
    console.log('🚀 Iniciando processamento de concursos Cebraspe para Pinecone...');
    
    try {
      // ✅ TENTATIVA 1: Scraping Real com navegador avançado  
      console.log('🌐 Tentando scraping real com navegador...');
      const browserResult = await this.processarComBrowser();
      
      if (browserResult.success && browserResult.documentsProcessed > 0) {
        console.log(`✅ Scraping com navegador bem-sucedido! ${browserResult.documentsProcessed} documentos processados`);
        return;
      }
      
      // ❌ TRANSPARÊNCIA TOTAL: Se não conseguiu dados reais, informa claramente
      console.log('❌ Não foi possível obter dados reais do Cebraspe');
      console.log('🚫 Sistema configurado para transparência total - não há dados de fallback');
      console.log('💡 Para obter dados, é necessário que o scraping real funcione corretamente');
      
    } catch (error) {
      console.error('❌ Erro no processamento de concursos:', error);
      console.log('🚫 Nenhum dado foi processado - sistema mantém transparência total');
    }
  }

  private async processarComBrowser(): Promise<{ success: boolean; documentsProcessed: number }> {
    try {
      const urls = [
        'https://www.cebraspe.org.br/concursos/encerrado',
        'https://www.cebraspe.org.br/concursos/andamento'
      ];
      
      console.log('🌐 Fazendo scraping real de múltiplas páginas do Cebraspe...');
      
      let totalProcessed = 0;
      let successfulUrls = [];
      
      // Tentar processar cada URL
      for (const url of urls) {
        try {
          console.log(`📄 Processando: ${url}`);
          
          // Usar browser scraping para extrair dados reais
          const concursosData = await browserScraperService.scrapeWithBrowser(url, {
            containerSelector: '.concurso-card, .card-concurso, .concurso-item',
            titleSelector: 'h3, h2, .titulo, .nome-concurso',
            contentSelector: '.descricao, .info, .detalhes'
          });
          
          // Processar dados extraídos
          for (const concurso of concursosData) {
            if (concurso.titulo && concurso.texto) {
              const documents = [{
                content: concurso.texto || concurso.titulo,
                chunkIndex: 0
              }];
              
              // Extrair ano do título/texto
              const anoMatch = (concurso.titulo + ' ' + concurso.texto).match(/20\d{2}/);
              const ano = anoMatch ? parseInt(anoMatch[0]) : new Date().getFullYear();
              
              const metadata = {
                source: 'cebraspe',
                type: 'concurso',
                url: url,
                title: concurso.titulo,
                year: ano,
                timestamp: new Date().toISOString()
              };
              
              // Gerar embeddings e salvar no Pinecone
              await embeddingsService.processAndStoreDocuments(
                documents,
                metadata,
                CONCURSOS_NAMESPACE
              );
              
              totalProcessed++;
              console.log(`✅ Concurso processado: ${concurso.titulo}`);
            }
          }
          
          successfulUrls.push(url);
          console.log(`✅ Scraping concluído para: ${url}`);
          
        } catch (urlError) {
          console.error(`❌ Erro ao processar ${url}:`, urlError);
          continue; // Tentar próxima URL
        }
      }
      
      console.log(`📊 Browser scraping concluído: ${totalProcessed} documentos processados de ${successfulUrls.length} URLs`);
      
      return {
        success: totalProcessed > 0,
        documentsProcessed: totalProcessed
      };
      
    } catch (error) {
      console.error('❌ Erro no scraping com browser:', error);
      return { success: false, documentsProcessed: 0 };
    }
  }

  async buscarConcursos(query?: string): Promise<ConcursoDetalhado[]> {
    console.log('🔍 Buscando concursos reais via scraping...');
    
    try {
      // ❌ DADOS HARDCODED REMOVIDOS - apenas scraping real
      console.log('🚫 Array de dados hardcoded foi removida para transparência total');
      
      // Tentar buscar dados reais via scraping
      const urls = [
        'https://www.cebraspe.org.br/concursos/andamento',
        'https://www.cebraspe.org.br/concursos/encerrado'
      ];
      
      let concursosReais = [];
      
      for (const url of urls) {
        try {
          console.log(`📄 Fazendo scraping real de: ${url}`);
          
          // Tentar scraping simples primeiro (funciona no Replit)
          let scrapedData = [];
          try {
            // Usar webScraperService que funciona com fetch simples
            const { webScraperService } = await import('../services/web-scraper');
            const response = await fetch(url);
            if (response.ok) {
              const html = await response.text();
              
              // Análise básica do HTML para encontrar informações de concursos
              const concursoMatches = html.match(/concurso[^<]*(?:<[^>]*>[^<]*)*(?:cargo|vaga|edital)/gi) || [];
              const tituloMatches = html.match(/<h[1-6][^>]*>([^<]*(?:concurso|edital)[^<]*)<\/h[1-6]>/gi) || [];
              
              // Criar dados estruturados dos matches encontrados
              [...concursoMatches.slice(0, 5), ...tituloMatches.slice(0, 5)].forEach((match, index) => {
                const cleanText = match.replace(/<[^>]*>/g, '').trim();
                if (cleanText.length > 20) {
                  scrapedData.push({
                    titulo: cleanText.substring(0, 100),
                    texto: cleanText,
                    link: url
                  });
                }
              });
            }
          } catch (error) {
            console.warn(`⚠️ Erro no scraping simples de ${url}:`, error);
          }
          
          // Se não conseguiu dados com scraping simples, tentar browser scraper (pode falhar no Replit)
          if (scrapedData.length === 0) {
            try {
              scrapedData = await browserScraperService.scrapeWithBrowser(url, {
                containerSelector: '.concurso-card, .card-concurso, .concurso-item',
                titleSelector: 'h3, h2, .titulo, .nome-concurso',
                contentSelector: '.descricao, .info, .detalhes'
              });
            } catch (browserError) {
              console.warn(`⚠️ Browser scraper falhou (esperado no Replit):`, browserError.message);
            }
          }
          
          // Converter dados do scraping para interface ConcursoDetalhado
          for (const item of scrapedData) {
            if (item.titulo) {
              const concurso: ConcursoDetalhado = {
                id: item.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                name: item.titulo,
                url: item.link || url,
                fullContent: `${item.titulo} ${item.texto || ''}`.trim(),
                description: item.texto
              };
              concursosReais.push(concurso);
            }
          }
          
          console.log(`✅ Extraídos ${scrapedData.length} concursos de ${url}`);
          
        } catch (error) {
          console.error(`❌ Erro no scraping de ${url}:`, error);
          continue;
        }
      }
      
      if (concursosReais.length > 0) {
        console.log(`✅ Total de ${concursosReais.length} concursos obtidos via scraping real`);
        
        // Se há uma query de busca, filtrar os resultados
        if (query && query.trim()) {
          const queryLower = query.toLowerCase();
          const filteredResults = concursosReais.filter(concurso => 
            concurso.name.toLowerCase().includes(queryLower) ||
            (concurso.description && concurso.description.toLowerCase().includes(queryLower)) ||
            concurso.fullContent.toLowerCase().includes(queryLower)
          );
          
          console.log(`🔍 Filtrados ${filteredResults.length} concursos que correspondem à busca: "${query}"`);
          return filteredResults;
        }
        
        return concursosReais;
      } else {
        console.log('❌ Scraping não retornou dados válidos');
        console.log('🚫 Sistema configurado para transparência - retornando array vazia');
        return [];
      }
      
    } catch (error) {
      console.error('❌ Erro na busca de concursos:', error);
      console.log('🚫 Retornando array vazia devido à transparência total');
      return [];
    }
  }
}

// Instância única do serviço  
export const cebraspeEmbeddingsService = new CebraspeEmbeddingsService();