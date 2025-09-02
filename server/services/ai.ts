import OpenAI from "openai";
import type { Material, Subject, Topic, Goal, KnowledgeBase } from "@shared/schema";
import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { webSearch, type WebSearchResult } from "./web-search";
import { ragService } from "./rag";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";

// Initialize OpenRouter client for DeepSeek R1
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export interface QuestionGenerationRequest {
  subject: Subject;
  topic?: Topic;
  materials: Material[];
  studyProfile: string;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
}

export interface FlashcardGenerationRequest {
  content: string;
  studyProfile: string;
  subject?: string;
  count: number;
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export class AIService {
  async generateQuestions(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    const { subject, topic, materials, studyProfile, difficulty, questionCount } = request;

    // Build context from materials
    const materialContext = materials
      .map(m => `Material: ${m.title}\nType: ${m.type}\nContent: ${m.content || m.description || 'No content available'}`)
      .join('\n\n');

    const topicInfo = topic ? `Topic: ${topic.name} - ${topic.description}` : '';

    // Customize prompt based on study profile
    const profileStrategies = {
      disciplined: "Generate challenging questions that require deep understanding and application of concepts. Focus on analytical and problem-solving questions.",
      undisciplined: "Generate engaging, practical questions with real-world applications. Use varied question formats to maintain interest and motivation.",
      average: "Generate a balanced mix of theoretical and practical questions with clear explanations to reinforce learning."
    };

    const strategy = profileStrategies[studyProfile as keyof typeof profileStrategies] || profileStrategies.average;

    const prompt = `You are an expert educator creating personalized study questions.

Subject: ${subject.name} - ${subject.description}
${topicInfo}
Study Profile: ${studyProfile}
Strategy: ${strategy}
Difficulty Level: ${difficulty}

Materials to base questions on:
${materialContext}

Generate ${questionCount} multiple-choice questions based on the provided materials. Each question should:
1. Be directly related to the content in the materials
2. Match the ${difficulty} difficulty level
3. Be appropriate for a ${studyProfile} student
4. Have 4 options (A, B, C, D)
5. Include a clear explanation of the correct answer

Respond with a JSON object containing an array of questions in this exact format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this answer is correct and why others are wrong",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("No response from AI");
      }
      
      // Clean JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.questions || [];
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error("Failed to generate questions: " + (error as Error).message);
    }
  }

  async generateStudyRecommendation(
    studyProfile: string,
    subjects: Subject[],
    recentPerformance: any[]
  ): Promise<string> {
    const prompt = `Based on the following student profile and performance data, provide a personalized study recommendation.

Study Profile: ${studyProfile}
Subjects: ${subjects.map(s => `${s.name} (${s.category})`).join(', ')}
Recent Performance: ${recentPerformance.length > 0 ? 
  recentPerformance.map(p => `${p.subject}: ${p.score}%`).join(', ') : 
  'No recent performance data'
}

Provide a concise, actionable study recommendation (2-3 sentences) tailored to this student's profile and current progress.`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const text = response.choices[0]?.message?.content;
      return text || "Continue with your current study plan and focus on consistent practice.";
    } catch (error) {
      console.error("Error generating recommendation:", error);
      return "Keep up the good work! Focus on areas where you need more practice and maintain a consistent study schedule.";
    }
  }

