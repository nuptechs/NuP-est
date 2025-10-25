import type { Material, Subject, Topic, Goal, KnowledgeBase } from "@shared/schema";
import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { webSearch, type WebSearchResult } from "./web-search";
import { ragService } from "./rag";
import { aiAnalyze, getAIManager } from "./ai/index";
import { AppError, errorMessages } from "../utils/ErrorHandler";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";

// Sistema de IA com injeção de dependência integrado

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
      // Usar o sistema de injeção de dependência para análise
      const analysisResult = await aiAnalyze<{ questions: GeneratedQuestion[] }>(
        prompt,
        `Você é um gerador de questões educacionais especializado. Analise o conteúdo e gere questões de múltipla escolha conforme especificado.`,
        {
          temperature: 0.7,
          maxTokens: 3000
        }
      );
      
      const text = JSON.stringify(analysisResult);
      
      // Clean JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AppError(503, errorMessages.AI_SERVICE_ERROR, "No valid JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.questions || [];
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new AppError(503, errorMessages.AI_SERVICE_ERROR, "Failed to generate questions: " + (error as Error).message);
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
      // Usar sistema de injeção de dependência para chat
      const aiManager = getAIManager();
      const aiResponse = await aiManager.request({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 200
      });
      
      return aiResponse.content || "Continue with your current study plan and focus on consistent practice.";
    } catch (error) {
      console.error("Error generating recommendation:", error);
      return "Keep up the good work! Focus on areas where you need more practice and maintain a consistent study schedule.";
    }
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
          category: selectedKnowledgeCategory
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
      // 🧠 Usando sistema de abstração de IA (sem lógica hardcoded de modelos)
      console.log(`🤖 Usando sistema de abstração inteligente de IA`);

      // 🔄 FALLBACK agora é handled pela camada de abstração automaticamente

      // SISTEMA DE REVISÃO AUTOMÁTICA COM ATÉ 3 ITERAÇÕES
      const maxAttempts = 3;
      let attempt = 0;
      let responseText = '';

      while (attempt < maxAttempts) {
        attempt++;
        
        // Usar sistema de abstração inteligente com contexto
        const aiManager = getAIManager();
        const aiResponse = await aiManager.request({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          maxTokens: 1200
        }, {
          question: question,
          knowledgeContext: knowledgeContext,
          webContext: webContext
        });
        
        responseText = aiResponse.content || '';
        
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
          // Usar sistema de injeção de dependência para iteração melhorada
          try {
            const aiManager = getAIManager();
            const aiResponse = await aiManager.request({
              messages: [{ role: "user", content: improvedPrompt }],
              temperature: 0.4,
              maxTokens: 1400
            });
            
            responseText = aiResponse.content || responseText;
          } catch (iterationError) {
            console.warn("Erro na iteração melhorada:", iterationError);
          }
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
      // Usar sistema de injeção de dependência para revisão
      const aiManager = getAIManager();
      const aiResponse = await aiManager.request({
        messages: [{ role: "user", content: reviewPrompt }],
        temperature: 0.3,
        maxTokens: 400
      });
      
      const reviewText = aiResponse.content || '';
      
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
      // Usar sistema de injeção de dependência para análise
      return await aiAnalyze<any>(
        prompt,
        `Você é um analisador de conteúdo educacional especializado. Analise o material e extraia informações estruturadas.`,
        {
          temperature: 0.3,
          maxTokens: 500
        }
      );
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
      throw new AppError(400, errorMessages.FILE_UPLOAD_ERROR, "Failed to extract text from file");
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
    return await this.generateFlashcardsWithRetry(request, [], 0);
  }

  private async generateFlashcardsWithRetry(
    request: FlashcardGenerationRequest, 
    existingFlashcards: GeneratedFlashcard[] = [],
    attempt: number = 0
  ): Promise<GeneratedFlashcard[]> {
    const { content, studyProfile, subject, count } = request;
    const maxAttempts = 3;
    
    if (attempt >= maxAttempts) {
      if (existingFlashcards.length < count) {
        console.log(`❌ Máximo de tentativas atingido. Conseguimos apenas ${existingFlashcards.length}/${count} flashcards únicos`);
        throw new AppError(503, errorMessages.AI_SERVICE_ERROR, `Não foi possível gerar ${count} flashcards únicos a partir do conteúdo fornecido. Conseguimos apenas ${existingFlashcards.length}. Tente com um número menor de flashcards ou forneça conteúdo mais extenso.`);
      }
      return existingFlashcards.slice(0, count); // Exatamente o número solicitado
    }

    const remainingCount = count - existingFlashcards.length;
    if (remainingCount <= 0) {
      return existingFlashcards.slice(0, count); // Exatamente o número solicitado
    }

    console.log(`🔄 Tentativa ${attempt + 1}/${maxAttempts}: Gerando ${remainingCount} flashcards restantes`);

    // Customize prompt based on study profile
    const profileStrategies = {
      disciplined: "Crie flashcards desafiadores que exigem compreensão profunda e aplicação de conceitos. Foque em análise e resolução de problemas.",
      undisciplined: "Crie flashcards envolventes e práticos com aplicações do mundo real. Use formatos variados para manter o interesse e motivação.",
      average: "Crie um mix equilibrado de flashcards teóricos e práticos com explicações claras para reforçar o aprendizado."
    };

    const strategy = profileStrategies[studyProfile as keyof typeof profileStrategies] || profileStrategies.average;

    // Construir lista de flashcards existentes para evitar duplicatas
    const existingContent = existingFlashcards.length > 0 
      ? `\n\nFLASHCARDS JÁ CRIADOS (NÃO REPITA ESTES):\n${existingFlashcards.map((fc, i) => `${i+1}. Front: "${fc.front}"`).join('\n')}\n\nCrie flashcards DIFERENTES dos listados acima.`
      : '';

    const prompt = `Você é um especialista em educação criando flashcards personalizados e bem formatados em português.

${subject ? `Matéria: ${subject}` : ''}
Perfil de Estudo: ${studyProfile}
Estratégia: ${strategy}

CONTEÚDO DE ESTUDO QUE DEVE SER USADO PARA CRIAR OS FLASHCARDS:
---
${content.substring(0, 6000)}${content.length > 6000 ? '...\n[conteúdo continua]' : ''}
---${existingContent}

INSTRUÇÕES IMPORTANTES:
- Os flashcards DEVEM ser baseados EXCLUSIVAMENTE no conteúdo fornecido acima
- NÃO crie flashcards genéricos ou de conhecimento geral
- Extraia conceitos, definições, fatos e explicações diretamente do texto
- Se o conteúdo contém exemplos, inclua-os nos flashcards
- Identifique termos técnicos, nomes importantes, datas, processos explicados no texto
- NÃO repita flashcards que já foram criados

FORMATAÇÃO OBRIGATÓRIA (use Markdown):

🎯 DESTAQUE INTELIGENTE - Use **negrito** SOMENTE para termos com alto valor educacional:
  ✅ DESTAQUE (use **negrito**):
    - Conceitos técnicos essenciais (ex: "**mens legis**", "**princípio da legalidade**")
    - Termos jurídicos/médicos específicos (ex: "**habeas corpus**", "**diabetes mellitus**")
    - Nomes de institutos legais (ex: "**usucapião**", "**litispendência**")
    - Mnemônicos e siglas importantes (ex: "**LINDB**", "**CRFB/88**")
    - Números/datas cruciais (ex: "**prazo de 15 dias**", "**artigo 5º**")
    - Processos/etapas-chave (ex: "**citação**", "**sentença**", "**recurso**")
    - Elementos de listas importantes (ex: requisitos, características, hipóteses)
    - Frases de impacto que sintetizam conceitos centrais
  
  ❌ NÃO DESTAQUE (deixe em texto normal):
    - Verbos comuns (é, está, foi, antenado, caracterizado)
    - Conectivos (com, para, pela, também, porém)
    - Artigos e preposições (o, a, de, em, por)
    - Palavras genéricas sem valor técnico (coisa, aspecto, característica)
    - Adjetivos comuns (bom, grande, importante) - a menos que façam parte de termo técnico

📝 OUTRAS FORMATAÇÕES:
- Use *itálico* para ênfase secundária ou termos estrangeiros (ex: *ratio decidendi*)
- Use \`código\` exclusivamente para fórmulas, código de programação ou notação técnica específica
- Use ### para subtítulos quando organizar tópicos complexos
- Use listas numeradas (1. 2. 3.) para sequências, requisitos, etapas
- Use bullets (- ) para características, exemplos, elementos não sequenciais
- Use > para citações textuais de lei ou doutrinas importantes
- Use tabelas para comparações, classificações, dados estruturados:
  | Conceito | Definição |
  |----------|-----------|
  | Termo    | Explicação |
- Para separar parágrafos, use quebras de linha (linhas em branco entre parágrafos)
- Use --- para separadores visuais quando necessário

⚠️ PRINCÍPIO FUNDAMENTAL: Destaque apenas o que REALMENTE ajuda na memorização e expertise. Menos é mais - excesso de negrito dilui o que é importante!

Crie exatamente ${remainingCount} flashcards únicos baseados no conteúdo fornecido. Cada flashcard deve:
1. Estar DIRETAMENTE relacionado ao conteúdo fornecido acima
2. Ser adequado para um estudante com perfil ${studyProfile}
3. Ter uma pergunta clara na frente (front) extraída do conteúdo
4. Ter uma resposta completa e educativa no verso (back) com formatação markdown
5. Estar em português
6. Usar formatação rica para melhor apresentação
7. Referenciar informações específicas do material fornecido
8. Ser DIFERENTE dos flashcards já criados

Responda com um objeto JSON contendo um array de flashcards. Exemplo de formato:
{
  "flashcards": [
    {
      "front": "Pergunta clara e objetiva",
      "back": "Resposta com **formatação markdown rica**:\\n\\n### Subtítulo\\n\\n1. Lista numerada\\n- Bullets\\n\\n> Citação\\n\\n| Col1 | Col2 |\\n|------|------|\\n| A    | B    |"
    }
  ]
}

IMPORTANTE: No formato JSON, use \\n para quebras de linha nas strings (escape correto em JSON).`;

    try {
      // Usar sistema de injeção de dependência para análise
      const result = await aiAnalyze<{ flashcards: GeneratedFlashcard[] }>(
        prompt,
        `Você é um gerador de flashcards educacionais especializado. Crie flashcards únicos de qualidade baseados no conteúdo fornecido.`,
        {
          temperature: 0.7,
          maxTokens: 8000
        }
      );
      
      let newFlashcards = result.flashcards || [];
      console.log(`✅ Gerados ${newFlashcards.length} novos flashcards na tentativa ${attempt + 1}`);
      
      // Trim se gerou mais que o necessário nesta tentativa
      if (newFlashcards.length > remainingCount) {
        newFlashcards = newFlashcards.slice(0, remainingCount);
        console.log(`✂️ Trimmed para ${newFlashcards.length} flashcards (máximo necessário)`);
      }
      
      // Deduplica baseado no front (pergunta) normalizado
      const allFlashcards = [...existingFlashcards];
      const existingFronts = new Set(existingFlashcards.map(fc => this.normalizeFlashcardFront(fc.front)));
      
      for (const newCard of newFlashcards) {
        const frontKey = this.normalizeFlashcardFront(newCard.front);
        if (!existingFronts.has(frontKey)) {
          allFlashcards.push(newCard);
          existingFronts.add(frontKey);
        } else {
          console.log(`🔄 Flashcard duplicado ignorado: "${newCard.front.substring(0, 50)}..."`);
        }
      }
      
      console.log(`🔍 Total de flashcards únicos: ${allFlashcards.length}/${count}`);
      
      // Se ainda não temos o suficiente, tentar novamente
      if (allFlashcards.length < count && attempt < maxAttempts - 1) {
        return await this.generateFlashcardsWithRetry(request, allFlashcards, attempt + 1);
      }
      
      // Retorna exatamente o número solicitado
      return allFlashcards.slice(0, count);
      
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error);
      
      // Se ainda temos tentativas, tentar novamente
      if (attempt < maxAttempts - 1) {
        return await this.generateFlashcardsWithRetry(request, existingFlashcards, attempt + 1);
      }
      
      // Se não temos mais tentativas e temos pelo menos alguns flashcards, retornar os que temos
      if (existingFlashcards.length > 0) {
        console.log(`⚠️ Retornando ${existingFlashcards.length} flashcards devido a erro na geração`);
        return existingFlashcards.slice(0, count);
      }
      
      throw new AppError(503, errorMessages.AI_SERVICE_ERROR, "Failed to generate flashcards: " + (error as Error).message);
    }
  }

  private normalizeFlashcardFront(front: string): string {
    // Remove markdown, normalize espaços e converte para lowercase para comparação
    return front
      .replace(/[*_`#>]/g, '') // Remove markdown básico
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
      .toLowerCase();
  }
}

export const aiService = new AIService();