/**
 * 📊 GERENCIADOR DE STATUS DOS EDITAIS
 * 
 * Este arquivo controla e explica o status de cada edital
 * de forma que qualquer pessoa possa entender.
 */

import { EditalStatus, EditalStatusInfo } from './types.js';

// 📋 Mapa de status com explicações em linguagem simples
export const STATUS_INFO: Record<EditalStatus, EditalStatusInfo> = {
  uploaded: {
    status: 'uploaded',
    message: 'Arquivo recebido, preparando para processar',
    percentage: 10,
    emoji: '⬆️'
  },
  indexing: {
    status: 'indexing',
    message: 'Sistema externo processando o documento',
    percentage: 30,
    emoji: '🔄'
  },
  indexed: {
    status: 'indexed',
    message: 'Documento indexado, iniciando análise',
    percentage: 60,
    emoji: '📚'
  },
  analyzing: {
    status: 'analyzing',
    message: 'IA analisando cargos e conhecimentos',
    percentage: 80,
    emoji: '🤖'
  },
  completed: {
    status: 'completed',
    message: 'Análise completa! Cargos e conhecimentos extraídos',
    percentage: 100,
    emoji: '✅'
  },
  failed: {
    status: 'failed',
    message: 'Erro no processamento, tente novamente',
    percentage: 0,
    emoji: '❌'
  }
};

/**
 * 📈 Converte status técnico em informação amigável
 */
export function getStatusInfo(status: EditalStatus): EditalStatusInfo {
  return STATUS_INFO[status];
}

/**
 * 📝 Gera mensagem de log amigável
 */
export function createStatusLog(editalId: string, status: EditalStatus, details?: string): string {
  const info = getStatusInfo(status);
  const detailsPart = details ? ` - ${details}` : '';
  return `${info.emoji} Edital ${editalId.slice(0, 8)}: ${info.message}${detailsPart}`;
}

/**
 * ⏭️ Próximo status na sequência
 */
export function getNextStatus(current: EditalStatus): EditalStatus | null {
  const sequence: EditalStatus[] = ['uploaded', 'indexing', 'indexed', 'analyzing', 'completed'];
  const currentIndex = sequence.indexOf(current);
  
  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null;
  }
  
  return sequence[currentIndex + 1];
}