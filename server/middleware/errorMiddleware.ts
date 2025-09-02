import { Request, Response, NextFunction } from "express";
import { AppError, errorMessages } from "../utils/ErrorHandler";

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Log do erro para debugging (sem expor detalhes ao usuário)
  console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.path}:`, {
    message: err.message,
    stack: err.stack,
    userId: (req.user as any)?.claims?.sub || 'anonymous',
    userAgent: req.get('User-Agent')
  });

  // Se é um erro customizado da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ 
      error: err.userMessage,
      timestamp: new Date().toISOString()
    });
  }

  // Tratar erros específicos do Express/Node
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: errorMessages.VALIDATION_ERROR,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ 
      error: errorMessages.AUTH_REQUIRED,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError' || err.name === 'MongoError') {
    return res.status(400).json({ 
      error: errorMessages.DATABASE_ERROR,
      timestamp: new Date().toISOString()
    });
  }

  // Erro genérico - não expor detalhes internos
  return res.status(500).json({ 
    error: errorMessages.GENERIC,
    timestamp: new Date().toISOString()
  });
}

/**
 * Wrapper para async routes - captura erros automaticamente
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}