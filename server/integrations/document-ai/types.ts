/**
 * Google Document AI Integration Types
 */

export interface DocumentAIConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  processorId?: string;
  location?: string;
}

export interface ProcessDocumentRequest {
  filePath: string;
  mimeType: string;
}

export interface ProcessDocumentResponse {
  text: string;
  pages: number;
  confidence?: number;
}

export interface DocumentProcessingError {
  code: string;
  message: string;
  details?: any;
}