  // 🧠 SISTEMA INTELIGENTE DE SELEÇÃO DE MODELO
  private selectOptimalModel(question: string, knowledgeContext: string, webContext: string): {
    model: string;
    name: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    reasoning: string;
  } {
    const questionLower = question.toLowerCase();
    const hasComplexContext = knowledgeContext.length > 500 || webContext.length > 500;
    
    // 📊 DETECTAR PERGUNTAS SOBRE TABELAS/ANÁLISES (Claude 3.5 Sonnet - Alta qualidade)
    const tableKeywords = ['tabela', 'table', 'comparar', 'compare', 'análise', 'analysis', 'classificar', 'classify', 'organizar', 'organize', 'estruturar', 'listar detalhadamente', 'diferenças entre', 'semelhanças', 'quadro', 'matriz', 'planilha', 'dados organizados'];
    const isTableAnalysis = tableKeywords.some(keyword => questionLower.includes(keyword));
    
    // 💻 DETECTAR PERGUNTAS TÉCNICAS/CÓDIGO (DeepSeek V3 - Especializado)
    const techKeywords = ['código', 'code', 'programar', 'programming', 'algoritmo', 'algorithm', 'função', 'function', 'javascript', 'python', 'sql', 'html', 'css', 'api', 'debug', 'erro técnico', 'implementar', 'desenvolvimento'];
    const isTechnical = techKeywords.some(keyword => questionLower.includes(keyword));
    
    // 📝 DETECTAR PERGUNTAS COMPLEXAS QUE PRECISAM DE ALTA QUALIDADE
    const complexKeywords = ['explique detalhadamente', 'análise profunda', 'compare detalhadamente', 'dissertação', 'ensaio', 'redação', 'argumentação', 'fundamentação teórica'];
    const isComplex = complexKeywords.some(keyword => questionLower.includes(keyword)) || hasComplexContext;
    
    // 📊 LÓGICA DE SELEÇÃO INTELIGENTE
    if (isTableAnalysis || question.length > 200) {
      return {
        model: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet (Tabelas/Análises)",
        temperature: 0.4,
        maxTokens: 1500,
        topP: 0.85,
        reasoning: "Pergunta sobre tabelas/análises ou muito longa - usando Claude para máxima qualidade"
      };
    }
    
    if (isTechnical) {
      return {
        model: "deepseek/deepseek-v3",
        name: "DeepSeek V3 (Técnico)",
        temperature: 0.3,
        maxTokens: 1200,
        topP: 0.8,
        reasoning: "Pergunta técnica - usando DeepSeek V3 especializado"
      };
    }
    
    if (isComplex || hasComplexContext) {
      return {
        model: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet (Complexo)",
        temperature: 0.5,
        maxTokens: 1200,
        topP: 0.9,
        reasoning: "Pergunta complexa ou muito contexto - usando Claude para melhor qualidade"
      };
    }
    
    // 💰 PADRÃO: Perguntas gerais (DeepSeek R1 - Econômico)
    return {
      model: "deepseek/deepseek-r1",
      name: "DeepSeek R1 (Geral)",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      reasoning: "Pergunta geral - usando modelo econômico"
    };
  }

