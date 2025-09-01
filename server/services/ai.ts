import OpenAI from "openai";
import type { Material, Subject, Topic, Goal, KnowledgeBase } from "@shared/schema";
import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { webSearch, type WebSearchResult } from "./web-search";
import fs from "fs";
import path from "path";

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

  async chatWithAI(question: string, studyProfile: string, subjects: Subject[], selectedGoal?: any, userId?: string, selectedKnowledgeCategory?: string): Promise<string> {
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

    const prompt = robustPrompt;

    try {
      // NOVA LÓGICA DE REVISÃO AUTOMÁTICA
      const maxAttempts = 2;
      let attempt = 0;
      let responseText = '';

      while (attempt < maxAttempts) {
        attempt++;
        
        const response = await openai.chat.completions.create({
          model: "deepseek/deepseek-r1",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.9,
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
        
        if (reviewResult.isComplete && reviewResult.isCoherent) {
          // Resposta aprovada na revisão
          console.log(`Resposta aprovada na tentativa ${attempt}`);
          break;
        }
        
        if (attempt < maxAttempts) {
          // Resposta precisa ser melhorada - ajustar prompt para próxima tentativa
          console.log(`Resposta precisa ser melhorada (tentativa ${attempt}). Problemas: ${reviewResult.issues.join(', ')}`);
          
          // Melhorar o prompt baseado no feedback da revisão
          const improvedPrompt = `${prompt}\n\nIMPORTANTE: A resposta anterior teve os seguintes problemas: ${reviewResult.issues.join(', ')}. 
          Certifique-se de que sua resposta seja:
          - Completa e detalhada
          - Coerente e bem estruturada
          - Diretamente relacionada à pergunta
          - Use formatação Markdown adequada
          - Organize informações em seções claras
          ${reviewResult.suggestions ? `\n- ${reviewResult.suggestions}` : ''}`;
          
          // Usar o prompt melhorado na próxima tentativa
          const improvedResponse = await openai.chat.completions.create({
            model: "deepseek/deepseek-r1",
            messages: [
              {
                role: "user",
                content: improvedPrompt
              }
            ],
            temperature: 0.6,
            max_tokens: 1000,
            top_p: 0.85,
          });
          
          responseText = improvedResponse.choices[0]?.message?.content || responseText;
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
3. ESTRUTURA: A resposta está bem formatada com títulos, listas, etc.?
4. RELEVÂNCIA: Todo conteúdo da resposta é diretamente relacionado à pergunta?
5. FINALIZAÇÃO: A resposta parece completa ou foi cortada abruptamente?

Responda com JSON no seguinte formato:
{
  "isComplete": true/false,
  "isCoherent": true/false,
  "issues": ["lista de problemas encontrados"],
  "suggestions": "sugestões específicas para melhorar"
}`;

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
          issues: [],
          suggestions: undefined
        };
      }
      
      const reviewResult = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura do resultado
      return {
        isComplete: reviewResult.isComplete || false,
        isCoherent: reviewResult.isCoherent || false,
        issues: Array.isArray(reviewResult.issues) ? reviewResult.issues : [],
        suggestions: reviewResult.suggestions || undefined
      };
      
    } catch (error) {
      console.error("Erro na revisão da resposta:", error);
      // Em caso de erro, considerar aprovado por segurança
      return {
        isComplete: true,
        isCoherent: true,
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
      
      // For now, only handle text files
      // TODO: Add PDF, DOC, DOCX support with appropriate libraries
      if (ext === '.txt' || ext === '.md') {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // For other file types, return filename as placeholder
      // In a production app, you'd use libraries like pdf-parse, mammoth, etc.
      return `Content from file: ${path.basename(filePath)}. Please add text extraction library support for ${ext} files.`;
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw new Error("Failed to extract text from file");
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

    const prompt = `Você é um especialista em educação criando flashcards personalizados em português.

${subject ? `Matéria: ${subject}` : ''}
Perfil de Estudo: ${studyProfile}
Estratégia: ${strategy}

Conteúdo para basear os flashcards:
${content.substring(0, 3000)}...

Crie ${count} flashcards baseados no conteúdo fornecido. Cada flashcard deve:
1. Estar diretamente relacionado ao conteúdo fornecido
2. Ser adequado para um estudante com perfil ${studyProfile}
3. Ter uma pergunta clara na frente (front)
4. Ter uma resposta completa e educativa no verso (back)
5. Estar em português

Responda com um objeto JSON contendo um array de flashcards no seguinte formato:
{
  "flashcards": [
    {
      "front": "Pergunta ou conceito aqui",
      "back": "Resposta detalhada ou explicação aqui"
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