import { Router } from 'express';
import { z } from 'zod';
import { cebraspeEmbeddingsService } from '../services/cebraspe';
import { integratedSearchService } from '../services/integrated-search';

const router = Router();

// Interface para dados dos concursos do Cebraspe
interface ConcursoInfo {
  name: string;
  url: string;
  vagas?: string;
  salario?: string;
  score?: number;
}

// Dados dos concursos extraídos do site (atualizados dinamicamente)
let concursosCebraspe: ConcursoInfo[] = [
  { name: "TJ CE NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_CE_25_NOTARIOS", vagas: "44 vagas" },
  { name: "TJ RO NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_RO_25_NOTARIOS", vagas: "26 vagas" },
  { name: "PGE ES PROCURADOR", url: "https://www.cebraspe.org.br/concursos/PGE_ES_25_PROCURADOR" },
  { name: "PREFEITURA BOA VISTA SAÚDE", url: "https://www.cebraspe.org.br/concursos/PREF_BOA_VISTA_25_SAUDE", vagas: "672 vagas", salario: "Até R$ 7.506,17" },
  { name: "TJ RR NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_RR_25", vagas: "7 vagas" },
  { name: "ANS CURSO DE FORMAÇÃO", url: "https://www.cebraspe.org.br/concursos/ANS_25_CF" },
  { name: "BANRISUL", url: "https://www.cebraspe.org.br/concursos/BANRISUL_25", vagas: "100 vagas", salario: "Até R$ 5.847,62" },
  { name: "CAESB", url: "https://www.cebraspe.org.br/concursos/CAESB_24", vagas: "82 vagas", salario: "Até R$ 11.961,34" },
  { name: "CAU MG", url: "https://www.cebraspe.org.br/concursos/CAU_MG_25", vagas: "9 vagas", salario: "Até R$ 12.903,39" },
  { name: "EMBRAPA", url: "https://www.cebraspe.org.br/concursos/EMBRAPA_24" },
  { name: "FUB", url: "https://www.cebraspe.org.br/concursos/FUB_25", vagas: "273 vagas", salario: "Até R$ 4.967,04" },
  { name: "INSS", url: "https://www.cebraspe.org.br/concursos/INSS_22", vagas: "1000 vagas", salario: "Até R$ 5.905,79" },
  { name: "IRBR DIPLOMACIA", url: "https://www.cebraspe.org.br/concursos/IRBR_25_DIPLOMACIA", vagas: "50 vagas", salario: "Até R$ 22.558,56" },
  { name: "POLÍCIA CIVIL CEARÁ DELEGADO", url: "https://www.cebraspe.org.br/concursos/PC_CE_25_DELEGADO", vagas: "100 vagas", salario: "Até R$ 22.165,53" },
  { name: "POLÍCIA CIVIL PERNAMBUCO", url: "https://www.cebraspe.org.br/concursos/PC_PE_23" },
  { name: "POLÍCIA FEDERAL", url: "https://www.cebraspe.org.br/concursos/PF_25", vagas: "1000 vagas", salario: "Até R$ 26.800,00" },
  { name: "POLÍCIA FEDERAL ADM", url: "https://www.cebraspe.org.br/concursos/PF_25_ADM", vagas: "192 vagas", salario: "Até R$ 11.070,93" },
  { name: "PGE PI", url: "https://www.cebraspe.org.br/concursos/PGE_PI_25", vagas: "10 vagas", salario: "Até R$ 32.319,67" },
  { name: "PGE PR PROCURADOR", url: "https://www.cebraspe.org.br/concursos/PGE_PR_24_PROCURADOR" },
  { name: "PGM ARACAJU PROCURADOR", url: "https://www.cebraspe.org.br/concursos/PGM_ARACAJU_24_PROCURADOR" },
  { name: "PGM CUIABÁ PROCURADOR", url: "https://www.cebraspe.org.br/concursos/PGM_CUIABA_24_PROCURADOR", vagas: "6 vagas", salario: "Até R$ 17.516,64" },
  { name: "POLÍCIA MILITAR SANTA CATARINA SOLDADO", url: "https://www.cebraspe.org.br/concursos/PM_SC_23_SOLDADO" },
  { name: "PMDF CFO", url: "https://www.cebraspe.org.br/concursos/PM_DF_25_CFO", vagas: "49 vagas", salario: "Até R$ 17.034,85" },
  { name: "PREFEITURA ANDRADINA PROCURADOR", url: "https://www.cebraspe.org.br/concursos/PREF_ANDRADINA_25_PROCURADOR", vagas: "1 vagas", salario: "Até R$ 13.656,70" },
  { name: "PREFEITURA CACHOEIRO GUARDA", url: "https://www.cebraspe.org.br/concursos/PREF_CACHOEIRO_24_GUARDA" },
  { name: "POLÍCIA RODOVIÁRIA FEDERAL", url: "https://www.cebraspe.org.br/concursos/PRF_21", vagas: "1500 vagas" },
  { name: "SEFAZ SE AUDITOR", url: "https://www.cebraspe.org.br/concursos/SEFAZ_SE_25_AUDITOR", vagas: "10 vagas", salario: "Até R$ 22.541,47" },
  { name: "SEFAZ RJ ANALISTA", url: "https://www.cebraspe.org.br/concursos/SEFAZ_RJ_25_ANALISTA", vagas: "28 vagas", salario: "Até R$ 6.788,13" },
  { name: "SEFAZ RJ AUDITOR", url: "https://www.cebraspe.org.br/concursos/SEFAZ_RJ_25_AUDITOR", salario: "Até R$ 5.387,39" },
  { name: "SEPLAD DF AUDITOR", url: "https://www.cebraspe.org.br/concursos/SEPLAD_DF_22_AUDITOR" },
  { name: "STM", url: "https://www.cebraspe.org.br/concursos/STM_25", vagas: "80 vagas", salario: "Até R$ 14.852,66" },
  { name: "SUSEP", url: "https://www.cebraspe.org.br/concursos/SUSEP_25", vagas: "75 vagas", salario: "Até R$ 18.033,52" },
  { name: "TC DF PROCURADOR", url: "https://www.cebraspe.org.br/concursos/TC_DF_24_PROCURADOR" },
  { name: "TCE MS SERVIDOR", url: "https://www.cebraspe.org.br/concursos/TCE_MS_25", vagas: "5 vagas", salario: "Até R$ 14.232,67" },
  { name: "TCE MS CONSELHEIRO", url: "https://www.cebraspe.org.br/concursos/TCE_MS_25_CONSELHEIRO", vagas: "1 vagas", salario: "Até R$ 39.753,22" },
  { name: "TCE RS", url: "https://www.cebraspe.org.br/concursos/TCE_RS_25", vagas: "45 vagas", salario: "Até R$ 20.572,72" },
  { name: "TCU TEFC", url: "https://www.cebraspe.org.br/concursos/TCU_25_TEFC", vagas: "40 vagas", salario: "Até R$ 15.128,26" },
  { name: "TJ MT NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_MT_24_NOTARIOS" },
  { name: "TJ PA SERVIDOR", url: "https://www.cebraspe.org.br/concursos/TJ_PA_25_SERVIDOR", vagas: "50 vagas", salario: "Até R$ 15.021,89" },
  { name: "TJ PE NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_PE_24_NOTARIOS" },
  { name: "TJ SC NOTÁRIOS", url: "https://www.cebraspe.org.br/concursos/TJ_SC_22_NOTARIOS", vagas: "22 vagas" },
  { name: "TRT10", url: "https://www.cebraspe.org.br/concursos/TRT10_24", vagas: "8 vagas", salario: "Até R$ 16.035,69" }
];

