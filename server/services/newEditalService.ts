import fs from 'fs';
import path from 'path';
import { fileProcessorService } from './fileProcessor';
import { deepseekService } from './deepseekService';
import { pineconeService } from './pinecone';
import { storage } from '../storage';
import type { Edital } from '@shared/schema';

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
   * Nova arquitetura: arquivo → banco → DeepSeek R1 → Pinecone → análise
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

      // 3. Extrair conteúdo do arquivo
      console.log(`📖 Extraindo conteúdo do arquivo ${fileType.toUpperCase()}...`);
      const extractedContent = await fileProcessorService.processFile(request.filePath, request.originalName);
      console.log(`✅ Conteúdo extraído: ${extractedContent.text.length} caracteres`);

      // 4. Salvar conteúdo raw no banco
      await storage.updateEdital(edital.id, {
        rawContent: extractedContent.text,
        status: 'processing'
      });

      // 5. Gerar chunks com DeepSeek R1
      console.log(`🧠 Gerando chunks inteligentes com DeepSeek R1...`);
      const chunkResponse = await deepseekService.generateIntelligentChunks({
        content: extractedContent.text,
        fileName: request.originalName,
        fileType,
        concursoNome: request.concursoNome,
        maxChunks: 15 // Reduzido para economizar tokens
      });

      console.log(`✅ DeepSeek R1 gerou ${chunkResponse.chunks.length} chunks`);

      // 6. Salvar chunks no banco
      await storage.updateEdital(edital.id, {
        deepseekChunks: chunkResponse.chunks,
        status: 'chunked'
      });

      // 7. Indexar no Pinecone
      console.log(`🔍 Indexando chunks no Pinecone...`);
      const editalId = `edital_${edital.id}`;
      
      // Converter chunks do DeepSeek para formato do Pinecone
      const pineconeChunks = chunkResponse.chunks.map(chunk => ({
        content: chunk.content,
        chunkIndex: chunk.chunkIndex
      }));

      await pineconeService.upsertDocument(
        editalId,
        pineconeChunks,
        {
          userId: request.userId,
          title: `${request.concursoNome} - ${request.originalName}`,
          category: 'edital'
        }
      );

      console.log(`✅ Chunks indexados no Pinecone`);

      // 8. Atualizar status no banco
      await storage.updateEdital(edital.id, {
        pineconeIndexed: true,
        status: 'indexed'
      });

      // 9. Analisar cargos com DeepSeek R1
      console.log(`🔍 Analisando cargos com DeepSeek R1...`);
      const cargoAnalysis = await deepseekService.analyzeCargos({
        content: extractedContent.text,
        fileName: request.originalName,
        concursoNome: request.concursoNome
      });

      console.log(`✅ Análise de cargos concluída:`, cargoAnalysis);

      // 10. Extrair conteúdo programático se for cargo único
      let conteudoProgramatico = null;
      if (cargoAnalysis.hasSingleCargo && cargoAnalysis.cargoName) {
        console.log(`📚 Extraindo conteúdo programático para: ${cargoAnalysis.cargoName}`);
        
        try {
          conteudoProgramatico = await deepseekService.extractConteudoProgramatico({
            content: extractedContent.text,
            cargoName: cargoAnalysis.cargoName,
            concursoNome: request.concursoNome
          });
          console.log(`✅ Conteúdo programático extraído: ${conteudoProgramatico.disciplinas.length} disciplinas`);
        } catch (error) {
          console.error('⚠️ Erro ao extrair conteúdo programático:', error);
          // Não falhar o processo todo por causa disso
        }
      }

      // 11. Salvar análise final no banco
      const finalEdital = await storage.updateEdital(edital.id, {
        hasSingleCargo: cargoAnalysis.hasSingleCargo,
        cargoName: cargoAnalysis.cargoName,
        cargos: cargoAnalysis.cargos || [],
        conteudoProgramatico,
        status: 'completed',
        processedAt: new Date()
      });

      console.log(`✅ Edital processado com sucesso: ${edital.id}`);

      return {
        edital: finalEdital,
        success: true,
        message: 'Edital processado com sucesso',
        details: {
          textLength: extractedContent.text.length,
          chunksGenerated: chunkResponse.chunks.length,
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
   * Busca informações de um edital processado usando Pinecone
   */
  async searchEditalContent(userId: string, editalId: string, query: string): Promise<string> {
    try {
      console.log(`🔍 Buscando no edital ${editalId}: "${query}"`);

      // Buscar no Pinecone usando o ID do edital
      const searchResults = await pineconeService.searchSimilarContent(
        query,
        userId,
        {
          topK: 5,
          category: 'edital',
          minSimilarity: 0.3
        }
      );

      if (searchResults.length === 0) {
        return 'Nenhuma informação encontrada no edital para esta consulta.';
      }

      // Criar contexto da busca
      const context = searchResults.map(result => result.content).join('\n\n');
      
      // Usar DeepSeek R1 para gerar resposta contextual
      const completion = await deepseekService['openai'].chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em editais de concursos públicos. Responda de forma clara e estruturada baseado apenas no contexto fornecido."
          },
          {
            role: "user",
            content: `
Com base no seguinte contexto do edital, responda à pergunta de forma clara e organizada.

CONTEXTO DO EDITAL:
${context}

PERGUNTA: ${query}

Responda de forma estruturada e completa, citando as informações relevantes do edital.
`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      return completion.choices[0].message.content || 'Não foi possível gerar resposta para esta consulta.';

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
      
      // Remover do Pinecone
      const pineconeId = `edital_${editalId}`;
      try {
        await pineconeService.deleteDocument(pineconeId);
        console.log(`✅ Dados removidos do Pinecone: ${pineconeId}`);
      } catch (pineconeError) {
        console.warn(`⚠️ Erro ao remover do Pinecone: ${pineconeError}`);
      }

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