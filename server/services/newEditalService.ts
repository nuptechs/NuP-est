import fs from 'fs';
import { fileProcessorService } from './fileProcessor';
import { externalProcessingService } from './externalProcessingService';
import { editalRAGService } from './editalRAG';
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
    externalProcessingSuccess: boolean;
    processingMessage?: string;
    cargoAnalysis?: {
      totalCargos: number;
      hasSingleCargo: boolean;
      cargos: Array<{
        nome: string;
        conteudoProgramatico?: string[];
      }>;
    };
  };
}

export class NewEditalService {

  /**
   * Processa um edital enviando para aplicação externa
   * Fluxo simplificado: Upload → Enviar para API externa → Aguardar resposta
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

      // 3. Enviar arquivo para aplicação externa 
      // A aplicação externa fará: processamento + chunks + embeddings + Pinecone
      console.log(`🚀 Enviando arquivo para aplicação externa (processamento completo)...`);
      
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
        // Marcar como erro e manter registro
        await storage.updateEdital(edital.id, {
          status: 'failed',
          processedAt: new Date()
        });
        
        throw new Error(processingResponse.error || 'Erro no processamento externo');
      }

      console.log(`✅ Aplicação externa processou com sucesso`);

      // 4. Analisar cargos usando RAG após indexação externa
      console.log(`🔍 Analisando cargos do edital usando RAG...`);
      const cargoAnalysis = await this.analisarCargosViaRAG(request.userId, edital.id);
      
      // 5. Atualizar edital com informações dos cargos
      await storage.updateEdital(edital.id, {
        status: 'completed',
        processedAt: new Date(),
        hasSingleCargo: cargoAnalysis.hasSingleCargo,
        cargoName: cargoAnalysis.hasSingleCargo ? cargoAnalysis.cargos[0]?.nome : null,
        cargos: cargoAnalysis.cargos
      });

      // 6. Limpar arquivo local (opcional - manter ou não)
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo local removido: ${request.filePath}`);
      }

      const updatedEdital = await storage.getEdital(edital.id);
      
      // 7. Criar mensagem dinâmica baseada na análise
      const message = cargoAnalysis.hasSingleCargo 
        ? `Edital processado com sucesso! Identificado 1 cargo: ${cargoAnalysis.cargos[0]?.nome}`
        : `Edital processado com sucesso! Identificados ${cargoAnalysis.totalCargos} cargos disponíveis`;
      
      return {
        success: true,
        edital: updatedEdital || edital,
        message,
        details: {
          externalProcessingSuccess: true,
          processingMessage: 'Documento processado, indexado e analisado via RAG',
          cargoAnalysis
        }
      };

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      
      // Limpar arquivo em caso de erro
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
      }
      
      // Atualizar status se edital foi criado
      if (edital) {
        await storage.updateEdital(edital.id, {
          status: 'failed',
          processedAt: new Date()
        });
      }
      
      return {
        success: false,
        edital: edital!,
        message: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
      };
    }
  }

  /**
   * Valida se o arquivo pode ser processado
   */
  validateFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
    // Validar extensão
    if (!fileProcessorService.isFileTypeSupported(fileName)) {
      const supportedExtensions = fileProcessorService.getSupportedExtensions().join(', ');
      return {
        valid: false,
        error: `Tipo de arquivo não suportado. Tipos aceitos: ${supportedExtensions}`
      };
    }

    // Validar tamanho (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Recupera um edital por ID
   */
  async getEdital(editalId: string): Promise<Edital | null> {
    const edital = await storage.getEdital(editalId);
    return edital || null;
  }

  /**
   * Lista editais do usuário
   */
  async listEditals(userId: string): Promise<Edital[]> {
    return await storage.getUserEditais(userId);
  }

  /**
   * Analisa cargos do edital usando RAG após indexação externa
   */
  private async analisarCargosViaRAG(userId: string, editalId: string): Promise<{
    totalCargos: number;
    hasSingleCargo: boolean;
    cargos: Array<{
      nome: string;
      conteudoProgramatico?: string[];
    }>;
  }> {
    try {
      console.log(`🔍 Iniciando análise de cargos via RAG para edital ${editalId}`);
      
      // 1. Aguardar um pouco para garantir que a indexação foi concluída
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Buscar informações sobre cargos usando RAG
      console.log(`🔍 Buscando cargos para userId: ${userId}`);
      const resultadoCargos = await editalRAGService.buscarCargos(
        userId, 
        "cargo vaga função concurso público"
      );

      // 3. Buscar conteúdo programático usando RAG  
      console.log(`📚 Buscando conteúdo programático para userId: ${userId}`);
      const resultadoConteudo = await editalRAGService.buscarConteudoProgramatico(
        userId,
        "conteúdo programático disciplina matéria conhecimento"
      );

      // 3. Processar resultados e extrair informações estruturadas
      const cargosIdentificados = this.extrairCargosDoRAG(resultadoCargos, resultadoConteudo);
      
      const totalCargos = cargosIdentificados.length;
      const hasSingleCargo = totalCargos === 1;

      console.log(`✅ Análise concluída: ${totalCargos} cargo(s) identificado(s)`);
      
      return {
        totalCargos,
        hasSingleCargo,
        cargos: cargosIdentificados
      };

    } catch (error) {
      console.error('❌ Erro na análise de cargos via RAG:', error);
      
      // Fallback: retornar estrutura básica se RAG falhar
      return {
        totalCargos: 1,
        hasSingleCargo: true,
        cargos: [{
          nome: 'Cargo identificado via processamento externo',
          conteudoProgramatico: ['Conteúdo disponível via consulta RAG']
        }]
      };
    }
  }

