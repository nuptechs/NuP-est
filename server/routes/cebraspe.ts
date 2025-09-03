import { Router } from 'express';
import { z } from 'zod';
import { cebraspeEmbeddingsService } from '../services/cebraspe';

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
    
    // Usar o serviço RAG para buscar concursos
    const results = await cebraspeEmbeddingsService.buscarConcursoPorRAG(userInput);
    
    if (results.length === 0) {
      console.log('❌ Nenhum concurso encontrado via RAG');
      return {
        success: false,
        message: 'Não foi possível encontrar um concurso correspondente no Cebraspe'
      };
    }
    
    // Filtrar resultados com score mínimo aceitável (0.3) e parsing robusto
    const validResults = results.filter(result => {
      const scoreMatch = result.description?.match(/(?:score|similaridade|relevância)\s*[:=]\s*([\d.,]+)/i) || 
                          result.description?.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1].replace(',', '.')) : 0;
      return !isNaN(score) && score >= 0.3 && score <= 1.0;
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
        message: 'Não encontramos concursos com relevância suficiente. Tente termos mais específicos como "PF", "INSS" ou "Tribunal".'
      };
    }
    
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
      // 1. Diferença entre primeiro e segundo é pequena (< 0.15), OU
      // 2. Score mais alto é baixo (< 0.7), indicando incerteza
      const scoreDifference = topScore - secondScore;
      const showMultiple = scoreDifference < 0.15 || topScore < 0.7;
      
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

// Endpoint para buscar concurso usando RAG
router.post('/search', async (req, res) => {
  try {
    const { query } = searchConcursoSchema.parse(req.body);
    
    console.log(`🔍 Buscando concurso para: "${query}"`);
    
    const searchResult = await findMatchesRAG(query);
    
    if (searchResult.success) {
      if (searchResult.multipleOptions) {
        console.log(`🔀 Múltiplas opções encontradas: ${searchResult.multipleOptions.length}`);
        res.json({
          success: true,
          multipleOptions: searchResult.multipleOptions,
          message: searchResult.message
        });
      } else if (searchResult.concurso) {
        console.log(`✅ Concurso encontrado: ${searchResult.concurso.name}`);
        res.json({
          success: true,
          concurso: searchResult.concurso
        });
      }
    } else {
      console.log('❌ Nenhum concurso encontrado');
      res.json({
        success: false,
        message: searchResult.message || 'Não foi possível encontrar um concurso correspondente no Cebraspe'
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

export { router as cebraspeRouter };