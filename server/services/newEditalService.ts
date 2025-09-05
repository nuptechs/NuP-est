import fs from 'fs';
import path from 'path';
import { fileProcessorService } from './fileProcessor';
import { externalProcessingService } from './externalProcessingService';
import { storage } from '../storage';
import type { Edital } from '@shared/schema';

// Type definitions for DeepSeek chunks
interface DeepSeekChunk {
  id: string;
  content: string;
  title: string;
  summary: string;
  keywords: string[];
  chunkIndex: number;
}

interface ProcessEditalRequest {
  userId: string;
  filePath: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  concursoNome: string;
}

interface ProcessedEditalResult {
  edital: Edital;
  success: boolean;
  message: string;
  details?: {
    textLength: number;
    chunksGenerated: number;
    pineconeIndexed: boolean;
    cargoAnalysis: any;
    conteudoProgramatico?: any;
  };
}

export class NewEditalService {

  /**
   * Processa um edital completamente de forma síncrona
   * Nova arquitetura: arquivo → banco → aplicação externa → análise
   */
  async processEdital(request: ProcessEditalRequest): Promise<ProcessedEditalResult> {
    let edital: Edital | null = null;
    
    try {
      console.log(`📄 Iniciando processamento de edital: ${request.originalName}`);
      
      // 1. Detectar tipo de arquivo
      const fileType = fileProcessorService.detectFileType(request.originalName);
      if (fileType === 'unknown') {
        throw new Error(`Tipo de arquivo não suportado: ${request.originalName}`);
      }

      if (!fileProcessorService.isFileTypeSupported(request.originalName)) {
        throw new Error(`Arquivo ${fileType.toUpperCase()} não é suportado`);
      }

      // 2. Criar registro inicial no banco
      console.log(`💾 Salvando edital no banco de dados...`);
      edital = await storage.createEdital({
        userId: request.userId,
        fileName: request.fileName,
        originalName: request.originalName,
        filePath: request.filePath,
        fileSize: request.fileSize,
        fileType,
        concursoNome: request.concursoNome,
        status: 'processing'
      });

      // 3. Enviar arquivo para aplicação externa de processamento
      console.log(`🚀 Enviando arquivo para aplicação externa de processamento...`);
      
      const processingResponse = await externalProcessingService.processDocument({
        filePath: request.filePath,
        fileName: request.originalName,
        concursoNome: request.concursoNome,
        userId: request.userId,
        metadata: {
          editalId: edital.id,
          fileType
        }
      });

      if (!processingResponse.success) {
        throw new Error(processingResponse.error || 'Erro no processamento externo');
      }

      console.log(`✅ Processamento externo concluído com sucesso`);

      // 4. Salvar resultados do processamento externo
      let textLength = 0;
      let chunksGenerated = 0;
      let cargoAnalysis: any = null;
      let conteudoProgramatico: any = null;

      if (processingResponse.job_id) {
        // Processamento assíncrono iniciado
        console.log(`⏳ Processamento assíncrono iniciado. Job ID: ${processingResponse.job_id}`);
        
        const finalStatus = await externalProcessingService.waitForCompletion(processingResponse.job_id);
        
        if (finalStatus.status === 'completed') {
          // Obter resultados finais
          const results = await externalProcessingService.getResults(processingResponse.job_id);
          if (results.success && results.results) {
            // Converter os resultados para o formato esperado pelo banco
            const chunks = results.results.text_chunks.map((chunk: string, index: number) => ({
              id: `chunk_${index}`,
              content: chunk,
              title: `Chunk ${index + 1}`,
              summary: chunk.substring(0, 100) + '...',
              keywords: [],
              chunkIndex: index
            }));
            
            chunksGenerated = chunks.length;
            textLength = chunks.reduce((total: number, chunk: any) => total + chunk.content.length, 0);
            
            await storage.updateEdital(edital.id, {
              deepseekChunks: chunks,
              pineconeIndexed: true,
              status: 'completed'
            });
          }
        } else {
          throw new Error(finalStatus.error || 'Processamento externo falhou');
        }
        
        console.log(`📊 Chunks recebidos: ${chunksGenerated}`);
        console.log(`📝 Texto estimado: ${textLength} caracteres`);
      } else {
        // Processamento básico sem chunks específicos
        await storage.updateEdital(edital.id, {
          status: 'completed'
        });
      }

      // 5. Salvar análise final no banco (se disponível)
      if (cargoAnalysis) {
        await storage.updateEdital(edital.id, {
          hasSingleCargo: cargoAnalysis.hasSingleCargo,
          cargoName: cargoAnalysis.cargoName,
          cargos: cargoAnalysis.cargos || [],
          conteudoProgramatico,
          status: 'completed',
          processedAt: new Date()
        });
      }

      const finalEdital = await storage.getEdital(edital.id);
      if (!finalEdital) {
        throw new Error('Erro ao recuperar edital processado');
      }

      console.log(`✅ Edital processado com sucesso: ${edital.id}`);

      return {
        edital: finalEdital,
        success: true,
        message: 'Edital processado com sucesso',
        details: {
          textLength,
          chunksGenerated,
          pineconeIndexed: true,
          cargoAnalysis,
          conteudoProgramatico
        }
      };

    } catch (error) {
      console.error(`❌ Erro ao processar edital ${request.originalName}:`, error);
      
      // Atualizar status de erro no banco se temos o edital
      if (edital) {
        await storage.updateEdital(edital.id, {
          status: 'failed',
          errorMessage: (error as Error).message
        });
      }

      return {
        edital: edital!,
        success: false,
        message: `Falha no processamento: ${(error as Error).message}`,
      };
    } finally {
      // Limpar arquivo temporário
      if (fs.existsSync(request.filePath)) {
        try {
          fs.unlinkSync(request.filePath);
          console.log(`🗑️ Arquivo temporário removido: ${request.filePath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Erro ao limpar arquivo temporário: ${cleanupError}`);
        }
      }
    }
  }