  /**
   * Extrai e estrutura informações de cargos dos resultados RAG
   */
  private extrairCargosDoRAG(resultadoCargos: any, resultadoConteudo: any): Array<{
    nome: string;
    conteudoProgramatico?: string[];
  }> {
    try {
      console.log(`📊 Analisando resultado de cargos:`, resultadoCargos);
      
      const cargos: Array<{ nome: string; conteudoProgramatico?: string[] }> = [];

      // Verificar se temos resultados estruturados da IA
      if (resultadoCargos?.cargos && Array.isArray(resultadoCargos.cargos)) {
        console.log(`✅ IA identificou ${resultadoCargos.cargos.length} cargos estruturados`);
        
        for (const cargo of resultadoCargos.cargos) {
          cargos.push({
            nome: cargo.nome || 'Cargo não especificado',
            conteudoProgramatico: cargo.conteudoProgramatico || this.extrairConteudoProgramatico(
              resultadoConteudo?.resumoGeral || '', 
              cargo.nome || ''
            )
          });
        }
      } else {
        // Fallback: analisar texto bruto dos resultados
        console.log(`🔄 Fazendo fallback para análise de texto bruto`);
        
        const textoCargos = resultadoCargos?.resumoGeral || resultadoCargos?.resposta || '';
        const nomesIdentificados = this.extrairNomesCargos(textoCargos);

        if (nomesIdentificados.length > 0) {
          console.log(`🎯 Identificados ${nomesIdentificados.length} cargos via regex:`, nomesIdentificados);
          
          for (const nomeCargo of nomesIdentificados) {
            cargos.push({
              nome: nomeCargo,
              conteudoProgramatico: this.extrairConteudoProgramatico(
                resultadoConteudo?.resumoGeral || '', 
                nomeCargo
              )
            });
          }
        }
      }

      // Se ainda não conseguiu identificar cargos, usar última tentativa
      if (cargos.length === 0) {
        console.log(`⚠️ Nenhum cargo identificado, usando dados básicos`);
        cargos.push({
          nome: 'Vaga/Cargo do Concurso',
          conteudoProgramatico: ['Consulte detalhes via busca RAG específica']
        });
      }

      console.log(`📋 Total de cargos processados: ${cargos.length}`);
      return cargos;

    } catch (error) {
      console.error('❌ Erro ao extrair cargos do RAG:', error);
      return [{
        nome: 'Cargo do Concurso Público',
        conteudoProgramatico: ['Informações disponíveis via consulta RAG']
      }];
    }
  }

  /**
   * Extrai nomes de cargos do texto usando regex e patterns
   */
  private extrairNomesCargos(texto: string): string[] {
    const cargos: Set<string> = new Set();
    
    // Patterns comuns para cargos em editais
    const patterns = [
      /cargo[:\s]+([^.,\n]+)/gi,
      /função[:\s]+([^.,\n]+)/gi,
      /vaga[:\s]+(para\s+)?([^.,\n]+)/gi,
      /especialidade[:\s]+([^.,\n]+)/gi,
      /auditor[^.,\n]*/gi,
      /analista[^.,\n]*/gi,
      /técnico[^.,\n]*/gi,
      /assistente[^.,\n]*/gi,
      /professor[^.,\n]*/gi,
      /procurador[^.,\n]*/gi,
      /delegado[^.,\n]*/gi,
      /escrivão[^.,\n]*/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(texto)) !== null) {
        const cargo = match[1] || match[0];
        if (cargo && cargo.trim().length > 3) {
          cargos.add(cargo.trim().replace(/[.:,;]/g, ''));
        }
      }
      pattern.lastIndex = 0; // Reset regex
    }

    return Array.from(cargos).slice(0, 10); // Limitar a 10 cargos max
  }

  /**
   * Extrai conteúdo programático relacionado a um cargo específico
   */
  private extrairConteudoProgramatico(texto: string, cargo: string): string[] {
    const disciplinas: Set<string> = new Set();
    
    // Patterns para disciplinas/matérias
    const patterns = [
      /disciplinas?[:\s]+([^.]+)/gi,
      /matérias?[:\s]+([^.]+)/gi,
      /conteúdo programático[:\s]+([^.]+)/gi,
      /conhecimentos?[:\s]+([^.]+)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(texto)) !== null) {
        const disciplina = match[1];
        if (disciplina && disciplina.trim().length > 5) {
          disciplinas.add(disciplina.trim());
        }
      }
      pattern.lastIndex = 0; // Reset regex
    }

    const result = Array.from(disciplinas).slice(0, 20); // Limitar a 20 disciplinas
    return result.length > 0 ? result : ['Consulte conteúdo programático via RAG'];
  }
}

export const newEditalService = new NewEditalService();