/**
 * External Integrations Index
 * 
 * Ponto central de acesso a todas as integrações externas
 * 
 * FILOSOFIA:
 * - Cada integração é isolada em sua própria pasta
 * - Services usam essas integrações, não chamam APIs diretamente
 * - Fácil mock para testes
 * - Gaps documentados em cada client
 */

// OpenAI/OpenRouter Integration
export * from './openai';

// Google Document AI Integration
export * from './document-ai';

// Pinecone Integration
export * from './pinecone';

/**
 * Status das Integrações:
 * 
 * ✅ OpenAI/OpenRouter: Cliente base criado, pronto para migração
 * 🚧 Document AI: Estrutura criada, aguardando migração
 * 🚧 Pinecone: Estrutura criada, aguardando migração
 */
