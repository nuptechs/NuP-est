import { BaseRAGService, RAGConfig, RAGDocument, RAGQuery, RAGSearchResponse, RAGResult } from '../shared/BaseRAGService';

/**
 * RAG especializado para simulados e questões de concurso
 * Mantém banco de questões organizadas por assunto, dificuldade e origem
 */
export class SimulationRAGService extends BaseRAGService {
  constructor(pineconeAdapter?: import('../shared/MultiIndexPineconeAdapter').MultiIndexPineconeAdapter) {
    super({
      indexName: 'nup-simulations-kb',
      embeddingModel: 'text-embedding-004',
      maxResults: 20,
      minSimilarity: 0.8,
      chunkSize: 400,  // Chunks pequenos para questões específicas
      overlapSize: 50
    }, pineconeAdapter);
  }

  /**
   * Processa questões e simulados
   * Foca em questões, alternativas, gabaritos e explicações
   */
  async processDocument(document: RAGDocument): Promise<void> {
    this.validateDocument(document);
    
    const { result: processedData } = await this.measurePerformance(
      'Simulation document processing',
      async () => {
        // Chunking especializado para questões
        const chunks = this.chunkForSimulations(document.content);
        
        // Processar cada chunk
        const processedChunks = await Promise.all(
          chunks.map(async (chunk, index) => {
            const embeddings = await this.generateEmbeddings(chunk.content);
            
            return {
              id: `${document.id}_chunk_${index}`,
              values: embeddings,
              metadata: {
                userId: document.userId,
                documentId: document.id,
                chunkIndex: index,
                content: chunk.content,
                questions: chunk.questions,
                subjects: chunk.subjects,
                difficulty: chunk.difficulty,
                examType: chunk.examType,
                year: chunk.year,
                institution: chunk.institution,
                chunkType: 'simulation',
                createdAt: document.createdAt.toISOString(),
                ...document.metadata
              }
            };
          })
        );

        // Upsert no Pinecone
        await this.pineconeAdapter.upsertVectors(
          this.config.indexName,
          processedChunks
        );

        return { chunksProcessed: processedChunks.length };
      }
    );

    this.log('info', 'Simulation document processed', {
      documentId: document.id,
      chunksProcessed: processedData.chunksProcessed
    });
  }

  /**
   * Busca especializada para questões de simulado
   * Retorna questões relevantes por assunto, dificuldade e tipo
   */
  async search(query: RAGQuery): Promise<RAGSearchResponse> {
    const { result: searchResults, duration } = await this.measurePerformance(
      'Simulation search',
      async (): Promise<RAGSearchResponse> => {
        const queryEmbedding = await this.generateEmbeddings(query.query);
        
        const searchResult = await this.pineconeAdapter.query({
          indexName: this.config.indexName,
          vector: queryEmbedding,
          topK: query.maxResults || this.config.maxResults,
          filter: {
            userId: query.userId,
            chunkType: 'simulation',
            ...query.filters
          },
          includeMetadata: true
        });

        const results: RAGResult[] = searchResult.matches
          .filter((match: any) => match.score >= (query.minSimilarity || this.config.minSimilarity!))
          .map((match: any) => ({
            id: match.id,
            content: match.metadata?.content as string,
            metadata: {
              ...match.metadata,
              questions: match.metadata?.questions,
              subjects: match.metadata?.subjects,
              difficulty: match.metadata?.difficulty,
              examType: match.metadata?.examType,
              year: match.metadata?.year,
              institution: match.metadata?.institution
            },
            similarity: match.score
          }))
          // Ordenar por relevância e depois por dificuldade
          .sort((a: any, b: any) => {
            if (Math.abs(a.similarity - b.similarity) < 0.05) {
              // Se similaridade é próxima, ordenar por dificuldade
              const difficultyOrder: { [key: string]: number } = { 'easy': 1, 'medium': 2, 'hard': 3 };
              return (difficultyOrder[a.metadata.difficulty] || 2) - (difficultyOrder[b.metadata.difficulty] || 2);
            }
            return b.similarity - a.similarity;
          });

        return {
          results,
          totalFound: results.length,
          processingTime: 0, // Será sobrescrito após measurePerformance
          query: query.query
        };
      }
    );

    // Corrigir processingTime após measurePerformance
    searchResults.processingTime = duration || 0;

    this.log('info', 'Simulation search completed', {
      query: query.query,
      resultsFound: searchResults.totalFound,
      userId: query.userId
    });

    return searchResults;
  }