// Função para extrair ano do nome do concurso
function extractYearFromName(name: string): number {
  // Primeiro, procurar por ano de 4 dígitos (mais preciso)
  const fullYearMatch = name.match(/(19|20)\d{2}(?!.*\d{4})/); // Último ano de 4 dígitos
  if (fullYearMatch) {
    return parseInt(fullYearMatch[0]);
  }
  
  // Depois, procurar por 2 dígitos em qualquer lugar (ex: TJ_CE_25, PF_25_ADM)
  const twoDigitMatches = name.match(/\d{2}/g); // Todos os 2 dígitos
  if (twoDigitMatches && twoDigitMatches.length > 0) {
    // Pegar o último encontrado (geralmente representa o ano)
    const lastTwoDigits = twoDigitMatches[twoDigitMatches.length - 1];
    const year = parseInt(lastTwoDigits);
    // Assumir que anos 20-50 são 2020-2050, e 51-99 são 1951-1999
    return year <= 50 ? 2000 + year : 1900 + year;
  }
  
  return 0; // Sem data identificada
}

// Função para ordenar concursos por data ou nome
function sortConcursos(concursos: any[]): any[] {
  return concursos.sort((a, b) => {
    const yearA = extractYearFromName(a.name);
    const yearB = extractYearFromName(b.name);
    
    // Se ambos têm data, ordenar por data (mais recente primeiro)
    if (yearA > 0 && yearB > 0) {
      return yearB - yearA;
    }
    
    // Se apenas um tem data, priorizar o que tem data
    if (yearA > 0 && yearB === 0) return -1;
    if (yearA === 0 && yearB > 0) return 1;
    
    // Se nenhum tem data clara, ordenar por nome
    return a.name.localeCompare(b.name);
  });
}

