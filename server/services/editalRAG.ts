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
      
      // Query 1: Análise de cargos com prompt estruturado MUITO MAIS RIGOROSO
      const cargoQuery = `
INSTRUÇÃO CRÍTICA: Você DEVE responder APENAS com JSON válido, sem qualquer texto adicional antes ou depois.

Analise este edital e extraia informações sobre os cargos/vagas disponíveis.

FORMATO OBRIGATÓRIO - COPIE EXATAMENTE:
{
  "cargos": [
    {
      "nome": "Nome exato do cargo encontrado no edital",
      "requisitos": "Requisitos de formação e experiência",
      "atribuicoes": "Principais atribuições do cargo", 
      "salario": "Valor do salário ou vencimento",
      "vagas": 10
    }
  ]
}

REGRAS CRÍTICAS:
- Responda APENAS com o JSON, sem explicações
- Se encontrar múltiplos cargos, inclua todos no array
- Se não encontrar alguma informação, use "Não especificado no edital"
- Use aspas duplas para strings
- Números sem aspas
- JSON deve ser válido e parseável
`.trim();

      const cargoResult = await this.ragService.generateContextualResponse({
        userId,
        query: cargoQuery,
        // documentId, // REMOVIDO TEMPORARIAMENTE devido a IDs duplicados no serviço externo
        maxContextLength: 8000,
        minSimilarity: 0.2,
        enableReRanking: true,
        initialTopK: 20,
        finalTopK: 10
      });

      // Query 2: Análise de conhecimentos - MÚLTIPLAS BUSCAS ESPECÍFICAS
      const conhecimentosQueries = [
        "conhecimentos necessários disciplinas matérias programa conteúdo programático",
        "anexo conhecimentos programa matérias disciplinas tópicos assuntos",
        "conteúdo programático detalhado disciplinas conhecimentos programa",
        "matérias conhecimentos programa detalhado anexo disciplinas conteúdo"
      ];

      let allKnowledgeContent = "";
      let bestContexts: any[] = [];

      // SOLUÇÃO TEMPORÁRIA: Remover filtro por documento específico 
      // (problema: serviço externo usa mesmo ID para documentos diferentes)
      console.log(`⚠️ TEMPORÁRIO: Removendo filtro por documento devido a problema de IDs duplicados`);
      
      // Executar múltiplas queries para encontrar seções de conhecimentos
      for (const searchQuery of conhecimentosQueries) {
        try {
          const result = await this.ragService.generateContextualResponse({
            userId,
            query: searchQuery,
            // documentId, // REMOVIDO TEMPORARIAMENTE
            maxContextLength: 4000,
            minSimilarity: 0.1, // Reduzir threshold para captat mais conteúdo
            enableReRanking: true,
            initialTopK: 25,
            finalTopK: 12
          });

          if (result.hasContext && result.contextUsed.length > 0) {
            // Filtrar por conteúdo que pareça ser de edital/conhecimentos
            const editalContent = result.contextUsed
              .filter(ctx => 
                ctx.content.toLowerCase().includes('conhecimento') ||
                ctx.content.toLowerCase().includes('disciplina') ||
                ctx.content.toLowerCase().includes('programa') ||
                ctx.content.toLowerCase().includes('anexo') ||
                ctx.content.toLowerCase().includes('matéria') ||
                ctx.content.toLowerCase().includes('conteúdo programático')
              );
              
            if (editalContent.length > 0) {
              allKnowledgeContent += editalContent.map(ctx => ctx.content).join("\n\n") + "\n\n";
              bestContexts.push(...editalContent);
            } else {
              // Se não achou conteúdo específico, usar os primeiros resultados
              allKnowledgeContent += result.contextUsed.slice(0, 3).map(ctx => ctx.content).join("\n\n") + "\n\n";
              bestContexts.push(...result.contextUsed.slice(0, 3));
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erro na query "${searchQuery}":`, error);
        }
      }

      // Prompt específico para extrair conhecimentos de editais
      const conteudoQuery = `
Com base no seguinte conteúdo extraído do edital, identifique e organize APENAS os conhecimentos/disciplinas para a prova.

CONTEXTO DO EDITAL:
${allKnowledgeContent.substring(0, 6000)}

INSTRUÇÕES ESPECÍFICAS:
1. Procure por seções como "CONHECIMENTOS", "CONTEÚDO PROGRAMÁTICO", "ANEXO", "DISCIPLINAS", "MATÉRIAS" 
2. Ignore questões de exemplo, gabaritos, ou conteúdo de provas anteriores
3. Foque apenas no programa/conteúdo que será cobrado na prova
4. Organize as disciplinas de forma hierárquica com seus tópicos

Retorne um JSON válido no seguinte formato:
{
  "conteudoProgramatico": [
    {
      "disciplina": "Nome exato da disciplina/matéria",
      "topicos": [
        "Tópico 1 específico da disciplina",
        "Tópico 2 específico da disciplina",
        "Tópico 3 específico da disciplina"
      ]
    }
  ]
}

Se não encontrar conhecimentos específicos, retorne array vazio. Seja preciso e organize apenas o que está claramente definido como conteúdo da prova.
`.trim();

      // Log para debug do filtering
      console.log(`🔍 Coletado ${allKnowledgeContent.length} caracteres de contexto de conhecimentos`);
      console.log(`📚 Total de contextos únicos encontrados: ${bestContexts.length}`);
      
      // Se não encontrou contexto suficiente, fazer busca mais ampla
      if (allKnowledgeContent.length < 500) {
        console.log(`⚠️ Pouco contexto encontrado (${allKnowledgeContent.length} chars). Fazendo busca mais ampla...`);
        
        try {
          const fallbackResult = await this.ragService.generateContextualResponse({
            userId,
            query: "programa conteúdo conhecimentos anexo disciplinas",
            // documentId, // REMOVIDO TEMPORARIAMENTE
            maxContextLength: 8000,
            minSimilarity: 0.05, // Threshold muito baixo para captat qualquer coisa
            enableReRanking: true,
            initialTopK: 30,
            finalTopK: 15
          });
          
          if (fallbackResult.hasContext) {
            allKnowledgeContent = fallbackResult.contextUsed.map(ctx => ctx.content).join("\n\n");
            console.log(`🔄 Fallback: coletado ${allKnowledgeContent.length} caracteres adicionais`);
          }
        } catch (error) {
          console.warn('⚠️ Erro no fallback search:', error);
        }
      }

      // Usar IA diretamente com o contexto coletado (não fazer nova query RAG)
      const conteudoResult = await this.processKnowledgeWithAI(conteudoQuery);

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
   * Processa conhecimentos usando IA diretamente com contexto coletado
   */
  private async processKnowledgeWithAI(prompt: string): Promise<{ response: string }> {
    try {
      const aiResponse = await aiChatWithContext(
        prompt,
        "Você é um especialista em análise de editais de concursos. Extraia e organize conhecimentos de forma precisa e hierárquica. Responda SEMPRE em JSON válido.",
        {
          temperature: 0.1,
          maxTokens: 3000
        }
      );

      return {
        response: aiResponse.content || '{}'
      };
    } catch (error) {
      console.error('❌ Erro no processamento de conhecimentos com IA:', error);
      return {
        response: '{"conteudoProgramatico": []}'
      };
    }
  }

  /**
   * Parser seguro para respostas JSON da IA - VERSÃO MELHORADA
   */
  private parseJsonResponse(response: string, expectedField: string): any {
    try {
      console.log(`🔍 DEBUG: Parsing resposta para ${expectedField}`);
      console.log(`📝 RESPOSTA COMPLETA DA IA:\n${response}\n--- FIM DA RESPOSTA ---`);
      
      // Múltiplas tentativas de extração de JSON
      let parsed: any = null;
      
      // Tentativa 1: JSON completo na resposta
      try {
        const fullJsonMatch = response.match(/\{[\s\S]*\}/);
        if (fullJsonMatch) {
          parsed = JSON.parse(fullJsonMatch[0]);
          console.log(`✅ JSON parseado (método 1):`, parsed);
        }
      } catch (e) {
        console.log(`⚠️ Método 1 falhou:`, e);
      }
      
      // Tentativa 2: JSON dentro de código (```json)
      if (!parsed) {
        try {
          const codeBlockMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
          if (codeBlockMatch) {
            parsed = JSON.parse(codeBlockMatch[1].trim());
            console.log(`✅ JSON parseado (método 2):`, parsed);
          }
        } catch (e) {
          console.log(`⚠️ Método 2 falhou:`, e);
        }
      }
      
      // Tentativa 3: Buscar apenas pelo campo esperado
      if (!parsed) {
        try {
          const fieldRegex = new RegExp(`"${expectedField}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
          const fieldMatch = response.match(fieldRegex);
          if (fieldMatch) {
            const fieldContent = `[${fieldMatch[1]}]`;
            parsed = { [expectedField]: JSON.parse(fieldContent) };
            console.log(`✅ JSON parseado (método 3):`, parsed);
          }
        } catch (e) {
          console.log(`⚠️ Método 3 falhou:`, e);
        }
      }
      
      if (!parsed) {
        console.warn(`❌ NENHUM JSON VÁLIDO ENCONTRADO na resposta para ${expectedField}`);
        console.log(`📋 Tentando interpretação manual da resposta...`);
        
        // Interpretação manual se a IA respondeu em texto
        if (response.toLowerCase().includes('cargo') && expectedField === 'cargos') {
          return this.manualCargoExtraction(response);
        }
        
        if (response.toLowerCase().includes('disciplina') && expectedField === 'conteudoProgramatico') {
          return this.manualConteudoExtraction(response);
        }
        
        return { [expectedField]: [] };
      }

      if (!parsed[expectedField]) {
        console.warn(`⚠️ Campo ${expectedField} não encontrado no JSON parseado`);
        console.log(`📋 Campos disponíveis:`, Object.keys(parsed));
        return { [expectedField]: [] };
      }

      console.log(`✅ Extração bem-sucedida para ${expectedField}:`, parsed[expectedField]);
      return parsed;
      
    } catch (error) {
      console.error(`❌ Erro crítico no parsing para ${expectedField}:`, error);
      console.log(`📝 Resposta que causou erro: ${response.substring(0, 1000)}...`);
      return { [expectedField]: [] };
    }
  }

  /**
   * Extração manual de cargos quando JSON falha
   */
  private manualCargoExtraction(response: string): any {
    console.log(`🔧 Tentando extração manual de cargos...`);
    
    // Buscar padrões típicos de nomes de cargos
    const cargoPatterns = [
      /cargo[:\s]*([^\n\r.]+)/gi,
      /vaga[:\s]*([^\n\r.]+)/gi,
      /função[:\s]*([^\n\r.]+)/gi,
      /posição[:\s]*([^\n\r.]+)/gi
    ];
    
    let cargosEncontrados: any[] = [];
    
    for (const pattern of cargoPatterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        const nome = match[1].trim();
        if (nome.length > 5) { // Filtrar matches muito curtos
          cargosEncontrados.push({
            nome: nome,
            requisitos: "Conforme edital",
            atribuicoes: "Conforme edital",
            salario: "A consultar no edital"
          });
        }
      }
    }
    
    if (cargosEncontrados.length > 0) {
      console.log(`✅ Extração manual encontrou ${cargosEncontrados.length} cargos`);
      return { cargos: cargosEncontrados.slice(0, 3) }; // Limitar a 3 para evitar duplicatas
    }
    
    return { cargos: [] };
  }

  /**
   * Extração manual de conteúdo programático quando JSON falha
   */
  private manualConteudoExtraction(response: string): any {
    console.log(`🔧 Tentando extração manual de conteúdo programático...`);
    
    const lines = response.split('\n');
    let disciplinas: any[] = [];
    let currentDisciplina = '';
    let currentTopicos: string[] = [];
    
    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Detectar disciplina (linha que parece ser título)
      if (cleanLine.match(/^[A-Z][a-zA-Z\s]+:?$/) || cleanLine.includes('Disciplina') || cleanLine.includes('Matéria')) {
        if (currentDisciplina && currentTopicos.length > 0) {
          disciplinas.push({
            disciplina: currentDisciplina,
            topicos: [...currentTopicos]
          });
        }
        currentDisciplina = cleanLine.replace(':', '');
        currentTopicos = [];
      }
      // Detectar tópicos (linhas que começam com - ou número)
      else if (cleanLine.match(/^[-•*]\s/) || cleanLine.match(/^\d+\.?\s/)) {
        const topico = cleanLine.replace(/^[-•*\d\.]\s*/, '').trim();
        if (topico.length > 5) {
          currentTopicos.push(topico);
        }
      }
    }
    
    // Adicionar última disciplina
    if (currentDisciplina && currentTopicos.length > 0) {
      disciplinas.push({
        disciplina: currentDisciplina,
        topicos: currentTopicos
      });
    }
    
    if (disciplinas.length > 0) {
      console.log(`✅ Extração manual encontrou ${disciplinas.length} disciplinas`);
      return { conteudoProgramatico: disciplinas };
    }
    
    return { conteudoProgramatico: [] };
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
   * Busca e organiza conhecimentos
   */
  async buscarConhecimentos(userId: string, query: string = "conhecimentos"): Promise<{
    disciplinas: ConteudoProgramaticoInfo[];
    resumoGeral: string;
    totalEncontrado: number;
  }> {
    try {
      console.log(`📚 Buscando conhecimentos para usuário ${userId}...`);

      // Buscar contexto relevante para conhecimentos
      const conteudoQueries = [
        "conhecimentos disciplinas",
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
          resumoGeral: "Nenhum conhecimento encontrado nos documentos processados.",
          totalEncontrado: 0
        };
      }

      // Usar AI para extrair e organizar conhecimentos
      const contextText = resultadosUnicos
        .slice(0, 20) // Mais contexto para conhecimentos
        .map(r => `[${r.title}] ${r.content}`)
        .join('\n\n---\n\n');

      const prompt = `Analise o contexto abaixo e extraia TODAS as informações sobre conhecimentos de concurso.

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
  "resumoGeral": "Resumo geral sobre os conhecimentos encontrados"
}`;

      const aiResponse = await aiChatWithContext(prompt,
        "Você é um especialista em análise de conhecimentos de concursos. Extraia e organize as disciplinas e seus tópicos de forma precisa e hierárquica. Responda SEMPRE em JSON válido.",
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
          resumoGeral: "Erro ao processar conhecimentos.",
          totalEncontrado: 0
        };
      }

      // Enriquecer com informações de similarity e fonte
      const disciplinasEnriquecidas: ConteudoProgramaticoInfo[] = (parsedResponse.disciplinas || []).map((disciplina: any, index: number) => ({
        ...disciplina,
        similarity: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.similarity || 0,
        fonte: resultadosUnicos[Math.min(index, resultadosUnicos.length - 1)]?.title || 'Documento processado'
      }));

      console.log(`✅ Encontradas ${disciplinasEnriquecidas.length} disciplinas nos conhecimentos`);

      return {
        disciplinas: disciplinasEnriquecidas,
        resumoGeral: parsedResponse.resumoGeral || `Encontradas ${disciplinasEnriquecidas.length} disciplinas nos conhecimentos.`,
        totalEncontrado: disciplinasEnriquecidas.length
      };

    } catch (error) {
      console.error('❌ Erro ao buscar conhecimentos:', error);
      return {
        disciplinas: [],
        resumoGeral: "Erro interno ao buscar conhecimentos.",
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