  /**
   * Gera simulado personalizado
   */
  async generateCustomSimulation(
    userId: string,
    criteria: {
      subjects: string[];
      difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
      questionCount: number;
      examType?: string;
      timeLimit?: number;
    }
  ): Promise<Array<{
    id: string;
    question: string;
    alternatives: string[];
    correctAnswer: string;
    explanation: string;
    subject: string;
    difficulty: string;
    source: string;
  }>> {
    const searchQueries = criteria.subjects.map(subject => 
      `questões ${subject} ${criteria.difficulty !== 'mixed' ? criteria.difficulty : ''}`
    );

    const allQuestions: any[] = [];

    // Buscar questões para cada assunto
    for (const queryText of searchQueries) {
      const searchResults = await this.search({
        query: queryText,
        userId,
        maxResults: Math.ceil(criteria.questionCount / criteria.subjects.length) + 5,
        filters: criteria.examType ? { examType: criteria.examType } : {}
      });

      allQuestions.push(...searchResults.results);
    }

    // Selecionar questões balanceadas
    const selectedQuestions = this.selectBalancedQuestions(
      allQuestions,
      criteria.questionCount,
      criteria.difficulty
    );

    this.log('info', 'Custom simulation generated', {
      userId,
      questionCount: selectedQuestions.length,
      subjects: criteria.subjects
    });

    return selectedQuestions;
  }