// Interface expandida para incluir múltiplas opções
interface SearchResult {
  success: boolean;
  concurso?: ConcursoInfo;
  multipleOptions?: ConcursoInfo[];
  message?: string;
}

// Função para buscar concursos usando RAG
async function findMatchesRAG(userInput: string): Promise<SearchResult> {
  try {
    console.log(`🔍 Buscando concurso via RAG: "${userInput}"`);
    
    // Usar o serviço para buscar concursos via scraping real
    const concursos = await cebraspeEmbeddingsService.buscarConcursos();
    
    // Filtrar por relevância com a query do usuário
    const results = concursos.filter(c => 
      c.name.toLowerCase().includes(userInput.toLowerCase()) ||
      c.fullContent.toLowerCase().includes(userInput.toLowerCase())
    ).map(c => ({ ...c, score: 0.5 }));
    
    if (results.length === 0) {
      console.log('❌ Nenhum concurso encontrado via RAG');
      return {
        success: false,
        message: '🚫 Sistema de Transparência: Nenhum dado obtido via scraping real do Cebraspe',
        // details removido - não existe na interface SearchResult
      };
    }
    
    // Função para verificar relevância baseada em palavras-chave
    const isRelevantMatch = (query: string, result: any): boolean => {
      // Normalizar texto removendo acentos
      const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      
      const queryWords = normalize(query).trim().split(/\s+/);
      const resultContent = normalize(`${result.name} ${result.fullContent || ''}`);
      
      console.log(`🔍 Verificando relevância:`);
      console.log(`   Query: "${query}" -> palavras: [${queryWords.join(', ')}]`);
      console.log(`   Resultado: "${result.name}"`);
      console.log(`   Conteúdo: "${resultContent.slice(0, 100)}..."`);
      
      // Lista de termos importantes para domínio policial
      const policeDomainTerms = ['pf', 'prf', 'policia', 'policial', 'delegado', 'escrivao', 'perito', 'investigacao', 'seguranca'];
      const hasPoliceQuery = queryWords.some(word => policeDomainTerms.includes(word));
      
      // Lista de termos que devem ser excluídos quando buscando polícia
      const negativeTerms = ['banco', 'banrisul', 'seguros', 'susep', 'cartorio', 'notarios', 'tribunal', 'previdencia'];
      const hasNegativeTerm = negativeTerms.some(term => resultContent.includes(term));
      
      if (hasPoliceQuery && hasNegativeTerm) {
        console.log(`   ❌ Termo negativo encontrado para busca policial`);
        return false;
      }
      
      // Para cada palavra da query, verificar se há correspondência
      const relevantWords = queryWords.filter(word => {
        if (word.length < 3) return false; // Ignorar palavras muito pequenas
        
        // Verificar correspondência exata ou parcial
        const matches = resultContent.includes(word) || 
               resultContent.includes(word.slice(0, -1));
        
        console.log(`   Palavra "${word}": ${matches ? 'MATCH' : 'NO MATCH'}`);
        return matches;
      });
      
      const isRelevant = relevantWords.length > 0;
      console.log(`   Resultado: ${isRelevant ? 'RELEVANTE' : 'IRRELEVANTE'}`);
      console.log(`   ---`);
      
      return isRelevant;
    };

    // Filtrar resultados com score mínimo mais alto e verificação de relevância
    const validResults = results.filter(result => {
      const scoreMatch = result.description?.match(/(?:score|similaridade|relevância)\s*[:=]\s*([\d.,]+)/i) || 
                          result.description?.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1].replace(',', '.')) : 0;
      
      // Critérios mais rigorosos:
      // 1. Score mínimo de 0.45 (mais alto)
      // 2. Verificação de relevância por palavras-chave
      const hasGoodScore = !isNaN(score) && score >= 0.45 && score <= 1.0;
      
      console.log(`🧪 Testando resultado: ${result.name}, Score: ${score.toFixed(3)}, HasGoodScore: ${hasGoodScore}`);
      
      if (!hasGoodScore) {
        console.log(`❌ Score insuficiente para ${result.name}`);
        return false;
      }
      
      const isRelevant = isRelevantMatch(userInput, result);
      
      console.log(`🎯 Resultado final para ${result.name}: Score OK (${score.toFixed(3)}) + Relevante (${isRelevant}) = ${hasGoodScore && isRelevant}`);
      
      return hasGoodScore && isRelevant;
    }).map(result => {
      const scoreMatch = result.description?.match(/(?:score|similaridade|relevância)\s*[:=]\s*([\d.,]+)/i) || 
                          result.description?.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1].replace(',', '.')) : 0;
      return { ...result, numericScore: score };
    }).sort((a, b) => b.numericScore - a.numericScore); // Ordenar por score descendente
    
    console.log(`📊 Encontrados ${validResults.length} resultados válidos`);
    
    // Se não há resultados válidos após filtragem
    if (validResults.length === 0) {
      return {
        success: false,
        message: '🔍 Resultados de scraping real insuficientes',
        // details removido - não existe na interface SearchResult
      };
    }
    
    // Log para debug
    console.log(`🔍 Query: "${userInput}"`);
    validResults.forEach((result, index) => {
      console.log(`📋 ${index + 1}. ${result.name} (Score: ${result.numericScore.toFixed(3)})`);
    });
    
    // Se há apenas um resultado válido, retornar diretamente
    if (validResults.length === 1) {
      const bestMatch = validResults[0];
      console.log(`✅ Único match: ${bestMatch.name} (Score: ${bestMatch.numericScore.toFixed(3)})`);
      
      return {
        success: true,
        concurso: {
          name: bestMatch.name,
          url: bestMatch.url,
          vagas: bestMatch.vagas,
          salario: bestMatch.salario,
          score: bestMatch.numericScore
        }
      };
    }
    
    // Se há múltiplos resultados válidos, verificar se precisamos de seleção
    if (validResults.length > 1) {
      const topScore = validResults[0].numericScore;
      const secondScore = validResults[1].numericScore;
      
      // Mostrar múltiplas opções se:
      // 1. Diferença entre primeiro e segundo é pequena (< 0.1), OU
      // 2. Score mais alto é moderado (< 0.8), indicando alguma incerteza
      const scoreDifference = topScore - secondScore;
      const showMultiple = scoreDifference < 0.1 || topScore < 0.8;
      
      console.log(`📊 Diferença de score: ${scoreDifference.toFixed(3)}, Top score: ${topScore.toFixed(3)}`);
      
      if (showMultiple) {
        console.log(`🔀 Múltiplas opções encontradas (${validResults.length})`);
        
        // Ordenar por data/nome
        const sortedResults = sortConcursos(validResults);
        
        const multipleOptions = sortedResults.slice(0, 8).map(result => ({ // Limitar a 8 opções
          name: result.name,
          url: result.url,
          vagas: result.vagas,
          salario: result.salario,
          score: result.numericScore
        }));
        
        return {
          success: true,
          multipleOptions,
          message: `Encontramos ${validResults.length} concursos que correspondem à sua busca. Selecione o desejado:`
        };
      }
    }
    
    // Retornar o melhor resultado
    const bestMatch = validResults[0];
    console.log(`✅ Melhor match: ${bestMatch.name} (Score: ${bestMatch.numericScore.toFixed(3)})`);
    
    return {
      success: true,
      concurso: {
        name: bestMatch.name,
        url: bestMatch.url,
        vagas: bestMatch.vagas,
        salario: bestMatch.salario,
        score: bestMatch.numericScore
      }
    };
  } catch (error) {
    console.error('❌ Erro na busca RAG:', error);
    return {
      success: false,
      message: 'Erro interno do servidor'
    };
  }
}