  // ⚡ OTIMIZAÇÃO AUTOMÁTICA DE CONTEXTO para evitar limites de tokens
  private optimizePromptSize(prompt: string, selectedModel: any): string {
    // Aproximação: 1 token ≈ 4 caracteres em português
    const estimatedTokens = Math.ceil(prompt.length / 4);
    
    // Limites seguros por modelo (deixando margem para resposta)
    const tokenLimits = {
      'anthropic/claude-3.5-sonnet': 8000, // Limite seguro para contas free
      'deepseek/deepseek-v3': 6000,
      'deepseek/deepseek-r1': 15000, // Modelo mais generoso
    };
    
    const maxTokens = tokenLimits[selectedModel.model as keyof typeof tokenLimits] || 6000;
    
    if (estimatedTokens <= maxTokens) {
      console.log(`📏 Prompt OK: ${estimatedTokens} tokens (limite: ${maxTokens})`);
      return prompt;
    }

    console.log(`⚠️ Prompt muito grande: ${estimatedTokens} tokens, truncando para ${maxTokens}`);
    
    // Estratégia de truncamento inteligente:
    // 1. Manter pergunta original (mais importante)
    // 2. Reduzir contexto de conhecimento
    // 3. Reduzir contexto web
    
    const lines = prompt.split('\n');
    let truncatedLines: string[] = [];
    let currentTokens = 0;
    let inKnowledgeSection = false;
    let inWebSection = false;
    let knowledgeLines = 0;
    let webLines = 0;
    
    // Primeira passagem: identificar seções e manter estrutura essencial
    for (const line of lines) {
      const lineTokens = Math.ceil(line.length / 4);
      
      // Detectar seções
      if (line.includes('📚 BASE DE CONHECIMENTO')) {
        inKnowledgeSection = true;
        inWebSection = false;
      } else if (line.includes('🌐 INFORMAÇÕES DA INTERNET')) {
        inKnowledgeSection = false;
        inWebSection = true;
      }
      
      // Sempre manter: pergunta, instruções, formato
      const isEssential = !inKnowledgeSection && !inWebSection;
      
      if (isEssential) {
        if (currentTokens + lineTokens <= maxTokens) {
          truncatedLines.push(line);
          currentTokens += lineTokens;
        }
      } else if (inKnowledgeSection && knowledgeLines < 20) {
        // Limitar conhecimento a 20 linhas mais importantes
        if (currentTokens + lineTokens <= maxTokens) {
          truncatedLines.push(line);
          currentTokens += lineTokens;
          knowledgeLines++;
        }
      } else if (inWebSection && webLines < 10) {
        // Limitar web a 10 linhas mais importantes
        if (currentTokens + lineTokens <= maxTokens) {
          truncatedLines.push(line);
          currentTokens += lineTokens;
          webLines++;
        }
      }
    }
    
    const truncatedPrompt = truncatedLines.join('\n');
    const finalTokens = Math.ceil(truncatedPrompt.length / 4);
    
    console.log(`✅ Prompt otimizado: ${finalTokens} tokens (reduzido de ${estimatedTokens})`);
    
    // Se ainda assim for muito grande, cortar mais drasticamente
    if (finalTokens > maxTokens) {
      const targetChars = maxTokens * 4;
      const drasticPrompt = truncatedPrompt.substring(0, targetChars);
      console.log(`🔥 Corte drástico aplicado para ${Math.ceil(drasticPrompt.length / 4)} tokens`);
      return drasticPrompt + '\n\n⚠️ Contexto reduzido devido a limites de tokens. Responda com base no conteúdo disponível.';
    }
    
    return truncatedPrompt;
  }

