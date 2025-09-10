/**
 * 🌐 PROCESSADOR EXTERNO
 * 
 * Este arquivo conversa com o sistema externo que quebra
 * os PDFs em pedaços e coloca no Pinecone.
 */

export interface ExternalProcessResult {
  job_id: string;
  status: 'completed' | 'processing' | 'failed';
  processed_chunks: number;
  total_chunks: number;
  message?: string;
}

export class ExternalProcessorService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.EXTERNAL_PROCESSOR_URL || 'http://localhost:8000';
  }
  
  /**
   * 📤 Envia arquivo para o sistema externo processar
   */
  async processFile(file: Buffer, fileName: string, userId: string): Promise<ExternalProcessResult> {
    console.log(`🌐 Enviando ${fileName} para processamento externo...`);
    
    try {
      // TODO: Implementar envio real para sistema externo
      // Por enquanto, simula processamento
      
      const uniqueJobId = this.generateUniqueJobId(fileName, userId);
      
      console.log(`✅ Arquivo enviado com ID: ${uniqueJobId}`);
      
      return {
        job_id: uniqueJobId,
        status: 'completed',
        processed_chunks: 100,
        total_chunks: 100,
        message: 'Processamento simulado concluído'
      };
      
    } catch (error) {
      console.error('❌ Erro no processamento externo:', error);
      throw error;
    }
  }
  
  /**
   * 📊 Verifica o status de um processamento
   */
  async checkStatus(jobId: string): Promise<ExternalProcessResult> {
    console.log(`📊 Verificando status do job: ${jobId}`);
    
    try {
      // TODO: Implementar verificação real
      return {
        job_id: jobId,
        status: 'completed',
        processed_chunks: 100,
        total_chunks: 100
      };
      
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      throw error;
    }
  }
  
  /**
   * 🔑 Gera ID único para cada processamento
   * 
   * IMPORTANTE: Este é o fix principal! Cada documento
   * deve ter um ID único, não reutilizar IDs antigos.
   */
  private generateUniqueJobId(fileName: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileHash = this.simpleHash(fileName);
    
    // Formato: timestamp-userid-filehash-random
    return `${timestamp}-${userId.substring(0, 8)}-${fileHash}-${random}`;
  }
  
  /**
   * 🔨 Cria hash simples do nome do arquivo
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
  
  /**
   * ✅ Testa se o serviço externo está funcionando
   */
  async testConnection(): Promise<boolean> {
    try {
      // TODO: Implementar ping real
      console.log('✅ Serviço externo funcionando (simulado)');
      return true;
    } catch (error) {
      console.error('❌ Serviço externo indisponível:', error);
      return false;
    }
  }
}