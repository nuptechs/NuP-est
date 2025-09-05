import { RAGService } from './rag';
import { pineconeService } from './pinecone';
import { aiChatWithContext } from './ai/index';

interface CargoInfo {
  nome: string;
  requisitos?: string;
  atribuicoes?: string;
  salario?: string;
  cargaHoraria?: string;
  vagas?: number;
  similarity: number;
  fonte: string;
}

interface ConteudoProgramaticoInfo {
  disciplina: string;
  topicos: string[];
  detalhamento?: string;
  similarity: number;
  fonte: string;
}

export class EditalRAGService {
  private ragService = new RAGService();

  /**
   * Busca informações sobre cargos em documentos processados
   */
  async buscarCargos(userId: string, query: string = "cargos vagas concurso"): Promise<{
    cargos: CargoInfo[];
    resumoGeral: string;
    totalEncontrado: number;
  }> {
    try {
      console.log(`🎯 Buscando cargos para usuário ${userId}...`);

      // Buscar contexto relevante usando RAG com queries específicas para cargos
      const cargosQueries = [
        "cargo vaga requisitos formação",
        "atribuições função descrição cargo",
        "salário remuneração benefícios",
        "carga horária trabalho",
        "número vagas disponíveis"
      ];

      let todosResultados: any[] = [];
      
      for (const cargoQuery of cargosQueries) {
        const resultados = await pineconeService.searchSimilarContent(
          `${query} ${cargoQuery}`,
          userId,
          {
            topK: 10,
            category: 'edital',
            minSimilarity: 0.3
          }
        );
        todosResultados = [...todosResultados, ...resultados];
      }

      // Remover duplicatas baseado no conteúdo
      const resultadosUnicos = todosResultados.filter((item, index, arr) => 
        arr.findIndex(t => t.content === item.content) === index
      );

      if (resultadosUnicos.length === 0) {
        return {
          cargos: [],
          resumoGeral: "Nenhuma informação sobre cargos encontrada nos documentos processados.",
          totalEncontrado: 0
        };
      }

      // Usar AI para extrair e estruturar informações sobre cargos
      const contextText = resultadosUnicos
        .slice(0, 15) // Limitar para não sobrecarregar
        .map(r => `[${r.title}] ${r.content}`)
        .join('\n\n---\n\n');

      const prompt = `Analise o contexto abaixo e extraia TODAS as informações sobre cargos/vagas de concurso.

CONTEXTO:
${contextText}

INSTRUÇÕES:
1. Identifique TODOS os cargos/vagas mencionados
2. Para cada cargo, extraia:
   - Nome do cargo
   - Requisitos/formação necessária
   - Atribuições principais
   - Salário/remuneração
   - Carga horária
   - Número de vagas
3. Organize as informações de forma clara e estruturada
4. Se não encontrar alguma informação específica, indique como "Não informado"

Responda em JSON no seguinte formato:
{
  "cargos": [
    {
      "nome": "Nome do cargo",
      "requisitos": "Requisitos necessários",
      "atribuicoes": "Principais atribuições",
      "salario": "Valor do salário",
      "cargaHoraria": "Carga horária de trabalho",
      "vagas": "Número de vagas"
    }
  ],
  "resumoGeral": "Resumo geral sobre os cargos encontrados"
}`;

      const aiResponse = await aiChatWithContext(prompt, 
        "Você é um especialista em análise de editais de concurso. Extraia e organize informações sobre cargos de forma precisa e estruturada. Responda SEMPRE em JSON válido.",
        {
          temperature: 0.1,
          maxTokens: 2000
        }
      );

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse.content || '{}');
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta AI:', parseError);
        return {
          cargos: [],
          resumoGeral: "Erro ao processar informações sobre cargos.",
          totalEncontrado: 0
        };
      }

      // Enriquecer com informações de similarity e fonte
      const cargosEnriquecidos: CargoInfo[] = (parsedResponse.cargos || []).map((cargo: any, index: number) => ({
        ...cargo,
        similarity: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.similarity || 0,
        fonte: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.title || 'Documento processado'
      }));

      console.log(`✅ Encontrados ${cargosEnriquecidos.length} cargos nos documentos`);

