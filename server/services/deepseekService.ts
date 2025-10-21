import { createAIClient, AIClient } from '../integrations/openai';

interface ChunkGenerationRequest {
  content: string;
  fileName: string;
  fileType: string;
  concursoNome: string;
  maxChunks?: number;
}

interface GeneratedChunk {
  id: string;
  content: string;
  title: string;
  summary: string;
  keywords: string[];
  chunkIndex: number;
}

interface DeepSeekChunkResponse {
  chunks: GeneratedChunk[];
  totalChunks: number;
  processingTime: number;
}

interface CargoAnalysisRequest {
  content: string;
  fileName: string;
  concursoNome: string;
}

interface CargoAnalysisResponse {
  hasSingleCargo: boolean;
  cargoName?: string;
  cargos?: string[];
  totalCargos: number;
  explicacao: string;
}

interface ConteudoProgramaticoRequest {
  content: string;
  cargoName: string;
  concursoNome: string;
}

interface ConteudoProgramaticoResponse {
  cargo: string;
  disciplinas: {
    nome: string;
    topicos: string[];
  }[];
}

export class DeepSeekService {
  private aiClient: AIClient;

  constructor() {
    // Usar cliente integrado para acessar DeepSeek R1 via OpenRouter
    this.aiClient = createAIClient({
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: "https://openrouter.ai/api/v1",
      models: {
        default: "deepseek/deepseek-r1"
      }
    });
    console.log('✅ [DeepSeekService] Inicializado com cliente integrado');
  }

