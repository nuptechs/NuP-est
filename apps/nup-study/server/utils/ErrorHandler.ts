export class AppError extends Error {
  statusCode: number;
  userMessage: string;

  constructor(statusCode: number, userMessage: string, internalMessage?: string) {
    super(internalMessage || userMessage);
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMessages = {
  GENERIC: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
  INVALID_INPUT: "Os dados fornecidos são inválidos.",
  NOT_FOUND: "O recurso solicitado não foi encontrado.",
  UNAUTHORIZED: "Você não tem permissão para acessar este recurso.",
  AI_SERVICE_ERROR: "Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.",
  DATABASE_ERROR: "Erro ao acessar banco de dados. Tente novamente mais tarde.",
  FILE_UPLOAD_ERROR: "Erro ao fazer upload do arquivo. Verifique o formato e tente novamente.",
  VALIDATION_ERROR: "Dados de entrada inválidos. Verifique os campos obrigatórios.",
  AUTH_REQUIRED: "Faça login para acessar este recurso.",
  KNOWLEDGE_BASE_ERROR: "Erro ao processar sua base de conhecimento.",
  RAG_SERVICE_ERROR: "Serviço de busca inteligente temporariamente indisponível."
};