  /**
   * NOVO: Chat com IA usando RAG - sempre consulta base primeiro
   */
  async chatWithAI(question: string, studyProfile: string, subjects: Subject[], selectedGoal?: any, userId?: string, selectedKnowledgeCategory?: string): Promise<string> {
    // Se temos userId, usar o novo sistema RAG
    if (userId) {
      try {
        console.log(`🤖 AI Assistant RAG ativado para: "${question.substring(0, 100)}..."`);
        
        const ragResponse = await ragService.generateContextualResponse({
          userId,
          query: question,
          category: selectedKnowledgeCategory,
          model: 'gpt-4o-mini'
        });

        return ragResponse.response;
      } catch (error) {
        console.error('❌ Erro no RAG Assistant:', error);
        // Fallback para o método anterior
      }
    }

    // Método anterior como fallback
    // FASE 1: Busca INTELIGENTE na base de conhecimento
    let knowledgeContext = '';
    let hasPersonalKnowledge = false;
    
    if (userId) {
      try {
        // Busca com embeddings (mais precisa)
        const queryEmbedding = await embeddingsService.generateEmbedding(question);
        const embeddingResults = await storage.searchKnowledgeBaseWithEmbeddings(userId, queryEmbedding, 5, selectedKnowledgeCategory);
        
        // Busca tradicional por keywords (mais abrangente)
        const keywordResults = await storage.searchKnowledgeBase(userId, question, selectedKnowledgeCategory);
        
        // Combinar resultados para ter informação completa
        if (embeddingResults.length > 0 || keywordResults) {
          hasPersonalKnowledge = true;
          knowledgeContext = '\n📚 BASE DE CONHECIMENTO PESSOAL:\n';
          
          if (embeddingResults.length > 0) {
            embeddingResults.forEach((result, index) => {
              knowledgeContext += `[${result.title}]\n${result.content}\n\n`;
            });
          }
          
          if (keywordResults && !embeddingResults.some(r => keywordResults.includes(r.content))) {
            knowledgeContext += `${keywordResults}\n\n`;
          }
        }
      } catch (error) {
        console.error("Erro ao buscar na base de conhecimento:", error);
      }
    }

    // FASE 2: Busca na internet SOMENTE se não tiver informação suficiente
    let webContext = '';
    
    // Se não tem conhecimento pessoal OU conhecimento é muito limitado, buscar na internet
    if (!hasPersonalKnowledge || knowledgeContext.length < 200) {
      try {
        const webResults = await webSearch.search(question, 3);
        if (webResults.length > 0) {
          webContext = '\n🌐 INFORMAÇÕES DA INTERNET:\n';
          webResults.forEach((result, index) => {
            webContext += `[${result.title}]\n${result.content}\n\n`;
          });
        }
      } catch (error) {
        console.error("Erro na busca web:", error);
      }
    }

    // Customize prompt based on study profile
    const profileContext = {
      disciplined: "Você está falando com um estudante disciplinado que prefere desafios e análises profundas. Seja específico e ofereça técnicas avançadas.",
      undisciplined: "Você está falando com um estudante que precisa de motivação e técnicas práticas. Seja encorajador e sugira métodos variados e interessantes.",
      average: "Você está falando com um estudante mediano. Forneça conselhos equilibrados entre teoria e prática, simples de seguir."
    };

    const context = profileContext[studyProfile as keyof typeof profileContext] || profileContext.average;
    const subjectsList = subjects.length > 0 ? 
      `O estudante está estudando: ${subjects.map(s => `${s.name} (${s.category})`).join(', ')}.` : 
      'O estudante ainda não cadastrou matérias específicas.';

    // Adicionar contexto da meta se selecionada
    let goalContext = '';
    if (selectedGoal) {
      goalContext = `\n- OBJETIVO PRINCIPAL: ${selectedGoal.title}`;
      if (selectedGoal.description) {
        goalContext += ` - ${selectedGoal.description}`;
      }
      if (selectedGoal.targetDate) {
        const targetDate = new Date(selectedGoal.targetDate);
        goalContext += ` (Prazo: ${targetDate.toLocaleDateString('pt-BR')})`;
      }
      goalContext += '\n- IMPORTANTE: Todas as suas respostas devem ser direcionadas para ajudar com este objetivo específico.';
    }

    // FASE 3: Criar prompt robusto que FORCE o uso do conteúdo
    const robustPrompt = this.createRobustPrompt({
      question,
      studyProfile,
      context,
      subjectsList,
      goalContext,
      knowledgeContext,
      webContext,
      hasPersonalKnowledge,
      selectedGoal
    });

    let prompt = robustPrompt;

    try {
      // 🧠 SELEÇÃO INTELIGENTE DE MODELO baseado no tipo de pergunta
      let selectedModel = this.selectOptimalModel(question, knowledgeContext, webContext);
      console.log(`🎯 Modelo selecionado: ${selectedModel.name} para "${question.substring(0, 50)}..."`);

      // ⚡ OTIMIZAÇÃO AUTOMÁTICA DE CONTEXTO para evitar limite de tokens
      prompt = this.optimizePromptSize(prompt, selectedModel);

      // 🔄 FALLBACK AUTOMÁTICO: se prompt ainda muito grande, usar modelo econômico
      const estimatedTokens = Math.ceil(prompt.length / 4);
      if (estimatedTokens > 8000 && selectedModel.model !== 'deepseek/deepseek-r1') {
        console.log(`🔄 Fallback: Prompt muito grande (${estimatedTokens} tokens), mudando para DeepSeek R1`);
        selectedModel = {
          model: "deepseek/deepseek-r1",
          name: "DeepSeek R1 (Fallback)",
          temperature: 0.7,
          maxTokens: 1200,
          topP: 0.9,
          reasoning: "Fallback devido a limite de tokens"
        };
      }

      // SISTEMA DE REVISÃO AUTOMÁTICA COM ATÉ 3 ITERAÇÕES
      const maxAttempts = 3;
      let attempt = 0;
      let responseText = '';

      while (attempt < maxAttempts) {
        attempt++;
        
        const response = await openai.chat.completions.create({
          model: selectedModel.model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: selectedModel.temperature,
          max_tokens: selectedModel.maxTokens,
          top_p: selectedModel.topP,
        });

        responseText = response.choices[0]?.message?.content || '';
        
        if (!responseText || responseText.trim().length === 0) {
          responseText = "Desculpe, não consegui processar sua pergunta no momento. Tente novamente em alguns segundos.";
          break;
        }
        
        // Clean the response
        responseText = responseText.trim();

        // FASE 4: REVISÃO AUTOMÁTICA DA RESPOSTA
        const reviewResult = await this.reviewResponse(question, responseText);
        
        if (reviewResult.isComplete && reviewResult.isCoherent && reviewResult.isDidactic && reviewResult.hasGoodStructure && reviewResult.isDeepEnough) {
          // Resposta aprovada na revisão
          console.log(`✅ Resposta aprovada na tentativa ${attempt} - Qualidade verificada`);
          break;
        }
        
        if (attempt < maxAttempts) {
          // Resposta precisa ser melhorada - ajustar prompt para próxima tentativa
          console.log(`🔄 Iteração ${attempt}/${maxAttempts} - Problemas encontrados: ${reviewResult.issues.join(', ')}`);
          
          // Criar prompt melhorado baseado no feedback específico da revisão
          const improvedPrompt = `${prompt}\n\n🚨 FEEDBACK DA REVISÃO (Tentativa ${attempt}):
PROBLEMAS IDENTIFICADOS: ${reviewResult.issues.join(', ')}
SUGESTÕES: ${reviewResult.suggestions || 'Melhore a qualidade geral da resposta'}

📋 REQUISITOS OBRIGATÓRIOS para a próxima resposta:
✅ COMPLETUDE: Responda TODOS os aspectos da pergunta sem deixar lacunas
✅ DIDÁTICA: Use linguagem clara, exemplos práticos e explicações passo-a-passo
✅ ESTRUTURA: Organize com cabeçalhos (##), listas, tabelas e formatação Markdown
✅ PROFUNDIDADE: Forneça explicações detalhadas, não apenas respostas superficiais
✅ COERÊNCIA: Mantenha fluxo lógico e conexão entre as ideias
✅ RELEVÂNCIA: Foque apenas no que foi perguntado

🎯 IMPORTANTE: Esta é a tentativa ${attempt} de ${maxAttempts}. A resposta deve ser significativamente melhor que a anterior.`;
          
          // Usar o prompt melhorado na próxima tentativa com parâmetros ajustados
          const improvedResponse = await openai.chat.completions.create({
            model: selectedModel.model,
            messages: [
              {
                role: "user",
                content: improvedPrompt
              }
            ],
            temperature: Math.max(selectedModel.temperature - 0.1, 0.4), // Reduzir criatividade para foco
            max_tokens: selectedModel.maxTokens + 200, // Mais espaço para melhorias
            top_p: Math.max(selectedModel.topP - 0.05, 0.7),
          });
          
          responseText = improvedResponse.choices[0]?.message?.content || responseText;
        } else {
          console.log(`⚠️ Máximo de ${maxAttempts} tentativas atingido. Enviando melhor resposta disponível.`);
        }
      }
      
      return responseText;
    } catch (error) {
      console.error("Error in AI chat:", error);
      
      // Return a safe fallback message instead of throwing
      if (error instanceof Error && error.message.includes('quota')) {
        return "Desculpe, o limite de uso da IA foi atingido temporariamente. Tente novamente em alguns minutos.";
      }
      
      return "Houve um problema temporário com o assistente de IA. Tente fazer sua pergunta novamente.";
    }
  }

