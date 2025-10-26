/**
 * Adaptive Learning System - Modular AI Pipeline
 * 
 * Export index for easy imports across the application.
 */

// Core types and interfaces
export type * from './types';

// Context builder
export { StudyContextBuilder } from './StudyContextBuilder';

// Prompt strategies
export { BasePromptStrategy } from './strategies/IPromptStrategy';
export type { IPromptStrategy } from './strategies/IPromptStrategy';
export { ExactasPromptStrategy } from './strategies/ExactasPromptStrategy';
export { HumanasPromptStrategy } from './strategies/HumanasPromptStrategy';
export { BiologicasPromptStrategy } from './strategies/BiologicasPromptStrategy';
export { GenericPromptStrategy } from './strategies/GenericPromptStrategy';

// AI Pipeline
export { AIContentPipeline } from './pipeline/AIContentPipeline';

// Tools
export { QuestionGeneratorTool } from './tools/QuestionGeneratorTool';
export type { QuestionGeneratorParams, QuestionGeneratorData } from './tools/QuestionGeneratorTool';

export { HintGeneratorTool } from './tools/HintGeneratorTool';
export type { HintGeneratorParams, HintGeneratorData } from './tools/HintGeneratorTool';

export { ExplanationGeneratorTool } from './tools/ExplanationGeneratorTool';
export type { ExplanationGeneratorParams, ExplanationGeneratorData } from './tools/ExplanationGeneratorTool';