// Schema para validação
const searchConcursoSchema = z.object({
  query: z.string().min(1, 'Nome do concurso é obrigatório')
});

// Endpoint para processar concursos no Pinecone (admin)
router.post('/process-embeddings', async (req, res) => {
  try {
    console.log('🚀 Iniciando processamento de embeddings dos concursos...');
    await cebraspeEmbeddingsService.processarConcursosParaPinecone();
    
    res.json({
      success: true,
      message: 'Todos os concursos foram processados e indexados no Pinecone'
    });
  } catch (error) {
    console.error('Erro ao processar embeddings:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar embeddings dos concursos'
    });
  }
});

// Endpoint para buscar concurso usando RAG + Sites Configurados
router.post('/search', async (req, res) => {
  try {
    const { query } = searchConcursoSchema.parse(req.body);
    
    console.log(`🔍 Buscando concurso integrado para: "${query}"`);
    
    // Usar busca integrada que inclui sites configurados
    const searchResult = await integratedSearchService.search(query, {
      searchTypes: ['concurso_publico'], // Focar em concursos públicos
      includeWebSites: true, // Incluir dados scrapados das URLs configuradas
      maxResults: 10
    });
    
    // Combinar todos os resultados em formato unificado
    const allResults = [
      ...searchResult.cebraspeResults,
      ...searchResult.webResults.map(webResult => ({
        name: webResult.title || webResult.name,
        url: webResult.sourceUrl || webResult.url || '',
        vagas: webResult.vagas || '',
        salario: webResult.salario || '',
        orgao: webResult.orgao || '',
        cargo: webResult.cargo || '',
        status: webResult.status || 'Disponível',
        score: webResult.similarity || 0,
        fullContent: webResult.content || webResult.fullContent,
        description: `Score: ${(webResult.similarity || 0).toFixed(3)} - Fonte: Site Configurado`
      }))
    ];
    
    console.log(`📊 Total de resultados encontrados: ${allResults.length} (${searchResult.cebraspeResults.length} Cebraspe + ${searchResult.webResults.length} sites)`);
    
    if (allResults.length > 0) {
      if (allResults.length > 1) {
        // Múltiplas opções encontradas
        console.log(`🔀 Múltiplas opções encontradas: ${allResults.length}`);
        // Preparar mensagem informativa para o usuário
        let message = `Encontramos ${allResults.length} concursos que correspondem à sua busca.`;
        
        if (searchResult.cebraspeResults.length > 0) {
          message += ` ${searchResult.cebraspeResults.length} do Cebraspe`;
        }
        
        if (searchResult.webResults.length > 0) {
          message += ` e ${searchResult.webResults.length} de sites configurados.`;
        } else if (searchResult.cebraspeResults.length > 0) {
          message += `.`;
        }

        res.json({
          success: true,
          multipleOptions: allResults,
          message
        });
      } else {
        // Uma opção encontrada
        console.log(`✅ Concurso encontrado: ${allResults[0].name}`);
        res.json({
          success: true,
          concurso: allResults[0]
        });
      }
    } else {
      console.log('❌ Nenhum concurso encontrado');
      res.json({
        success: false,
        message: '🚫 TRANSPARÊNCIA TOTAL: Nenhum dado encontrado via scraping real',
        details: {
          explanation: 'Este sistema foi configurado para total transparência - não utilizamos dados hardcoded ou fictícios',
          attempts: [
            'Tentativa de scraping real do site Cebraspe',
            'Busca em sites configurados pelo administrador'
          ],
          result: 'Nenhuma fonte retornou dados válidos para sua busca',
          suggestion: 'Verifique se os sites estão acessíveis ou tente termos de busca diferentes'
        }
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar concurso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Nova rota de busca integrada que inclui sites configurados
router.post('/search-integrated', async (req, res) => {
  try {
    const { query, searchTypes, includeWebSites = true, maxResults = 10 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query é obrigatória e deve ser uma string'
      });
    }
    
    console.log(`🔍 Busca integrada para: "${query}"`);
    
    const searchResult = await integratedSearchService.search(query, {
      searchTypes: searchTypes || undefined,
      includeWebSites,
      maxResults
    });
    
    // Combinar resultados em formato unificado
    const allResults = [
      ...searchResult.cebraspeResults.map(item => ({
        ...item,
        source: 'cebraspe',
        type: 'concurso_publico'
      })),
      ...searchResult.webResults.map(item => ({
        ...item,
        source: 'website',
        type: 'scraped'
      }))
    ];
    
    console.log(`📊 Total de resultados integrados: ${allResults.length}`);
    
    res.json({
      success: true,
      results: allResults,
      breakdown: {
        cebraspe: searchResult.cebraspeResults.length,
        websites: searchResult.webResults.length,
        total: searchResult.totalResults
      },
      searchTypes: searchResult.searchTypes,
      query
    });
    
  } catch (error) {
    console.error('❌ Erro na busca integrada:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para buscar apenas em sites configurados
router.post('/search-websites', async (req, res) => {
  try {
    const { query, searchTypes, maxResults = 10 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query é obrigatória e deve ser uma string'
      });
    }
    
    if (!searchTypes || !Array.isArray(searchTypes)) {
      return res.status(400).json({
        success: false,
        error: 'searchTypes é obrigatório e deve ser um array'
      });
    }
    
    console.log(`🌐 Busca em sites para: "${query}" | Tipos: ${searchTypes.join(', ')}`);
    
    const results = await integratedSearchService.searchWebsitesOnly(query, searchTypes, maxResults);
    
    res.json({
      success: true,
      results,
      count: results.length,
      searchTypes,
      query
    });
    
  } catch (error) {
    console.error('❌ Erro na busca de sites:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para listar sites configurados por tipo
router.get('/configured-sites', async (req, res) => {
  try {
    const sitesByType = await integratedSearchService.getConfiguredSitesByType();
    
    res.json({
      success: true,
      sitesByType,
      totalTypes: Object.keys(sitesByType).length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar sites configurados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para testar scraping direto do Cebraspe com Playwright
router.post('/test-scraper', async (req, res) => {
  try {
    const { url } = req.body;
    const targetUrl = url || 'https://www.cebraspe.org.br/concursos/encerrado';
    
    console.log(`🚀 TESTE DIRETO: Fazendo scraping de ${targetUrl}`);
    
    // Usar o browser scraper diretamente
    const { browserScraperService } = await import('../services/browser-scraper');
    const result = await browserScraperService.scrapeCebraspePage(targetUrl);
    
    console.log(`📊 Resultado do teste: ${JSON.stringify({
      success: result.success,
      concursosEncontrados: result.concursos?.length || 0,
      tamanhoConteudo: result.content?.length || 0
    }, null, 2)}`);
    
    res.json({
      success: true,
      message: '🎯 Teste de scraping concluído',
      resultado: {
        urlTestada: targetUrl,
        sucessoScraping: result.success,
        concursosExtraidos: result.concursos?.length || 0,
        tamanhoConteudo: result.content?.length || 0,
        erro: result.error || null,
        primeiros5Concursos: result.concursos?.slice(0, 5).map(c => ({
          titulo: c.titulo,
          link: c.link,
          preview: c.texto.substring(0, 150) + '...'
        })) || []
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no teste de scraping',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export { router as cebraspeRouter };