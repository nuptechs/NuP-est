/**
 * Function calling: Encerrar conversa
 * Permite que o Professor IA finalize a sessão quando detectar que a conversa terminou
 */

import type { AssistantFunction } from '../types.js';

/**
 * Função para encerrar a conversa de forma inteligente
 */
export const endConversationFunction: AssistantFunction = {
  name: 'end_conversation',
  description: 'Encerra a sessão de estudo quando a conversa naturalmente chega ao fim. Use quando o aluno: (1) Se despede (tchau, até logo, falou, etc), (2) Indica que terminou ("é só isso", "já entendi", "obrigado, já é suficiente"), (3) Confirma que não tem mais dúvidas, (4) Diz que precisa sair/ir embora.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Motivo do encerramento (ex: "despedida", "dúvidas_resolvidas", "aluno_precisa_sair")',
      },
      farewell_message: {
        type: 'string',
        description: 'Mensagem curta e amigável de despedida (ex: "Bons estudos!", "Até a próxima!")',
      },
    },
    required: ['reason', 'farewell_message'],
  },
  handler: async (args, context) => {
    const { reason, farewell_message } = args;
    
    console.log(`[endConversation] Sessão ${context.sessionId} sendo encerrada. Motivo: ${reason}`);
    
    return {
      success: true,
      reason,
      message: farewell_message,
      shouldClose: true, // Sinal para o serviço fechar a conexão
    };
  },
};
