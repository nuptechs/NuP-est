/**
 * Student Profile Engine - Sistema modular para perfis enriquecidos de alunos
 * 
 * Exporta:
 * - StudentProfileService: Orquestrador principal (interface pública)
 * - ProfileAnalyzer: Análise de métricas e evolução (uso interno)
 * - ConversationTracker: Rastreamento de conversas (uso interno)
 * - Types: Tipos TypeScript
 */

export { StudentProfileService } from './StudentProfileService.js';
export { ProfileAnalyzer } from './ProfileAnalyzer.js';
export { ConversationTracker } from './ConversationTracker.js';
export type {
  ProfileAnalysis,
  ConversationAnalysis,
  BehaviorPatterns,
  EnrichedProfile,
} from './types.js';
