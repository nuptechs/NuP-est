import type { IStorage } from '../../storage';
import type { 
  InsertPersonalizedAssistant, 
  PersonalizedAssistant,
  StudentLearningProfile,
  InsertAssistantMemory
} from '../../../shared/schema';

/**
 * Personalized Assistant Core Service
 * 
 * Manages AI teaching assistants with context-aware memory systems and
 * profile-based adaptations for personalized student support.
 */
export class PersonalizedAssistantCore {
  constructor(private storage: IStorage) {}

  /**
   * Create a new personalized assistant for a student
   */
  async createAssistant(
    userId: string,
    profileId: string,
    config: {
      name?: string;
      personality?: 'encouraging' | 'professional' | 'friendly' | 'strict';
      communicationStyle?: 'simple' | 'detailed' | 'visual' | 'step_by_step';
    } = {}
  ): Promise<PersonalizedAssistant> {
    const profile = await this.storage.getStudentProfile(profileId);
    if (!profile) {
      throw new Error('Student profile not found');
    }

    // Determine default personality and communication style from profile
    const personality = config.personality || this.determinePersonality(profile);
    const communicationStyle = config.communicationStyle || this.determineCommunicationStyle(profile);

    const assistantData: InsertPersonalizedAssistant = {
      userId,
      profileId,
      name: config.name || this.generateAssistantName(personality),
      personality,
      communicationStyle,
      shortTermMemory: {},
      longTermMemory: {},
      currentAdaptations: this.buildInitialAdaptations(profile),
      isActive: true,
      lastInteraction: new Date(),
      totalInteractions: 0,
    };

    const assistant = await this.storage.createPersonalizedAssistant(assistantData);

    // Initialize core memories from profile
    await this.initializeMemoriesFromProfile(assistant.id, userId, profile);

    return assistant;
  }

  /**
   * Get or create active assistant for user
   */
  async getOrCreateAssistant(userId: string): Promise<PersonalizedAssistant> {
    // Get active assistant
    const existing = await this.storage.getActiveAssistant(userId);
    if (existing) {
      return existing;
    }

    // Get active profile
    const profile = await this.storage.getActiveStudentProfile(userId);
    if (!profile) {
      throw new Error('No active student profile. Create profile first.');
    }

    // Create new assistant
    return await this.createAssistant(userId, profile.id);
  }

  /**
   * Update assistant context with new interaction
   */
  async updateContext(
    assistantId: string,
    interactionData: {
      userInput: string;
      assistantResponse: string;
      topic?: string;
      emotionalState?: string;
      discoveries?: any;
    }
  ): Promise<PersonalizedAssistant> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    // Deep clone short-term memory to avoid mutation of frozen objects
    const shortTermMemory = JSON.parse(JSON.stringify(assistant.shortTermMemory || {}));
    shortTermMemory.recentInteractions = shortTermMemory.recentInteractions || [];
    
    // Keep last 10 interactions in short-term memory
    shortTermMemory.recentInteractions.push({
      timestamp: new Date().toISOString(),
      userInput: interactionData.userInput,
      assistantResponse: interactionData.assistantResponse,
      topic: interactionData.topic,
      emotionalState: interactionData.emotionalState,
    });
    
    if (shortTermMemory.recentInteractions.length > 10) {
      shortTermMemory.recentInteractions = shortTermMemory.recentInteractions.slice(-10);
    }

    // Update current topic
    if (interactionData.topic) {
      shortTermMemory.currentTopic = interactionData.topic;
    }

    // Update emotional state tracking
    if (interactionData.emotionalState) {
      shortTermMemory.currentEmotionalState = interactionData.emotionalState;
    }

    // Deep clone long-term memory to avoid mutation of frozen objects
    const longTermMemory = JSON.parse(JSON.stringify(assistant.longTermMemory || {}));
    if (interactionData.discoveries) {
      longTermMemory.discoveries = longTermMemory.discoveries || [];
      longTermMemory.discoveries.push({
        timestamp: new Date().toISOString(),
        ...interactionData.discoveries,
      });
    }