  /**
   * Busca informações de um edital processado usando dados armazenados
   */
  async searchEditalContent(userId: string, editalId: string, query: string): Promise<string> {
    try {
      console.log(`🔍 Buscando no edital ${editalId}: "${query}"`);

      // Buscar edital no banco de dados
      const edital = await storage.getEdital(editalId);
      if (!edital || !edital.deepseekChunks) {
        return 'Edital não encontrado ou não processado.';
      }

      // Filtrar chunks relevantes por similaridade simples de texto
      const chunks = (edital.deepseekChunks as DeepSeekChunk[]) || [];
      const relevantChunks = chunks.filter((chunk: DeepSeekChunk) => {
        const queryLower = query.toLowerCase();
        const contentLower = chunk.content.toLowerCase();
        const titleLower = chunk.title?.toLowerCase() || '';
        const summaryLower = chunk.summary?.toLowerCase() || '';
        
        return contentLower.includes(queryLower) || 
               titleLower.includes(queryLower) || 
               summaryLower.includes(queryLower) ||
               (chunk.keywords && chunk.keywords.some((keyword: string) => 
                 keyword.toLowerCase().includes(queryLower)
               ));
      });

      if (relevantChunks.length === 0) {
        return 'Nenhuma informação encontrada no edital para esta consulta.';
      }

      // Criar resposta baseada nos chunks relevantes
      const context = relevantChunks
        .slice(0, 3) // Limitar a 3 chunks mais relevantes
        .map((chunk: DeepSeekChunk) => `${chunk.title || 'Seção'}: ${chunk.content}`)
        .join('\n\n');

      return `Informações encontradas no edital:\n\n${context}`;

    } catch (error) {
      console.error('❌ Erro ao buscar conteúdo do edital:', error);
      throw new Error(`Falha na busca: ${(error as Error).message}`);
    }
  }

  /**
   * Lista editais de um usuário
   */
  async getUserEditais(userId: string, status?: string): Promise<Edital[]> {
    return await storage.getUserEditais(userId, status);
  }

  /**
   * Obtém um edital específico
   */
  async getEdital(editalId: string): Promise<Edital | undefined> {
    return await storage.getEdital(editalId);
  }

  /**
   * Remove um edital e seus dados associados
   */
  async deleteEdital(editalId: string): Promise<void> {
    try {
      console.log(`🗑️ Removendo edital: ${editalId}`);
      
      // Remover do banco
      await storage.deleteEdital(editalId);
      console.log(`✅ Edital removido do banco: ${editalId}`);

    } catch (error) {
      console.error(`❌ Erro ao remover edital ${editalId}:`, error);
      throw new Error(`Falha na remoção: ${(error as Error).message}`);
    }
  }

  /**
   * Valida se um arquivo pode ser processado
   */
  validateFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
    // Verificar tipo de arquivo
    if (!fileProcessorService.isFileTypeSupported(fileName)) {
      const supportedTypes = fileProcessorService.getSupportedExtensions().join(', ');
      return {
        valid: false,
        error: `Tipo de arquivo não suportado. Tipos aceitos: ${supportedTypes}`
      };
    }

    // Verificar tamanho (50MB máximo)
    if (!fileProcessorService.validateFileSize(fileSize, 50)) {
      return {
        valid: false,
        error: 'Arquivo muito grande. Tamanho máximo: 50MB'
      };
    }

    return { valid: true };
  }

  /**
   * Obtém informações sobre tipos de arquivo suportados
   */
  getSupportedFileTypes() {
    return fileProcessorService.getSupportedFileTypes();
  }
}

export const newEditalService = new NewEditalService();