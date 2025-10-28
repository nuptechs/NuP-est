/**
 * LARGE MATERIAL PROCESSOR
 * 
 * Orchestrates the entire large document processing pipeline:
 * 1. Analyzes document structure (DocumentStructureAnalyzer)
 * 2. Creates intelligent split plan (IntelligentDocumentSplitter)
 * 3. Creates job and job parts (JobQueue)
 * 4. Processes each part with semantic chunking
 * 5. Indexes chunks in RAG (Pinecone)
 * 6. Consolidates results
 */

import { documentStructureAnalyzer } from './DocumentStructureAnalyzer';
import { intelligentDocumentSplitter } from './IntelligentDocumentSplitter';
import { jobQueue } from './JobQueue';
import { TextChunker } from '../chunking/TextChunker';
import { pineconeService } from '../pinecone';
import type { DocumentMetadata } from './types';
import type { ChunkResult } from '../chunking/types';

export class LargeMaterialProcessor {
  /**
   * Initiates processing of a large document
   * Returns job ID for status tracking
   */
  async initiateProcessing(
    userId: string,
    materialId: string,
    filePath: string,
    fileName: string,
    text: string,
    metadata: DocumentMetadata
  ): Promise<string> {
    console.log(`[LargeMaterialProcessor] 🚀 Iniciando processamento de documento grande: ${fileName}`);
    console.log(`  Páginas: ${metadata.pageCount}, Tamanho: ${Math.round(metadata.fileSize / 1024)} KB`);

    try {
      // FASE 1: Análise de Estrutura
      console.log(`[LargeMaterialProcessor] 📊 FASE 1: Analisando estrutura do documento...`);
      const structure = await documentStructureAnalyzer.analyze(text, metadata);

      // FASE 2: Plano de Divisão Inteligente
      console.log(`[LargeMaterialProcessor] 🔪 FASE 2: Criando plano de divisão...`);
      const splitPlan = intelligentDocumentSplitter.createSplitPlan(structure, 250);

      // Validar plano
      if (!intelligentDocumentSplitter.validatePlan(splitPlan, structure)) {
        throw new Error('Plano de divisão inválido - cobertura incompleta do documento');
      }

      // FASE 3: Criar Job e Parts
      console.log(`[LargeMaterialProcessor] 💾 FASE 3: Criando job de processamento...`);
      const job = await jobQueue.createJob({
        userId,
        type: 'large_document_processing',
        fileName,
        filePath,
        fileSize: metadata.fileSize,
        metadata: {
          materialId,
          pageCount: metadata.pageCount,
          totalParts: splitPlan.totalParts,
          structure,
          splitPlan,
        },
      });

      // Criar parts
      await jobQueue.createJobParts(job.id, splitPlan.parts);

      console.log(`[LargeMaterialProcessor] ✅ Job ${job.id} criado com ${splitPlan.totalParts} partes`);
      console.log(`  Tempo estimado: ~${Math.round(splitPlan.estimatedProcessingTime / 60)} minutos`);

      return job.id;
    } catch (error) {
      console.error(`[LargeMaterialProcessor] ❌ Erro ao iniciar processamento:`, error);
      throw error;
    }
  }

  /**
   * Processes a single job part
   * This is called by the worker loop for each part
   */
  async processPart(
    jobId: string,
    partId: string,
    text: string
  ): Promise<void> {
    console.log(`[LargeMaterialProcessor] 🔄 Processando parte ${partId} do job ${jobId}`);

    try {
      // Get job and part info
      const job = await jobQueue.getJob(jobId);
      const parts = await jobQueue.getJobParts(jobId);
      const part = parts.find(p => p.id === partId);

      if (!job || !part) {
        throw new Error(`Job ou parte não encontrado: job=${jobId}, part=${partId}`);
      }

      // Update part status
      await jobQueue.updatePartStatus(partId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Extract text for this part
      const partText = text.substring(part.startIndex!, part.endIndex!);

      console.log(`[LargeMaterialProcessor]   📝 Texto da parte: ${partText.length} chars`);

      // CHUNKING SEMÂNTICO
      console.log(`[LargeMaterialProcessor]   🔍 Executando chunking semântico...`);
      const chunker = new TextChunker();
      const chunks = await chunker.chunk(partText, {
        profile: 'rag',
        maxChars: 1200,
      });

      console.log(`[LargeMaterialProcessor]   ✅ Gerados ${chunks.length} chunks semânticos`);

      // INDEXAÇÃO RAG (Pinecone)
      console.log(`[LargeMaterialProcessor]   📤 Indexando no Pinecone...`);
      const materialId = (job.metadata as any)?.materialId;
      if (materialId) {
        // Add part metadata to chunks
        const chunksWithPartMetadata = chunks.map((chunk: ChunkResult) => ({
          text: chunk.text,
          metadata: {
            materialId,
            jobId,
            partId,
            partNumber: part.partNumber,
            sectionTitle: part.sectionTitle,
            ...chunk.metadata,
          },
        }));

        // Index each chunk in Pinecone
        for (const chunk of chunksWithPartMetadata) {
          await pineconeService.upsertDocument(
            `${materialId}_part${part.partNumber}_${Date.now()}`,
            chunk.text,
            {
              userId: job.userId!,
              category: 'material',
              materialId,
              ...chunk.metadata,
            }
          );
        }
        
        console.log(`[LargeMaterialProcessor]   ✅ ${chunks.length} chunks indexados no Pinecone`);
      }

      // Update part as completed
      await jobQueue.updatePartStatus(partId, {
        status: 'completed',
        completedAt: new Date(),
        chunksGenerated: chunks.length,
      });

      console.log(`[LargeMaterialProcessor] ✅ Parte ${part.partNumber}/${part.totalParts} concluída`);

      // Check if all parts are completed
      await this.checkJobCompletion(jobId);
    } catch (error) {
      console.error(`[LargeMaterialProcessor] ❌ Erro ao processar parte ${partId}:`, error);

      // Update part with error
      const currentPart = (await jobQueue.getJobParts(jobId)).find(p => p.id === partId);
      await jobQueue.updatePartStatus(partId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        attempts: (currentPart?.attempts || 0) + 1,
      });

      throw error;
    }
  }

  /**
   * Checks if all parts are completed and finalizes the job
   */
  private async checkJobCompletion(jobId: string): Promise<void> {
    const parts = await jobQueue.getJobParts(jobId);
    const allCompleted = parts.every(p => p.status === 'completed');
    const anyFailed = parts.some(p => p.status === 'failed');

    if (allCompleted) {
      console.log(`[LargeMaterialProcessor] 🎉 Todas as partes do job ${jobId} concluídas!`);
      
      // Calculate total chunks
      const totalChunks = parts.reduce((sum, p) => sum + (p.chunksGenerated || 0), 0);

      // Update job as completed
      await jobQueue.updateJobStatus(jobId, {
        status: 'completed',
        completedAt: new Date(),
        result: {
          totalChunks,
          partsProcessed: parts.length,
        },
      });

      console.log(`[LargeMaterialProcessor] ✅ Job ${jobId} finalizado: ${totalChunks} chunks gerados`);
    } else if (anyFailed) {
      const failedParts = parts.filter(p => p.status === 'failed');
      console.error(`[LargeMaterialProcessor] ❌ Job ${jobId} tem ${failedParts.length} partes falhadas`);

      // Don't mark job as failed yet - allow retries
    }
  }

  /**
   * Gets current status of a processing job
   */
  async getJobStatus(jobId: string) {
    return await jobQueue.getJobStatus(jobId);
  }
}

// Singleton instance
export const largeMaterialProcessor = new LargeMaterialProcessor();