  /**
   * Gera chunks inteligentes usando DeepSeek R1
   */
  async generateIntelligentChunks(request: ChunkGenerationRequest): Promise<DeepSeekChunkResponse> {
    const startTime = Date.now();
    console.log(`🧠 Gerando chunks com DeepSeek R1 para: ${request.fileName}`);

    try {
      const prompt = this.buildChunkGenerationPrompt(request);
      
      const aiResponse = await this.aiClient.sendRequest({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em processamento de documentos para concursos públicos. Sua tarefa é analisar conteúdo de editais e gerar chunks inteligentes que capturem informações importantes de forma estruturada."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        maxTokens: 1200, // Reduzido para caber no limite de créditos disponível
      });

      const response = aiResponse.content;
      
      if (!response) {
        throw new Error('DeepSeek R1 não retornou resposta válida');
      }

      // Parse da resposta JSON
      const parsedResponse = this.parseChunkResponse(response);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ DeepSeek R1 gerou ${parsedResponse.chunks.length} chunks em ${processingTime}ms`);

      return {
        ...parsedResponse,
        processingTime
      };

    } catch (error) {
      console.error('❌ Erro no DeepSeek R1 para geração de chunks:', error);
      throw new Error(`Falha na geração de chunks com DeepSeek R1: ${(error as Error).message}`);
    }
  }

  /**
   * Analisa se o edital tem um único cargo ou múltiplos cargos
   */
  async analyzeCargos(request: CargoAnalysisRequest): Promise<CargoAnalysisResponse> {
    console.log(`🔍 Analisando cargos com DeepSeek R1 para: ${request.fileName}`);

    try {
      const prompt = this.buildCargoAnalysisPrompt(request);
      
      const aiResponse = await this.aiClient.sendRequest({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em análise de editais de concursos públicos. Sua tarefa é identificar quantos cargos estão sendo oferecidos em um edital e extrair seus nomes de forma precisa."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        maxTokens: 1000,
      });

      const response = aiResponse.content;
      
      if (!response) {
        throw new Error('DeepSeek R1 não retornou resposta válida para análise de cargos');
      }

      const parsedResponse = this.parseCargoAnalysisResponse(response);
      console.log(`✅ Análise de cargos concluída: ${parsedResponse.hasSingleCargo ? 'cargo único' : 'múltiplos cargos'}`);

      return parsedResponse;

    } catch (error) {
      console.error('❌ Erro no DeepSeek R1 para análise de cargos:', error);
      throw new Error(`Falha na análise de cargos com DeepSeek R1: ${(error as Error).message}`);
    }
  }

  /**
   * Extrai conhecimentos de um cargo específico
   */
  async extractConteudoProgramatico(request: ConteudoProgramaticoRequest): Promise<ConteudoProgramaticoResponse> {
    console.log(`📚 Extraindo conhecimentos com DeepSeek R1 para cargo: ${request.cargoName}`);

    try {
      const prompt = this.buildConteudoProgramaticoPrompt(request);
      
      const aiResponse = await this.aiClient.sendRequest({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em extração de conhecimentos de editais de concursos públicos. Sua tarefa é identificar e estruturar as disciplinas e tópicos de estudo de forma hierárquica e organizada."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        maxTokens: 800, // Reduzido para otimizar uso de créditos
      });

      const response = aiResponse.content;
      
      if (!response) {
        throw new Error('DeepSeek R1 não retornou resposta válida para extração de conteúdo');
      }

      const parsedResponse = this.parseConteudoProgramaticoResponse(response);
      console.log(`✅ Conhecimentos extraídos: ${parsedResponse.disciplinas.length} disciplinas`);

      return parsedResponse;

    } catch (error) {
      console.error('❌ Erro no DeepSeek R1 para extração de conhecimentos:', error);
      throw new Error(`Falha na extração de conhecimentos com DeepSeek R1: ${(error as Error).message}`);
    }
  }

  /**
   * Constrói o prompt para geração de chunks
   */
  private buildChunkGenerationPrompt(request: ChunkGenerationRequest): string {
    const maxChunks = request.maxChunks || 50;
    
    return `
TAREFA: Analise o seguinte conteúdo de edital de concurso público e gere chunks inteligentes que capturem informações importantes.

INFORMAÇÕES DO ARQUIVO:
- Nome: ${request.fileName}
- Tipo: ${request.fileType}
- Concurso: ${request.concursoNome}

CONTEÚDO:
${request.content.substring(0, 1500)} ${request.content.length > 1500 ? '...' : ''}

INSTRUÇÕES:
1. Analise o conteúdo e identifique seções importantes (cargos, requisitos, conhecimentos, cronograma, etc.)
2. Crie chunks semânticos que mantêm contexto completo
3. Cada chunk deve ter entre 200-800 caracteres
4. Gere no máximo ${maxChunks} chunks
5. Priorize informações sobre cargos, requisitos e conhecimentos
6. Para cada chunk, forneça título, resumo e palavras-chave

FORMATO DE RESPOSTA (JSON):
{
  "chunks": [
    {
      "id": "chunk_001",
      "content": "Conteúdo do chunk...",
      "title": "Título descritivo",
      "summary": "Resumo do que contém",
      "keywords": ["palavra1", "palavra2", "palavra3"],
      "chunkIndex": 0
    }
  ],
  "totalChunks": número_total_de_chunks
}
`;
  }

  /**
   * Constrói o prompt para análise de cargos
   */
  private buildCargoAnalysisPrompt(request: CargoAnalysisRequest): string {
    return `
TAREFA: Analise o seguinte edital e determine quantos cargos estão sendo oferecidos.

INFORMAÇÕES DO ARQUIVO:
- Nome: ${request.fileName}
- Concurso: ${request.concursoNome}

CONTEÚDO DO EDITAL:
${request.content.substring(0, 2000)} ${request.content.length > 2000 ? '...' : ''}

INSTRUÇÕES:
1. Identifique todos os cargos oferecidos no edital
2. Determine se há apenas UM cargo ou MÚLTIPLOS cargos
3. Se for apenas um cargo, extraia o nome exato
4. Se forem múltiplos, liste todos os cargos

FORMATO DE RESPOSTA (JSON):
{
  "hasSingleCargo": true/false,
  "cargoName": "Nome exato do cargo (apenas se for único)",
  "cargos": ["lista", "de", "cargos"] (apenas se forem múltiplos),
  "totalCargos": número_total,
  "explicacao": "Breve explicação da análise"
}
`;
  }

  /**
   * Constrói o prompt para extração de conhecimentos
   */
  private buildConteudoProgramaticoPrompt(request: ConteudoProgramaticoRequest): string {
    return `
TAREFA: Extraia os conhecimentos para o cargo "${request.cargoName}" do seguinte edital.

INFORMAÇÕES:
- Cargo: ${request.cargoName}
- Concurso: ${request.concursoNome}

CONTEÚDO DO EDITAL:
${request.content.substring(0, 3000)} ${request.content.length > 3000 ? '...' : ''}

INSTRUÇÕES:
1. Encontre a seção de conhecimentos/disciplinas para o cargo específico
2. Organize as disciplinas e seus respectivos tópicos
3. Mantenha a estrutura hierárquica original
4. Seja preciso e completo na extração

FORMATO DE RESPOSTA (JSON):
{
  "cargo": "${request.cargoName}",
  "disciplinas": [
    {
      "nome": "Nome da disciplina",
      "topicos": [
        "Tópico 1",
        "Tópico 2",
        "Subtópico com detalhes"
      ]
    }
  ]
}
`;
  }

  /**
   * Faz parse da resposta de geração de chunks
   */
  private parseChunkResponse(response: string): { chunks: GeneratedChunk[]; totalChunks: number } {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
        throw new Error('Resposta não contém array de chunks válido');
      }

      return {
        chunks: parsed.chunks,
        totalChunks: parsed.totalChunks || parsed.chunks.length
      };
    } catch (error) {
      console.error('❌ Erro ao fazer parse da resposta de chunks:', error);
      console.error('❌ Resposta original:', response);
      throw new Error('Falha ao interpretar resposta do DeepSeek R1 para chunks');
    }
  }

  /**
   * Faz parse da resposta de análise de cargos
   */
  private parseCargoAnalysisResponse(response: string): CargoAnalysisResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (typeof parsed.hasSingleCargo === 'undefined') {
        throw new Error('Resposta não contém propriedade hasSingleCargo');
      }

      return {
        hasSingleCargo: parsed.hasSingleCargo,
        cargoName: parsed.cargoName,
        cargos: parsed.cargos,
        totalCargos: parsed.totalCargos || 0,
        explicacao: parsed.explicacao || ''
      };
    } catch (error) {
      console.error('❌ Erro ao fazer parse da resposta de análise de cargos:', error);
      console.error('❌ Resposta original:', response);
      throw new Error('Falha ao interpretar resposta do DeepSeek R1 para análise de cargos');
    }
  }

  /**
   * Faz parse da resposta de conhecimentos
   */
  private parseConteudoProgramaticoResponse(response: string): ConteudoProgramaticoResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.cargo || !parsed.disciplinas || !Array.isArray(parsed.disciplinas)) {
        throw new Error('Resposta não contém estrutura válida de conhecimentos');
      }

      return {
        cargo: parsed.cargo,
        disciplinas: parsed.disciplinas
      };
    } catch (error) {
      console.error('❌ Erro ao fazer parse da resposta de conhecimentos:', error);
      console.error('❌ Resposta original:', response);
      throw new Error('Falha ao interpretar resposta do DeepSeek R1 para conhecimentos');
    }
  }
}

export const deepseekService = new DeepSeekService();