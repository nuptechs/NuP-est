import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Material, Subject, Topic, Goal, KnowledgeBase } from "@shared/schema";
import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { webSearch, type WebSearchResult } from "./web-search";
import fs from "fs";
import path from "path";

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
        },
      });

      const response = await result.response;
      const text = response.text();
      
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      });

      const response = await result.response;
      return response.text() || "Continue with your current study plan and focus on consistent practice.";
    } catch (error) {
      console.error("Error generating recommendation:", error);
      return "Keep up the good work! Focus on areas where you need more practice and maintain a consistent study schedule.";
    }
  }

  async chatWithAI(question: string, studyProfile: string, subjects: Subject[], selectedGoal?: any, userId?: string): Promise<string> {
    // FASE 1: Buscar na base de conhecimento pessoal
    let knowledgeContext = '';
    let hasPersonalKnowledge = false;
    
    if (userId) {
      try {
        console.log(`🔍 [DEBUG] Buscando na base de conhecimento para userId: ${userId}`);
        console.log(`🔍 [DEBUG] Pergunta: "${question}"`);
        
        // Tentar busca com embeddings primeiro
        const queryEmbedding = await embeddingsService.generateEmbedding(question);
        console.log(`🔍 [DEBUG] Embedding gerado: ${queryEmbedding.length} dimensões`);
        
        const embeddingResults = await storage.searchKnowledgeBaseWithEmbeddings(userId, queryEmbedding, 3);
        console.log(`🔍 [DEBUG] Resultados do embedding: ${embeddingResults.length} encontrados`);
        
        if (embeddingResults.length > 0) {
          hasPersonalKnowledge = true;
          knowledgeContext = '\n\n📚 CONTEÚDO DA SUA BASE PESSOAL:\n';
          embeddingResults.forEach((result, index) => {
            console.log(`🔍 [DEBUG] Resultado ${index + 1}: ${result.title} (${(result.similarity * 100).toFixed(1)}%)`);
            knowledgeContext += `• [${result.title}] (relevância: ${(result.similarity * 100).toFixed(1)}%)\n${result.content.substring(0, 500)}...\n\n`;
          });
          console.log(`✅ [DEBUG] Conhecimento pessoal encontrado com embeddings`);
        } else {
          console.log(`🔍 [DEBUG] Nenhum resultado com embeddings, tentando busca tradicional...`);
          // Fallback para busca tradicional se não houver embeddings
          const relevantContent = await storage.searchKnowledgeBase(userId, question);
          if (relevantContent) {
            hasPersonalKnowledge = true;
            knowledgeContext = `\n\n📚 CONTEÚDO DA SUA BASE PESSOAL:\n${relevantContent}\n`;
            console.log(`✅ [DEBUG] Conhecimento pessoal encontrado com busca tradicional`);
          } else {
            console.log(`❌ [DEBUG] Nenhum conteúdo encontrado na busca tradicional`);
          }
        }
      } catch (error) {
        console.error("❌ [DEBUG] Erro ao buscar na base de conhecimento:", error);
      }
    }

    // FASE 2: Determinar se precisa de informações externas
    const needsExternal = webSearch.needsExternalInfo(question, hasPersonalKnowledge);
    console.log(`🌐 [DEBUG] Precisa de informações externas: ${needsExternal}`);
    console.log(`📚 [DEBUG] Tem conhecimento pessoal: ${hasPersonalKnowledge}`);
    
    let webContext = '';
    
    if (needsExternal) {
      try {
        console.log(`🌐 [DEBUG] Buscando informações externas...`);
        const webResults = await webSearch.search(question, 2);
        if (webResults.length > 0) {
          webContext = '\n\n🌐 INFORMAÇÕES COMPLEMENTARES:\n';
          webResults.forEach((result, index) => {
            webContext += `• ${result.title}\n${result.content}\n\n`;
          });
          console.log(`✅ [DEBUG] ${webResults.length} resultados web encontrados`);
        }
      } catch (error) {
        console.error("❌ [DEBUG] Erro na busca web:", error);
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

    // FASE 3: Criar prompt inteligente baseado nas fontes disponíveis
    const sourceStrategy = hasPersonalKnowledge && webContext ? 'hybrid' : 
                          hasPersonalKnowledge ? 'personal' : 
                          webContext ? 'external' : 'general';

    const intelligentPrompt = this.createIntelligentPrompt({
      question,
      studyProfile,
      context,
      subjectsList,
      goalContext,
      knowledgeContext,
      webContext,
      sourceStrategy,
      selectedGoal
    });

    const prompt = intelligentPrompt;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7, // Mais consistente mas ainda criativo
          maxOutputTokens: 600, // Mais espaço para respostas completas
          topP: 0.9, // Melhor qualidade das respostas
          topK: 40, // Controle de diversidade
        },
      });

      const response = await result.response;
      let responseText = response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        responseText = "Desculpe, não consegui processar sua pergunta no momento. Tente novamente em alguns segundos.";
      }
      
      // Clean the response to prevent JSON parsing issues
      responseText = responseText.trim();
      
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

  private createIntelligentPrompt(params: {
    question: string;
    studyProfile: string;
    context: string;
    subjectsList: string;
    goalContext: string;
    knowledgeContext: string;
    webContext: string;
    sourceStrategy: 'hybrid' | 'personal' | 'external' | 'general';
    selectedGoal?: any;
  }): string {
    const { question, studyProfile, context, subjectsList, goalContext, knowledgeContext, webContext, sourceStrategy } = params;

    const strategiesPrompts = {
      hybrid: `Você é um assistente de estudos inteligente que combina conhecimento pessoal com informações atualizadas.

🎯 ESTRATÉGIA: Combine as informações da base pessoal do estudante com dados externos relevantes.

FONTES DISPONÍVEIS:${knowledgeContext}${webContext}

MISSÃO: 
1. Use PRIORITARIAMENTE o conteúdo da base pessoal do estudante
2. Complemente com informações externas quando necessário
3. Crie conexões inteligentes entre as fontes
4. Seja prático e actionável na resposta`,

      personal: `Você é um assistente de estudos personalizado focado no conteúdo específico do estudante.

🎯 ESTRATÉGIA: Use exclusivamente a base de conhecimento pessoal do estudante.

SUA BASE DE CONHECIMENTO:${knowledgeContext}

MISSÃO:
1. Responda BASEADO ESPECIFICAMENTE no conteúdo fornecido
2. Faça referências diretas aos documentos do estudante
3. Use exemplos e citações do material pessoal
4. Seja específico e detalhado com base no que o estudante possui`,

      external: `Você é um assistente de estudos que busca informações complementares.

🎯 ESTRATÉGIA: Forneça informações externas relevantes e atualizadas.

INFORMAÇÕES ENCONTRADAS:${webContext}

MISSÃO:
1. Use as informações externas para responder à pergunta
2. Sugira onde o estudante pode encontrar mais recursos
3. Seja atualizado e prático na abordagem
4. Complemente com conhecimento geral relevante`,

      general: `Você é um assistente de estudos universal e inteligente.

🎯 ESTRATÉGIA: Forneça orientação geral baseada em boas práticas de estudo.

MISSÃO:
1. Dê conselhos práticos e aplicáveis
2. Use técnicas de estudo comprovadas
3. Adapte a resposta ao perfil do estudante
4. Seja motivacional e construtivo`
    };

    const basePrompt = strategiesPrompts[sourceStrategy];
    
    return `${basePrompt}

CONTEXTO DO ESTUDANTE:
- Perfil: ${studyProfile}
- ${context}
- ${subjectsList}${goalContext}

PERGUNTA: ${question}

DIRETRIZES DE RESPOSTA:
✅ Linguagem natural e conversacional
✅ Máximo 4 parágrafos bem estruturados
✅ Seja específico e actionável
✅ Use exemplos práticos
✅ Mantenha tom amigável e motivador
❌ Não use markdown ou formatação especial
❌ Não seja genérico demais
❌ Não ignore o contexto do estudante

RESPONDA DIRETAMENTE:`;
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      });

      const response = await result.response;
      const text = response.text();
      
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      });

      const response = await result.response;
      const text = response.text();
      
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