      return {
        cargos: cargosEnriquecidos,
        resumoGeral: parsedResponse.resumoGeral || `Encontrados ${cargosEnriquecidos.length} cargos nos documentos processados.`,
        totalEncontrado: cargosEnriquecidos.length
      };

    } catch (error) {
      console.error('❌ Erro ao buscar cargos:', error);
      return {
        cargos: [],
        resumoGeral: "Erro interno ao buscar informações sobre cargos.",
        totalEncontrado: 0
      };
    }
  }

  /**
   * Busca e organiza conteúdo programático
   */
  async buscarConteudoProgramatico(userId: string, query: string = "conteúdo programático disciplinas matérias"): Promise<{
    disciplinas: ConteudoProgramaticoInfo[];
    resumoGeral: string;
    totalEncontrado: number;
  }> {
    try {
      console.log(`📚 Buscando conteúdo programático para usuário ${userId}...`);

      // Buscar contexto relevante para conteúdo programático
      const conteudoQueries = [
        "conteúdo programático disciplinas",
        "matérias assuntos programa",
        "conhecimentos específicos gerais",
        "bibliografia livros referências",
        "temas tópicos estudar"
      ];

      let todosResultados: any[] = [];
      
      for (const conteudoQuery of conteudoQueries) {
        const resultados = await pineconeService.searchSimilarContent(
          `${query} ${conteudoQuery}`,
          userId,
          {
            topK: 12,
            category: 'edital',
            minSimilarity: 0.25
          }
        );
        todosResultados = [...todosResultados, ...resultados];
      }

      // Remover duplicatas
      const resultadosUnicos = todosResultados.filter((item, index, arr) => 
        arr.findIndex(t => t.content === item.content) === index
      );

      if (resultadosUnicos.length === 0) {
        return {
          disciplinas: [],
          resumoGeral: "Nenhum conteúdo programático encontrado nos documentos processados.",
          totalEncontrado: 0
        };
      }

      // Usar AI para extrair e organizar conteúdo programático
      const contextText = resultadosUnicos
        .slice(0, 20) // Mais contexto para conteúdo programático
        .map(r => `[${r.title}] ${r.content}`)
        .join('\n\n---\n\n');

      const prompt = `Analise o contexto abaixo e extraia TODAS as informações sobre conteúdo programático de concurso.

CONTEXTO:
${contextText}

INSTRUÇÕES:
1. Identifique TODAS as disciplinas/matérias mencionadas
2. Para cada disciplina, extraia:
   - Nome da disciplina
   - Lista de tópicos/assuntos
   - Detalhamento específico quando disponível
3. Organize as informações por disciplina de forma hierárquica
4. Mantenha a estrutura original quando possível

Responda em JSON no seguinte formato:
{
  "disciplinas": [
    {
      "disciplina": "Nome da Disciplina",
      "topicos": ["Tópico 1", "Tópico 2", "Tópico 3"],
      "detalhamento": "Detalhes específicos se houver"
    }
  ],
  "resumoGeral": "Resumo geral sobre o conteúdo programático encontrado"
}`;

      const aiResponse = await aiChatWithContext(prompt,
        "Você é um especialista em análise de conteúdo programático de concursos. Extraia e organize as disciplinas e seus tópicos de forma precisa e hierárquica. Responda SEMPRE em JSON válido.",
        {
          temperature: 0.1,
          maxTokens: 3000
        }
      );

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse.content || '{}');
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta AI:', parseError);
        return {
          disciplinas: [],
          resumoGeral: "Erro ao processar conteúdo programático.",
          totalEncontrado: 0
        };
      }

      // Enriquecer com informações de similarity e fonte
      const disciplinasEnriquecidas: ConteudoProgramaticoInfo[] = (parsedResponse.disciplinas || []).map((disciplina: any, index: number) => ({
        ...disciplina,
        similarity: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.similarity || 0,
        fonte: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.title || 'Documento processado'
      }));

      console.log(`✅ Encontradas ${disciplinasEnriquecidas.length} disciplinas no conteúdo programático`);

      return {
        disciplinas: disciplinasEnriquecidas,
        resumoGeral: parsedResponse.resumoGeral || `Encontradas ${disciplinasEnriquecidas.length} disciplinas no conteúdo programático.`,
        totalEncontrado: disciplinasEnriquecidas.length
      };

    } catch (error) {
      console.error('❌ Erro ao buscar conteúdo programático:', error);
      return {
        disciplinas: [],
        resumoGeral: "Erro interno ao buscar conteúdo programático.",
        totalEncontrado: 0
      };
    }
  }

  /**
   * Busca personalizada usando RAG para qualquer aspecto do edital
   */
  async buscarInformacaoPersonalizada(userId: string, query: string): Promise<{
    resposta: string;
    fontes: string[];
    temContexto: boolean;
  }> {
    try {
      const resultado = await this.ragService.generateContextualResponse({
        userId,
        query,
        category: 'edital',
        maxContextLength: 6000,
        minSimilarity: 0.2,
        enableReRanking: true,
        initialTopK: 20,
        finalTopK: 8
      });

      const fontes = resultado.contextUsed.map(ctx => ctx.title);

      return {
        resposta: resultado.response,
        fontes: Array.from(new Set(fontes)), // Remove duplicatas
        temContexto: resultado.hasContext
      };

    } catch (error) {
      console.error('❌ Erro na busca personalizada:', error);
      return {
        resposta: "Erro interno ao processar a consulta.",
        fontes: [],
        temContexto: false
      };
    }
  }
}

export const editalRAGService = new EditalRAGService();