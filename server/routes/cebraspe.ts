import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Interface para dados dos concursos do Cebraspe
interface ConcursoInfo {
  name: string;
  url: string;
  vagas?: string;
  salario?: string;
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

// Função para calcular similaridade semântica usando IA
async function findBestMatch(userInput: string, concursos: ConcursoInfo[]): Promise<ConcursoInfo | null> {
  try {
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nup-est.replit.app',
        'X-Title': 'NuP-Est - Sistema de Estudos'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'user',
            content: `Você é um especialista em análise semântica de concursos públicos brasileiros. 

TAREFA: Encontre o concurso que mais se assemelha ao que o usuário digitou.

INPUT DO USUÁRIO: "${userInput}"

CONCURSOS DISPONÍVEIS:
${concursos.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}

INSTRUÇÕES:
1. Analise semanticamente o texto do usuário
2. Considere abreviações, variações e sinônimos comuns
3. Exemplo: "PF" = "Polícia Federal", "INSS" = "Instituto Nacional do Seguro Social"
4. Retorne APENAS o número (1-${concursos.length}) do concurso que mais combina
5. Se não encontrar nenhuma correspondência razoável, retorne "0"
6. Seja tolerante a variações no nome

RESPOSTA (apenas o número):`,
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
    }

    const data = await openRouterResponse.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('Empty response from OpenRouter API');
    }

    const matchIndex = parseInt(responseText) - 1;
    
    if (matchIndex >= 0 && matchIndex < concursos.length) {
      return concursos[matchIndex];
    }
    
    return null;
  } catch (error) {
    console.error('Erro na análise semântica:', error);
    
    // Fallback: busca simples por string
    const userLower = userInput.toLowerCase();
    for (const concurso of concursos) {
      if (concurso.name.toLowerCase().includes(userLower) || 
          userLower.includes(concurso.name.toLowerCase())) {
        return concurso;
      }
    }
    
    return null;
  }
}

// Schema para validação
const searchConcursoSchema = z.object({
  query: z.string().min(1, 'Nome do concurso é obrigatório')
});

// Endpoint para buscar concurso
router.post('/search', async (req, res) => {
  try {
    const { query } = searchConcursoSchema.parse(req.body);
    
    console.log(`Buscando concurso para: "${query}"`);
    
    const matchedConcurso = await findBestMatch(query, concursosCebraspe);
    
    if (matchedConcurso) {
      console.log(`Concurso encontrado: ${matchedConcurso.name}`);
      res.json({
        success: true,
        concurso: matchedConcurso
      });
    } else {
      console.log('Nenhum concurso encontrado');
      res.json({
        success: false,
        message: 'Não foi possível encontrar um concurso correspondente no Cebraspe'
      });
    }
  } catch (error) {
    console.error('Erro ao buscar concurso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export { router as cebraspeRouter };