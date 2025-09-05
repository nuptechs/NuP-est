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
   * NOVO: Análise completa de edital com queries estruturadas em JSON
   */
  async analyzeEdital(userId: string, documentId: string): Promise<{
    cargos: Array<{
      nome: string;
      requisitos?: string;
      atribuicoes?: string;
      salario?: string;
      vagas?: number;
    }>;
    conteudoProgramatico: Array<{
      disciplina: string;
      topicos: string[];
    }>;
    rawResponses: {
      cargoAnalysis: string;
      conteudoAnalysis: string;
    };
    hasMultipleCargos: boolean;
  }> {
    try {
      console.log(`🔍 Iniciando análise completa para documento ${documentId}`);
      
      // Query 1: Análise de cargos com prompt estruturado
      const cargoQuery = `
Analise este edital e extraia informações sobre os cargos/vagas disponíveis.
Retorne um JSON válido no seguinte formato:
{
  "cargos": [
    {
      "nome": "Nome do cargo",
      "requisitos": "Requisitos de formação e experiência",
      "atribuicoes": "Principais atribuições do cargo",
      "salario": "Valor do salário ou vencimento",
      "vagas": 10
    }
  ]
}
Se houver múltiplos cargos, inclua todos no array. Se não encontrar informações específicas, omita o campo.
`.trim();

      const cargoResult = await this.ragService.generateContextualResponse({
        userId,
        query: cargoQuery,
        documentId,
        maxContextLength: 8000,
        minSimilarity: 0.2,
        enableReRanking: true,
        initialTopK: 20,
        finalTopK: 10
      });

      // Query 2: Análise de conteúdo programático estruturado
      const conteudoQuery = `
Analise este edital e extraia o conteúdo programático/matérias de estudo.
Retorne um JSON válido no seguinte formato:
{
  "conteudoProgramatico": [
    {
      "disciplina": "Nome da disciplina/matéria",
      "topicos": [
        "Tópico 1 da disciplina",
        "Tópico 2 da disciplina",
        "Tópico 3 da disciplina"
      ]
    }
  ]
}
Organize por disciplinas e liste todos os tópicos/assuntos de cada uma.
`.trim();

      const conteudoResult = await this.ragService.generateContextualResponse({
        userId,
        query: conteudoQuery,
        documentId,
        maxContextLength: 8000,
        minSimilarity: 0.2,
        enableReRanking: true,
        initialTopK: 20,
        finalTopK: 10
      });

      // Processar e validar respostas JSON
      const cargosData = this.parseJsonResponse(cargoResult.response, 'cargos');
      const conteudoData = this.parseJsonResponse(conteudoResult.response, 'conteudoProgramatico');

      console.log(`✅ Análise concluída: ${cargosData.cargos?.length || 0} cargos, ${conteudoData.conteudoProgramatico?.length || 0} disciplinas`);

      return {
        cargos: cargosData.cargos || [],
        conteudoProgramatico: conteudoData.conteudoProgramatico || [],
        rawResponses: {
          cargoAnalysis: cargoResult.response,
          conteudoAnalysis: conteudoResult.response
        },
        hasMultipleCargos: (cargosData.cargos?.length || 0) > 1
      };

    } catch (error) {
      console.error('❌ Erro na análise do edital:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha na análise do edital: ${errorMessage}`);
    }
  }

  /**
   * Parser seguro para respostas JSON da IA
   */
  private parseJsonResponse(response: string, expectedField: string): any {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`⚠️ Nenhum JSON encontrado na resposta para ${expectedField}`);
        return { [expectedField]: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed[expectedField]) {
        console.warn(`⚠️ Campo ${expectedField} não encontrado no JSON parseado`);
        return { [expectedField]: [] };
      }

      return parsed;
    } catch (error) {
      console.error(`❌ Erro ao parsear JSON para ${expectedField}:`, error);
      console.log(`📝 Resposta original: ${response.substring(0, 500)}...`);
      return { [expectedField]: [] };
    }
  }

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
        console.log(`🔍 Buscando: "${query} ${cargoQuery}" para userId: ${userId}`);
        
        const resultados = await pineconeService.searchSimilarContent(
          `${query} ${cargoQuery}`,
          userId,
          {
            topK: 15,
            // Remover filtro de categoria - buscar todos os dados do usuário
            minSimilarity: 0.2 // Menos restritivo
          }
        );
        
        console.log(`🔍 Query "${cargoQuery}" retornou ${resultados.length} resultados`);
        todosResultados = [...todosResultados, ...resultados];
      }

      // Remover duplicatas baseado no conteúdo
      const resultadosUnicos = todosResultados.filter((item, index, arr) => 
        arr.findIndex(t => t.content === item.content) === index
      );

      if (resultadosUnicos.length === 0) {
        console.log(`❌ Nenhum resultado encontrado no Pinecone para userId: ${userId}`);
        
        // SEM FALLBACK - falhar diretamente
        throw new Error('Nenhum dado encontrado no Pinecone para este usuário. Verifique se o documento foi indexado corretamente.');
      }

      // Usar apenas resultados únicos - SEM FALLBACK
      const resultadosParaProcessar = resultadosUnicos;
      
      // Usar AI para extrair e estruturar informações sobre cargos
      const contextText = resultadosParaProcessar
        .slice(0, 15) // Limitar para não sobrecarregar
        .map(r => `[${r.title}] ${r.content}`)
        .join('\n\n---\n\n');
        
      console.log(`📝 Processando ${resultadosParaProcessar.length} resultados para análise de cargos`);

      const prompt = `Analise EXCLUSIVAMENTE o contexto dos documentos fornecidos e extraia informações sobre cargos de concurso público.

⚠️  IMPORTANTE: Use APENAS informações presentes nestes documentos específicos. NÃO use conhecimento prévio sobre outros concursos.

CONTEXTO DOS DOCUMENTOS ATUAIS:
${contextText}

INSTRUÇÕES CRÍTICAS:
1. Identifique cargos mencionados APENAS nestes documentos específicos
2. Extraia o nome EXATO dos cargos conforme aparecem nos documentos
3. Se o documento menciona estado/UF específico (SE, DF, RJ, etc.), mantenha essa informação EXATA
4. Para cada cargo, extraia:
   - Nome EXATO do cargo conforme aparece no documento
   - Requisitos de formação quando disponível
   - Atribuições e funções quando disponível  
   - Salário/remuneração quando disponível
   - Carga horária quando disponível
   - Número de vagas quando disponível
5. Se alguma informação não estiver nos documentos, marque como "Não informado"
6. NÃO invente ou complemente informações com conhecimento externo

Responda em JSON no seguinte formato:
{
  "cargos": [
    {
      "nome": "Nome exato do cargo conforme documento (incluindo UF se mencionada)",
      "requisitos": "Requisitos ou 'Não informado'",
      "atribuicoes": "Atribuições ou 'Não informado'", 
      "salario": "Salário ou 'Não informado'",
      "cargaHoraria": "Carga horária ou 'Não informado'",
      "vagas": "Número de vagas ou 'Não informado'"
    }
  ],
  "resumoGeral": "Resumo sobre os cargos encontrados NESTES documentos específicos"
}`;

      const aiResponse = await aiChatWithContext(prompt, 
        "Você é um especialista em análise de editais de concurso. Extraia informações EXCLUSIVAMENTE dos documentos fornecidos, sem usar conhecimento prévio. Mantenha nomes de cargos e localizações EXATOS conforme o documento. Responda SEMPRE em JSON válido.",
        {
          temperature: 0.05, // Mais determinístico
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
      throw error; // Propagar erro - SEM FALLBACK
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
            // Remover filtro de categoria - buscar todos os dados do usuário
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
  async buscarInformacaoPersonalizada(
    userId: string, 
    query: string, 
    documentId?: string // NOVO: filtrar por documento específico
  ): Promise<{
    resposta: string;
    fontes: string[];
    temContexto: boolean;
  }> {
    try {
      const resultado = await this.ragService.generateContextualResponse({
        userId,
        query,
        // Remover filtro de categoria - buscar todos os dados do usuário
        maxContextLength: 6000,
        minSimilarity: 0.2,
        enableReRanking: true,
        initialTopK: 20,
        finalTopK: 8,
        documentId // CRÍTICO: usar apenas documento específico se fornecido
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