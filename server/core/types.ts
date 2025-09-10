/**
 * 📋 TIPOS CENTRAIS DO SISTEMA
 * 
 * Este arquivo define todos os tipos principais que o sistema usa.
 * Pense neles como "moldes" que definem a forma dos dados.
 */

// 📄 Como um edital é representado no sistema
export interface Edital {
  id: string;
  fileName: string;
  fileType: string;
  concursoNome: string;
  status: EditalStatus;
  externalFileId?: string; // ID do sistema externo (Pinecone)
  
  // Informações extraídas
  hasSingleCargo?: boolean;
  cargoName?: string;
  cargos?: CargoInfo[];
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
}

// 📊 Estados que um edital pode ter (do início ao fim)
export type EditalStatus = 
  | 'uploaded'    // ⬆️ Arquivo foi enviado
  | 'indexing'    // 🔄 Sistema externo processando
  | 'indexed'     // ✅ Indexado no Pinecone
  | 'analyzing'   // 🤖 IA analisando conteúdo  
  | 'completed'   // ✅ Análise completa
  | 'failed';     // ❌ Erro em alguma etapa

// 👨‍💼 Informações sobre um cargo
export interface CargoInfo {
  nome: string;
  requisitos: string;
  atribuicoes: string;
  salario: string;
  vagas?: number;
}

// 📚 Conteúdo programático de uma disciplina
export interface ConteudoProgramatico {
  disciplina: string;
  topicos: string[];
}

// 🔍 Resultado da análise de um edital
export interface EditalAnalysisResult {
  cargos: CargoInfo[];
  conteudoProgramatico: ConteudoProgramatico[];
  hasMultipleCargos: boolean;
  rawResponses?: {
    cargoAnalysis: string;
    conteudoAnalysis: string;
  };
}

// 📈 Status simples para mostrar ao usuário
export interface EditalStatusInfo {
  status: EditalStatus;
  message: string;
  percentage: number;
  emoji: string;
}