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

      console.log(`✅ Aplicação externa processou e indexou no Pinecone com sucesso`);

      // 4. Marcar como indexado e salvar o externalFileId (pós-processamento será feito separadamente)
      await storage.updateEdital(edital.id, {
        status: 'indexed',
        externalFileId: processingResponse.job_id, // Salvar job_id para filtrar RAG depois
        processedAt: new Date()
      });
      
      console.log(`💾 ExternalFileId salvo: ${processingResponse.job_id}`);
      
      // 5. AGENDAR pós-processamento automático (não bloquear resposta)
      console.log(`📋 Agendando pós-processamento automático...`);
      setTimeout(() => {
        this.executePostProcessing(request.userId, edital!.id).catch(error => {
          console.error('❌ Erro no pós-processamento:', error);
        });
      }, 5000); // 5 segundos para garantir indexação

      // 6. Limpar arquivo local (opcional - manter ou não)
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo local removido: ${request.filePath}`);
      }

      const updatedEdital = await storage.getEdital(edital.id);
      
      return {
        success: true,
        edital: updatedEdital || edital,
        message: 'Arquivo indexado com sucesso! Análise de cargos em andamento...',
        details: {
          externalProcessingSuccess: true,
          processingMessage: 'Documento processado e indexado no Pinecone pela aplicação externa'
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
   * NOVO: Executa pós-processamento com queries específicas
   */
  private async executePostProcessing(userId: string, editalId: string): Promise<void> {
    try {
      console.log(`🔍 Iniciando pós-processamento para edital ${editalId}`);
      
      // Buscar o documentId do external processing
      const edital = await storage.getEdital(editalId);
      const documentId = edital?.externalFileId; // usar o fileId do external processing
      
      if (!documentId) {
        throw new Error('DocumentId não encontrado - arquivo pode não ter sido indexado corretamente');
      }
      
      console.log(`🎯 Usando documentId específico para RAG: ${documentId}`);
      
      // Query específica 1: Identificar cargo (APENAS deste documento)
      console.log(`🎯 Query 1: Identificando cargo do edital...`);
      const cargoQuery = "Qual é o cargo deste edital?";
      const resultadoCargos = await editalRAGService.buscarInformacaoPersonalizada(userId, cargoQuery, documentId);
      
      // Query específica 2: Conteúdo programático organizado (APENAS deste documento)
      console.log(`📚 Query 2: Organizando conteúdo programático...`);
      const conteudoQuery = "Liste de maneira organizada o conteúdo programático deste documento, separado por disciplinas e tópicos.";
      const resultadoConteudo = await editalRAGService.buscarInformacaoPersonalizada(userId, conteudoQuery, documentId);
      
      // Processar e estruturar resultados
      const cargos = this.processarResultadosPostProcessamento(resultadoCargos, resultadoConteudo);
      
      // Atualizar edital no banco
      await storage.updateEdital(editalId, {
        status: 'completed',
        hasSingleCargo: cargos.length === 1,
        cargoName: cargos.length === 1 ? cargos[0].nome : null,
        cargos: cargos,
        processedAt: new Date()
      });
      
      console.log(`✅ Pós-processamento concluído para edital ${editalId}`);
      
    } catch (error) {
      console.error(`❌ Erro no pós-processamento do edital ${editalId}:`, error);
      
      // Marcar como erro
      await storage.updateEdital(editalId, {
        status: 'failed',
        processedAt: new Date()
      });
    }
  }

  /**
   * Processa resultados das queries específicas
   */
  private processarResultadosPostProcessamento(
    cargoResult: any, 
    conteudoResult: any
  ): Array<{ nome: string; conteudoProgramatico?: string[] }> {
    const cargos = [];
    
    // Extrair cargo da resposta
    const cargoNome = this.extrairCargoDoTexto(cargoResult.resposta);
    
    // Estruturar conteúdo programático  
    const conteudoProgramatico = this.estruturarConteudoProgramatico(conteudoResult.resposta);
    
    cargos.push({
      nome: cargoNome,
      conteudoProgramatico: conteudoProgramatico
    });
    
    return cargos;
  }

  /**
   * Extrai nome do cargo do texto da IA
   */
  private extrairCargoDoTexto(texto: string): string {
    // Patterns genéricos para identificar cargo
    const patterns = [
      /cargo[:\s]+([^.\n]+)/gi,
      /auditor[^.\n]*/gi,
      /analista[^.\n]*/gi,
      /técnico[^.\n]*/gi,
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[0].trim().replace(/^(cargo[:\s]+)/gi, '');
      }
    }
    
    return 'Cargo do Concurso';
  }

  /**
   * Estrutura conteúdo programático do texto da IA
   */
  private estruturarConteudoProgramatico(texto: string): string[] {
    const linhas = texto.split('\n').filter(l => l.trim());
    const estruturado: string[] = [];
    
    linhas.forEach(linha => {
      linha = linha.trim();
      
      // Disciplinas (geralmente em negrito ou com números)
      if (linha.match(/^\d+\./) || linha.includes('**') || linha.match(/^[A-Z\s]+:/)) {
        estruturado.push(`📖 **${linha.replace(/\*\*/g, '').replace(/^\d+\./, '').trim()}**`);
      }
      // Tópicos (com - ou •)
      else if (linha.match(/^[-•]/) || linha.match(/^\s*-/)) {
        estruturado.push(`   • ${linha.replace(/^[-•\s]+/, '')}`);
      }
      // Conteúdo normal
      else if (linha.length > 5) {
        estruturado.push(`   • ${linha}`);
      }
    });
    
    return estruturado.length > 0 ? estruturado : ['📝 Conteúdo programático identificado'];
  }

  /**
   * MÉTODO ANTIGO - Mantido para compatibilidade mas não usado no novo fluxo
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
      throw error; // Propagar erro em vez de usar fallback
    }
  }

  /**
   * Extrai e estrutura informações de cargos dos resultados RAG
   */
  private extrairCargosDoRAG(resultadoCargos: any, resultadoConteudo: any): Array<{
    nome: string;
    conteudoProgramatico?: string[];
  }> {
    console.log(`📊 Analisando resultado de cargos:`, resultadoCargos);
    
    const cargos: Array<{ nome: string; conteudoProgramatico?: string[] }> = [];

    // Verificar se temos resultados estruturados da IA
    if (resultadoCargos?.cargos && Array.isArray(resultadoCargos.cargos)) {
      console.log(`✅ IA identificou ${resultadoCargos.cargos.length} cargos estruturados`);
      
      for (const cargo of resultadoCargos.cargos) {
        // Buscar conteúdo programático específico para este cargo
        const conteudoCargo = this.organizarConteudoProgramatico(resultadoConteudo, cargo.nome);
        
        cargos.push({
          nome: cargo.nome || 'Cargo não especificado',
          conteudoProgramatico: conteudoCargo
        });
      }
    }

    // Se não conseguiu identificar cargos, falhar
    if (cargos.length === 0) {
      console.error(`❌ RAG não conseguiu identificar nenhum cargo no documento`);
      throw new Error('Não foi possível identificar cargos no documento usando RAG. Verifique se o documento foi processado corretamente.');
    }

    console.log(`📋 Total de cargos processados: ${cargos.length}`);
    return cargos;
  }


  /**
   * Organiza conteúdo programático de forma estruturada
   */
  private organizarConteudoProgramatico(resultadoConteudo: any, nomeCargo: string): string[] {
    const conteudo: string[] = [];
    
    try {
      if (resultadoConteudo?.disciplinas && Array.isArray(resultadoConteudo.disciplinas)) {
        console.log(`📚 Organizando ${resultadoConteudo.disciplinas.length} disciplinas para ${nomeCargo}`);
        
        resultadoConteudo.disciplinas.forEach((disciplina: any, index: number) => {
          const nomeDisciplina = disciplina.disciplina || `Disciplina ${index + 1}`;
          conteudo.push(`📖 **${nomeDisciplina}**`);
          
          if (disciplina.topicos && Array.isArray(disciplina.topicos)) {
            disciplina.topicos.forEach((topico: string) => {
              conteudo.push(`   • ${topico}`);
            });
          }
          
          if (disciplina.detalhamento) {
            // Garantir que detalhamento seja string
            const detalhamento = typeof disciplina.detalhamento === 'string' 
              ? disciplina.detalhamento 
              : JSON.stringify(disciplina.detalhamento);
            conteudo.push(`   📋 ${detalhamento}`);
          }
          
          conteudo.push(''); // Linha em branco entre disciplinas
        });
      }
      
      // Se não há disciplinas estruturadas, falhar - SEM FALLBACK
      if (conteudo.length === 0) {
        throw new Error('Não foi possível extrair conteúdo programático estruturado do documento');
      }
      
      console.log(`✅ Conteúdo programático organizado: ${conteudo.length} itens para ${nomeCargo}`);
      
    } catch (error) {
      console.error('❌ Erro ao organizar conteúdo programático:', error);
      throw error; // Propagar erro - SEM FALLBACK
    }
    
    return conteudo;
  }

}

export const newEditalService = new NewEditalService();