  /**
   * Analisa performance em simulados
   */
  async analyzeSimulationPerformance(
    userId: string,
    simulationId: string,
    answers: Array<{
      questionId: string;
      selectedAnswer: string;
      timeSpent: number;
    }>
  ): Promise<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    subjectBreakdown: Record<string, { correct: number; total: number }>;
    timeAnalysis: { totalTime: number; averagePerQuestion: number };
    recommendations: string[];
  }> {
    // Buscar questões do simulado
    const questionResults = await this.search({
      query: `simulado ${simulationId}`,
      userId,
      maxResults: answers.length * 2
    });

    const analysis = this.analyzeAnswers(questionResults.results, answers);

    this.log('info', 'Simulation performance analyzed', {
      userId,
      simulationId,
      score: analysis.score
    });

    return analysis;
  }

  /**
   * Limpeza específica para simulados
   */
  async cleanup(userId: string, olderThan?: Date): Promise<void> {
    await this.measurePerformance(
      'Simulation cleanup',
      async () => {
        const filter: any = {
          userId,
          chunkType: 'simulation'
        };

        if (olderThan) {
          filter.createdAt = { $lt: olderThan.toISOString() };
        }

        await this.pineconeAdapter.deleteByFilter(this.config.indexName, filter);
      }
    );

    this.log('info', 'Simulation cleanup completed', { userId, olderThan });
  }

  /**
   * Chunking especializado para questões de simulado
   */
  private chunkForSimulations(content: string): Array<{
    content: string;
    questions: string[];
    subjects: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    examType: string;
    year: number;
    institution: string;
  }> {
    const baseChunks = this.chunkText(content);
    
    return baseChunks.map(chunk => ({
      content: chunk,
      questions: this.extractQuestions(chunk),
      subjects: this.extractSubjects(chunk),
      difficulty: this.assessQuestionDifficulty(chunk),
      examType: this.detectExamType(chunk),
      year: this.extractYear(chunk),
      institution: this.extractInstitution(chunk)
    }));
  }

  /**
   * Extrai questões do texto
   */
  private extractQuestions(text: string): string[] {
    const questions: string[] = [];
    
    // Padrões para identificar questões
    const patterns = [
      /(\d+)\.\s*(.+?)(?=\n\d+\.|$)/g,
      /(?:QUESTÃO|Questão)\s*(\d+)[:\.]?\s*(.+?)(?=(?:QUESTÃO|Questão)|$)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && questions.length < 10) {
        const question = match[2]?.trim();
        if (question && question.length > 20) {
          questions.push(question);
        }
      }
    });

    return questions;
  }

  /**
   * Extrai assuntos/disciplinas
   */
  private extractSubjects(text: string): string[] {
    const subjects: string[] = [];
    
    // Lista de assuntos comuns em concursos
    const commonSubjects = [
      'português', 'matemática', 'direito', 'informática', 'inglês',
      'administração', 'contabilidade', 'economia', 'geografia', 'história',
      'física', 'química', 'biologia', 'estatística', 'raciocínio lógico'
    ];

    commonSubjects.forEach(subject => {
      if (new RegExp(subject, 'i').test(text)) {
        subjects.push(subject);
      }
    });

    return Array.from(new Set(subjects));
  }

  /**
   * Avalia dificuldade da questão
   */
  private assessQuestionDifficulty(text: string): 'easy' | 'medium' | 'hard' {
    let complexityScore = 0;
    
    // Indicadores de dificuldade
    if (/(?:calcule|determine|demonstre|prove)/i.test(text)) complexityScore += 2;
    if (/(?:analise|interprete|compare|avalie)/i.test(text)) complexityScore += 1;
    if (/(?:fórmula|equação|integral|derivada)/i.test(text)) complexityScore += 2;
    if (text.length > 500) complexityScore += 1;
    if ((text.match(/\d+/g) || []).length > 5) complexityScore += 1;

    if (complexityScore >= 4) return 'hard';
    if (complexityScore >= 2) return 'medium';
    return 'easy';
  }

  /**
   * Detecta tipo de exame
   */
  private detectExamType(text: string): string {
    const examTypes = [
      { pattern: /enem/i, type: 'ENEM' },
      { pattern: /vestibular/i, type: 'Vestibular' },
      { pattern: /concurso/i, type: 'Concurso Público' },
      { pattern: /oab/i, type: 'OAB' },
      { pattern: /cfc/i, type: 'CFC' }
    ];

    for (const exam of examTypes) {
      if (exam.pattern.test(text)) {
        return exam.type;
      }
    }

    return 'Geral';
  }

  /**
   * Extrai ano da prova
   */
  private extractYear(text: string): number {
    const yearMatch = text.match(/(?:20\d{2})/);
    return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  }

  /**
   * Extrai instituição organizadora
   */
  private extractInstitution(text: string): string {
    const institutions = [
      'CESPE', 'CEBRASPE', 'FCC', 'VUNESP', 'ESAF', 'FGV', 'CESGRANRIO', 'CONSULPLAN'
    ];

    for (const inst of institutions) {
      if (new RegExp(inst, 'i').test(text)) {
        return inst;
      }
    }

    return 'Não identificada';
  }

  /**
   * Seleciona questões balanceadas para simulado
   */
  private selectBalancedQuestions(questions: any[], count: number, difficulty: string): any[] {
    // Implementação simplificada - seria mais sofisticada
    const shuffled = questions.sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, count).map((q, index) => ({
      id: `q_${index + 1}`,
      question: this.extractFirstQuestion(q.content),
      alternatives: ['A) Opção A', 'B) Opção B', 'C) Opção C', 'D) Opção D'],
      correctAnswer: 'A',
      explanation: 'Explicação será implementada futuramente',
      subject: q.metadata.subjects?.[0] || 'Geral',
      difficulty: q.metadata.difficulty || 'medium',
      source: q.metadata.institution || 'Não identificada'
    }));
  }

  /**
   * Extrai primeira questão do conteúdo
   */
  private extractFirstQuestion(content: string): string {
    const match = content.match(/(.+?)(?:\n|$)/);
    return match ? match[1].trim() : content.substring(0, 200) + '...';
  }

  /**
   * Analisa respostas do usuário
   */
  private analyzeAnswers(questions: any[], answers: any[]) {
    // Implementação simplificada para demonstração
    const correctAnswers = Math.floor(answers.length * 0.7); // 70% de acertos
    const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);

    return {
      score: Math.round((correctAnswers / answers.length) * 100),
      correctAnswers,
      totalQuestions: answers.length,
      subjectBreakdown: {},
      timeAnalysis: {
        totalTime,
        averagePerQuestion: Math.round(totalTime / answers.length)
      },
      recommendations: [
        'Continue praticando questões de nível médio',
        'Foque em gerenciamento de tempo',
        'Revise os assuntos com menor performance'
      ]
    };
  }
}