    // Update assistant
    return await this.storage.updatePersonalizedAssistant(assistantId, {
      shortTermMemory,
      longTermMemory,
      lastInteraction: new Date(),
      totalInteractions: (assistant.totalInteractions || 0) + 1,
    });
  }

  /**
   * Store a specific memory for the assistant
   */
  async storeMemory(
    assistantId: string,
    userId: string,
    memory: {
      memoryType: 'fact' | 'preference' | 'pattern' | 'milestone' | 'concern';
      category: 'learning' | 'behavior' | 'progress' | 'personal';
      key: string;
      value: any;
      confidence?: number;
      importance?: number;
      isRecent?: boolean;
      source: 'observation' | 'assessment' | 'direct_input' | 'inference';
      validUntil?: Date;
    }
  ): Promise<void> {
    const memoryData: InsertAssistantMemory = {
      assistantId,
      userId,
      memoryType: memory.memoryType,
      category: memory.category,
      key: memory.key,
      value: memory.value,
      confidence: (memory.confidence ?? 0.8).toString(),
      importance: (memory.importance ?? 0.5).toString(),
      isRecent: memory.isRecent ?? true,
      source: memory.source,
      validUntil: memory.validUntil,
      timesAccessed: 0,
    };

    await this.storage.createAssistantMemory(memoryData);
  }

  /**
   * Retrieve memories by key
   */
  async getMemory(assistantId: string, key: string): Promise<any> {
    const allMemories = await this.storage.getAssistantMemory(assistantId);
    const memories = allMemories.filter((m: any) => m.key === key);
    
    if (memories.length === 0) return null;

    // Get most recent or highest confidence
    const sortedMemories = memories.sort((a: any, b: any) => {
      const confA = parseFloat(a.confidence || '0');
      const confB = parseFloat(b.confidence || '0');
      return confB - confA;
    });

    // Update access tracking
    const memory = sortedMemories[0];
    await this.storage.updateAssistantMemory(memory.id, {
      timesAccessed: (memory.timesAccessed || 0) + 1,
      lastAccessed: new Date(),
    });

    return memory.value;
  }

  /**
   * Get recent memories for context
   */
  async getRecentMemories(
    assistantId: string,
    limit: number = 20
  ): Promise<any[]> {
    const allMemories = await this.storage.getAssistantMemory(assistantId);
    
    return allMemories
      .filter((m: any) => m.isRecent)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Build conversation context for AI
   */
  async buildConversationContext(assistantId: string): Promise<{
    systemPrompt: string;
    recentContext: string;
    memories: any[];
    adaptations: any;
  }> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    const profile = await this.storage.getStudentProfile(assistant.profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Build system prompt with personality and adaptations
    const systemPrompt = this.buildSystemPrompt(assistant, profile);

    // Get recent interaction context
    const shortTermMemory = (assistant.shortTermMemory as any) || {};
    const recentInteractions = shortTermMemory.recentInteractions || [];
    const recentContext = this.formatRecentContext(recentInteractions);

    // Get relevant memories
    const memories = await this.getRecentMemories(assistantId, 10);

    return {
      systemPrompt,
      recentContext,
      memories,
      adaptations: assistant.currentAdaptations,
    };
  }

  /**
   * Refresh assistant adaptations based on updated profile
   */
  async refreshAdaptations(assistantId: string): Promise<PersonalizedAssistant> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    const profile = await this.storage.getStudentProfile(assistant.profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Rebuild adaptations from updated profile
    const currentAdaptations = this.buildInitialAdaptations(profile);

    return await this.storage.updatePersonalizedAssistant(assistantId, {
      currentAdaptations,
      profileId: profile.id, // Update to latest active profile if changed
    });
  }

  /**
   * Determine personality from profile
   */
  private determinePersonality(profile: StudentLearningProfile): 'encouraging' | 'professional' | 'friendly' | 'strict' {
    const motivationLevel = parseFloat(profile.motivationLevel || '0.5');
    
    if (profile.needsEncouragement || motivationLevel < 0.4) {
      return 'encouraging';
    }
    
    if (profile.prefersStructuredPlan) {
      return 'professional';
    }
    
    if (profile.respondsToGamification) {
      return 'friendly';
    }
    
    return 'professional';
  }

  /**
   * Determine communication style from profile
   */
  private determineCommunicationStyle(
    profile: StudentLearningProfile
  ): 'simple' | 'detailed' | 'visual' | 'step_by_step' {
    const weaknesses = (profile.weaknesses as any) || {};
    
    // Check learning difficulties for hints
    if (weaknesses.comprehension_issues) {
      return 'simple';
    }
    
    if (profile.preferredContentTypes?.includes('visual')) {
      return 'visual';
    }
    
    if (profile.prefersStructuredPlan) {
      return 'step_by_step';
    }
    
    return 'detailed';
  }

  /**
   * Generate assistant name based on personality
   */
  private generateAssistantName(personality: string): string {
    const names = {
      encouraging: ['Professor Motivador', 'Tutor Encorajador', 'Mestre Inspirador'],
      professional: ['Professor Acadêmico', 'Tutor Profissional', 'Mestre Técnico'],
      friendly: ['Professor Amigável', 'Tutor Companheiro', 'Mestre Parceiro'],
      strict: ['Professor Rigoroso', 'Tutor Disciplinado', 'Mestre Exigente'],
    };
    
    const options = names[personality as keyof typeof names] || names.professional;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Build initial adaptations from profile
   */
  private buildInitialAdaptations(profile: StudentLearningProfile): any {
    const adaptations: any = {
      // Learning pace adaptation
      contentPacing: this.determineContentPacing(profile),
      
      // Difficulty adaptation
      questionDifficulty: this.determineQuestionDifficulty(profile),
      
      // Study duration
      sessionDuration: profile.optimalStudyDuration || 45,
      
      // Content preferences
      preferredFormats: profile.preferredContentTypes || [],
      
      // Motivational adaptations
      encouragementFrequency: profile.needsEncouragement ? 'high' : 'moderate',
      gamificationEnabled: profile.respondsToGamification,
      
      // Structure preferences
      needsStructure: profile.prefersStructuredPlan,
      
      // Profile-specific notes
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
    };

    return adaptations;
  }

  /**
   * Determine content pacing from profile
   */
  private determineContentPacing(profile: StudentLearningProfile): string {
    const strengths = (profile.strengths as any) || {};
    
    if (strengths.quick_learner || strengths.fast_comprehension) {
      return 'accelerated';
    }
    
    if (strengths.steady_progress) {
      return 'moderate';
    }
    
    return 'gentle';
  }

  /**
   * Determine question difficulty from profile
   */
  private determineQuestionDifficulty(profile: StudentLearningProfile): string {
    const motivationLevel = parseFloat(profile.motivationLevel || '0.5');
    
    if (motivationLevel > 0.7) {
      return 'progressive'; // Start medium, increase difficulty
    }
    
    if (motivationLevel < 0.4) {
      return 'confidence_building'; // Start easy, build confidence
    }
    
    return 'adaptive'; // Adjust based on performance
  }

  /**
   * Initialize memories from profile
   */
  private async initializeMemoriesFromProfile(
    assistantId: string,
    userId: string,
    profile: StudentLearningProfile
  ): Promise<void> {
    // Store primary goal
    await this.storeMemory(assistantId, userId, {
      memoryType: 'fact',
      category: 'learning',
      key: 'primary_goal',
      value: profile.primaryGoal,
      confidence: 1.0,
      importance: 1.0,
      source: 'assessment',
    });

    // Store motivation level
    await this.storeMemory(assistantId, userId, {
      memoryType: 'pattern',
      category: 'behavior',
      key: 'motivation_level',
      value: profile.motivationLevel,
      confidence: parseFloat(profile.confidenceScore || '0.7'),
      importance: 0.9,
      source: 'assessment',
    });

    // Store preferences
    if (profile.preferredContentTypes && profile.preferredContentTypes.length > 0) {
      await this.storeMemory(assistantId, userId, {
        memoryType: 'preference',
        category: 'learning',
        key: 'content_preferences',
        value: profile.preferredContentTypes,
        confidence: 0.8,
        importance: 0.7,
        source: 'assessment',
      });
    }
  }

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(
    assistant: PersonalizedAssistant,
    profile: StudentLearningProfile
  ): string {
    const personalityPrompts = {
      encouraging: 'Você é um professor encorajador e motivador. Use linguagem positiva, celebre pequenas vitórias e mantenha o estudante confiante.',
      professional: 'Você é um professor profissional e acadêmico. Mantenha um tom respeitoso, claro e objetivo.',
      friendly: 'Você é um professor amigável e acessível. Use uma abordagem descontraída mas educativa, como um amigo mais experiente.',
      strict: 'Você é um professor rigoroso mas justo. Mantenha altos padrões e seja direto nas correções.',
    };

    const stylePrompts = {
      simple: 'Use linguagem simples e direta. Evite jargões e explique conceitos de forma clara.',
      detailed: 'Forneça explicações detalhadas e completas. Use exemplos e aprofunde os conceitos.',
      visual: 'Sempre que possível, use analogias visuais e descreva diagramas mentais.',
      step_by_step: 'Quebre explicações em passos numerados e sequenciais. Sempre estruture o conteúdo.',
    };

    const personalityKey = assistant.personality as keyof typeof personalityPrompts;
    const styleKey = assistant.communicationStyle as keyof typeof stylePrompts;
    
    let prompt = `${personalityPrompts[personalityKey]}

${stylePrompts[styleKey]}

PERFIL DO ESTUDANTE:
- Objetivo: ${profile.primaryGoal}
- Nível de motivação: ${profile.motivationLevel}
- Precisa de encorajamento: ${profile.needsEncouragement ? 'Sim' : 'Não'}
- Responde a gamificação: ${profile.respondsToGamification ? 'Sim' : 'Não'}
- Prefere plano estruturado: ${profile.prefersStructuredPlan ? 'Sim' : 'Não'}
- Duração ideal de estudo: ${profile.optimalStudyDuration || 45} minutos
`;

    // Add strengths
    const strengths = (profile.strengths as any) || {};
    if (Object.keys(strengths).length > 0) {
      prompt += '\nPONTOS FORTES:\n';
      for (const [key, value] of Object.entries(strengths)) {
        prompt += `- ${key}: ${value}\n`;
      }
    }

    // Add weaknesses
    const weaknesses = (profile.weaknesses as any) || {};
    if (Object.keys(weaknesses).length > 0) {
      prompt += '\nÁREAS DE DESENVOLVIMENTO:\n';
      for (const [key, value] of Object.entries(weaknesses)) {
        prompt += `- ${key}: ${value}\n`;
      }
    }

    prompt += '\nADAPTE seu ensino considerando essas características. Seja natural e humano nas interações.';

    return prompt;
  }

  /**
   * Format recent interactions for context
   */
  private formatRecentContext(interactions: any[]): string {
    if (interactions.length === 0) {
      return 'Nenhuma interação recente.';
    }

    return interactions
      .map(i => `Estudante: ${i.userInput}\nVocê: ${i.assistantResponse}`)
      .join('\n\n');
  }
}