  private async reviewResponse(originalQuestion: string, response: string): Promise<{
    isComplete: boolean;
    isCoherent: boolean;
    isDidactic: boolean;
    hasGoodStructure: boolean;
    isDeepEnough: boolean;
    issues: string[];
    suggestions?: string;
  }> {
    const reviewPrompt = `Você é um revisor especializado em qualidade de respostas educacionais. Analise se a resposta está completa e coerente.

PERGUNTA ORIGINAL: ${originalQuestion}

RESPOSTA PARA REVISAR:
${response}

CRITÉRIOS DE AVALIAÇÃO:
1. COMPLETUDE: A resposta responde completamente à pergunta? Não deixa pontos importantes sem resposta?
2. COERÊNCIA: A resposta é logicamente organizada? As informações fluem de forma natural?
3. ESTRUTURA: A resposta está bem formatada com títulos, listas, exemplos e seções claras?
4. DIDÁTICA: A explicação é clara, didática e fácil de entender? Usa exemplos quando necessário?
5. RELEVÂNCIA: Todo conteúdo da resposta é diretamente relacionado à pergunta?
6. FINALIZAÇÃO: A resposta parece completa ou foi cortada abruptamente?
7. PROFUNDIDADE: A resposta tem profundidade adequada sem ser superficial?

Uma resposta deve ser APROVADA apenas se atender a TODOS esses critérios.

Responda com JSON no seguinte formato:
{
  "isComplete": true/false,
  "isCoherent": true/false,
  "isDidactic": true/false,
  "hasGoodStructure": true/false,
  "isDeepEnough": true/false,
  "issues": ["lista específica de problemas encontrados"],
  "suggestions": "sugestões detalhadas e específicas para melhorar"
}

Seja RIGOROSO na avaliação. Uma resposta só deve ser aprovada se for realmente completa, didática e bem estruturada.`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "user",
            content: reviewPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 400,
      });

      const reviewText = response.choices[0]?.message?.content || '';
      
      // Extrair JSON da resposta
      const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Se não conseguir analisar, considerar aprovado por segurança
        return {
          isComplete: true,
          isCoherent: true,
          isDidactic: true,
          hasGoodStructure: true,
          isDeepEnough: true,
          issues: [],
          suggestions: undefined
        };
      }
      
      const reviewResult = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura do resultado
      return {
        isComplete: reviewResult.isComplete || false,
        isCoherent: reviewResult.isCoherent || false,
        isDidactic: reviewResult.isDidactic || false,
        hasGoodStructure: reviewResult.hasGoodStructure || false,
        isDeepEnough: reviewResult.isDeepEnough || false,
        issues: Array.isArray(reviewResult.issues) ? reviewResult.issues : [],
        suggestions: reviewResult.suggestions || undefined
      };
      
    } catch (error) {
      console.error("Erro na revisão da resposta:", error);
      // Em caso de erro, considerar aprovado por segurança
      return {
        isComplete: true,
        isCoherent: true,
        isDidactic: true,
        hasGoodStructure: true,
        isDeepEnough: true,
        issues: [],
        suggestions: undefined
      };
    }
  }

  private createRobustPrompt(params: {
    question: string;
    studyProfile: string;
    context: string;
    subjectsList: string;
    goalContext: string;
    knowledgeContext: string;
    webContext: string;
    hasPersonalKnowledge: boolean;
    selectedGoal?: any;
  }): string {
    const { question, studyProfile, context, subjectsList, goalContext, knowledgeContext, webContext, hasPersonalKnowledge } = params;

    // Sistema inteligente: usa base de conhecimento OU busca na internet
    if (hasPersonalKnowledge && knowledgeContext.length > 200) {
      // TEM informação suficiente na base pessoal
      return `Você é um assistente de estudos expert. Responda usando as informações da base de conhecimento do estudante.

${knowledgeContext}

PERGUNTA: ${question}

FORMATO DA RESPOSTA:
- Use Markdown para formatação (títulos, listas, tabelas, negrito, etc.)
- Organize em seções claras com cabeçalhos (##)
- Use tabelas quando apropriado
- Destaque pontos importantes com **negrito**
- Use listas numeradas ou com bullet points
- Cite trechos específicos do material quando relevante

Responda de forma completa, didática e bem estruturada usando todo o conhecimento disponível.`;
    } else {
      // NÃO tem informação suficiente - informa + busca internet
      return `Você é um assistante de estudos. O estudante perguntou: ${question}

${hasPersonalKnowledge ? `## Base de Conhecimento Consultada\n${knowledgeContext}` : '## Base de Conhecimento\nNenhuma informação relevante encontrada nos documentos pessoais.'}

${webContext ? `## Informações Complementares\n${webContext}` : ''}

FORMATO DA RESPOSTA:
- Use Markdown para formatação (títulos, listas, tabelas, negrito)
- Se há informação limitada na base pessoal, informe brevemente
- Use informações da internet para complementar
- Cite fontes quando usar informações externas
- Organize com cabeçalhos e listas
- Destaque pontos importantes

Responda de forma útil, completa e bem estruturada.`;
    }
  }

  async analyzeStudyMaterial(content: string, type: string): Promise<{
    summary: string;
    keyTopics: string[];
    difficulty: string;
  }> {
    const prompt = `Analyze the following study material and provide:
1. A brief summary (2-3 sentences)
2. Key topics covered (3-5 main topics)
3. Difficulty level (easy, medium, hard)

Material Type: ${type}
Content: ${content.substring(0, 2000)}...

Respond with JSON in this format:
{
  "summary": "Brief summary here",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "difficulty": "medium"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("No response from AI");
      }
      
      // Clean JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error analyzing material:", error);
      return {
        summary: "Unable to analyze material content.",
        keyTopics: [],
        difficulty: "medium"
      };
    }
  }

  async extractTextFromFile(filePath: string): Promise<string> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Handle text files
      if (ext === '.txt' || ext === '.md') {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // Handle PDF files
      if (ext === '.pdf') {
        const { default: pdfParse } = await import('pdf-parse');
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        console.log(`📄 PDF extraído: ${data.text.length} caracteres de conteúdo`);
        return data.text || "Não foi possível extrair texto do PDF";
      }
      
      // Handle DOCX files
      if (ext === '.docx') {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        console.log(`📄 DOCX extraído: ${result.value.length} caracteres de conteúdo`);
        return result.value || "Não foi possível extrair texto do DOCX";
      }
      
      // Handle DOC files (limited support)
      if (ext === '.doc') {
        console.log('⚠️ Arquivos .DOC têm suporte limitado. Recomenda-se converter para .DOCX');
        return "Arquivos .DOC têm suporte limitado. Por favor, converta para .DOCX para melhor extração de texto.";
      }
      
      // For other file types, return error message
      return `Tipo de arquivo ${ext} não suportado. Tipos suportados: PDF, DOCX, TXT, MD.`;
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw new Error("Failed to extract text from file");
    }
  }

  /**
   * NOVO: Migra documento para o sistema RAG/Pinecone quando criado
   */
  async migrateToRAG(document: any, userId: string) {
    try {
      await ragService.addDocumentToRAG(
        document.id,
        document.title,
        document.content || '',
        userId,
        document.category || 'Geral'
      );
      console.log(`📚 Documento migrado para RAG: ${document.title}`);
    } catch (error) {
      console.error('❌ Erro ao migrar para RAG:', error);
    }
  }

  async generateFlashcards(request: FlashcardGenerationRequest): Promise<GeneratedFlashcard[]> {
    const { content, studyProfile, subject, count } = request;

    // Customize prompt based on study profile
    const profileStrategies = {
      disciplined: "Crie flashcards desafiadores que exigem compreensão profunda e aplicação de conceitos. Foque em análise e resolução de problemas.",
      undisciplined: "Crie flashcards envolventes e práticos com aplicações do mundo real. Use formatos variados para manter o interesse e motivação.",
      average: "Crie um mix equilibrado de flashcards teóricos e práticos com explicações claras para reforçar o aprendizado."
    };

    const strategy = profileStrategies[studyProfile as keyof typeof profileStrategies] || profileStrategies.average;

    const prompt = `Você é um especialista em educação criando flashcards personalizados e bem formatados em português.

${subject ? `Matéria: ${subject}` : ''}
Perfil de Estudo: ${studyProfile}
Estratégia: ${strategy}

CONTEÚDO DE ESTUDO QUE DEVE SER USADO PARA CRIAR OS FLASHCARDS:
---
${content.substring(0, 6000)}${content.length > 6000 ? '...\n[conteúdo continua]' : ''}
---

INSTRUÇÕES IMPORTANTES:
- Os flashcards DEVEM ser baseados EXCLUSIVAMENTE no conteúdo fornecido acima
- NÃO crie flashcards genéricos ou de conhecimento geral
- Extraia conceitos, definições, fatos e explicações diretamente do texto
- Se o conteúdo contém exemplos, inclua-os nos flashcards
- Identifique termos técnicos, nomes importantes, datas, processos explicados no texto

FORMATAÇÃO OBRIGATÓRIA (use Markdown):
- Use **negrito** para destacar termos importantes
- Use *itálico* para ênfase
- Use \`código\` para termos técnicos ou conceitos específicos
- Use ### para subtítulos quando apropriado
- Use listas numeradas (1. 2. 3.) ou com bullets (- ) para organizar informações
- Use > para citações ou destaques importantes
- Use tabelas quando houver dados comparativos:
  | Conceito | Definição |
  |----------|-----------|
  | Termo    | Explicação |
- Use quebras de linha duplas para separar parágrafos
- Use --- para separadores visuais quando necessário

EXEMPLOS DE FORMATAÇÃO:
**Front:** O que é **Direito Constitucional**?

**Back:** 
### Definição
O **Direito Constitucional** é o ramo do direito que estuda:

1. **Constituição** - norma fundamental do Estado
2. **Organização dos poderes** - estrutura governamental  
3. **Direitos fundamentais** - garantias dos cidadãos

> É considerado o *"direito dos direitos"* por ser hierarquicamente superior.

---
**Características principais:**
- Supremacia constitucional
- Rigidez constitucional
- Controle de constitucionalidade

Crie exatamente ${count} flashcards baseados no conteúdo fornecido. Cada flashcard deve:
1. Estar DIRETAMENTE relacionado ao conteúdo fornecido acima
2. Ser adequado para um estudante com perfil ${studyProfile}
3. Ter uma pergunta clara na frente (front) extraída do conteúdo
4. Ter uma resposta completa e educativa no verso (back) com formatação markdown
5. Estar em português
6. Usar formatação rica para melhor apresentação
7. Referenciar informações específicas do material fornecido

Responda com um objeto JSON contendo um array de flashcards no seguinte formato:
{
  "flashcards": [
    {
      "front": "Pergunta ou conceito aqui (pode usar markdown básico)",
      "back": "Resposta detalhada com **formatação markdown rica** incluindo:\\n\\n### Subtítulos\\n\\n1. Listas numeradas\\n- Bullets\\n\\n> Citações importantes\\n\\n| Tabela | Quando necessário |\\n|--------|-------------------|\\n| Item   | Descrição        |"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("No response from AI");
      }
      
      // Clean JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.flashcards || [];
    } catch (error) {
      console.error("Error generating flashcards:", error);
      throw new Error("Failed to generate flashcards: " + (error as Error).message);
    }
  }
}

export const aiService = new AIService();