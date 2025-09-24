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

      // 3. Tentar enviar arquivo para aplicação externa primeiro
      console.log(`🚀 Tentando enviar arquivo para aplicação externa (processamento completo)...`);
      
      let processingResponse;
      try {
        processingResponse = await externalProcessingService.processDocument({
          filePath: request.filePath,
          fileName: request.originalName,
          concursoNome: request.concursoNome,
          userId: request.userId,
          metadata: {
            editalId: edital.id,
            fileType
          }
        });
      } catch (externalError) {
        console.warn(`⚠️ Serviço externo falhou, tentando processamento local:`, externalError);
        processingResponse = { success: false, error: 'External service unavailable' };
      }

      let useLocalProcessing = false;
      let jobId = null;

      if (!processingResponse.success) {
        console.log(`🔄 Aplicação externa indisponível, usando processamento local...`);
        useLocalProcessing = true;
        
        // Processamento local: extrair texto do PDF
        try {
          const extractedContent = await fileProcessorService.processFile(request.filePath, request.fileName);
          console.log(`📄 Texto extraído localmente: ${extractedContent.text.length} caracteres`);
          
          // Gerar um ID único para o processamento local
          jobId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Salvar conteúdo extraído no banco para análise posterior
          await storage.updateEdital(edital.id, {
            status: 'chunked',
            rawContent: extractedContent.text.substring(0, 50000), // Limitar tamanho 
            externalFileId: jobId,
            processedAt: new Date()
          });
          
          console.log(`✅ Texto extraído e salvo localmente. Job ID: ${jobId}`);
          
        } catch (localError) {
          console.error(`❌ Erro no processamento local:`, localError);
          await storage.updateEdital(edital.id, {
            status: 'failed',
            errorMessage: 'Falha no processamento local do PDF',
            processedAt: new Date()
          });
          throw new Error('Não foi possível processar o PDF localmente');
        }
        
      } else {
        console.log(`✅ Aplicação externa processou com sucesso`);
        jobId = processingResponse.job_id;
        
        // 4. Marcar como indexado e salvar o externalFileId
        await storage.updateEdital(edital.id, {
          status: 'indexed',
          externalFileId: jobId,
          processedAt: new Date()
        });
      }
      
      console.log(`💾 Job ID salvo: ${jobId}`);
      
      // 5. AGENDAR pós-processamento automático (funciona para ambos os casos)
      console.log(`📋 Agendando pós-processamento automático...`);
      setTimeout(() => {
        this.executePostProcessingWithFallback(request.userId, edital!.id, useLocalProcessing).catch(error => {
          console.error('❌ Erro no pós-processamento:', error);
        });
      }, 3000); // 3 segundos

      // 6. Limpar arquivo local (opcional - manter ou não)
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
        console.log(`🗑️ Arquivo local removido: ${request.filePath}`);
      }

      const updatedEdital = await storage.getEdital(edital.id);
      
      return {
        success: true,
        edital: updatedEdital || edital,
        message: useLocalProcessing 
          ? 'Arquivo processado localmente com sucesso! Análise de cargos em andamento...'
          : 'Arquivo indexado com sucesso! Análise de cargos em andamento...',
        details: {
          externalProcessingSuccess: !useLocalProcessing,
          processingMessage: useLocalProcessing 
            ? 'Documento processado localmente (serviço externo indisponível)'
            : 'Documento processado e indexado no Pinecone pela aplicação externa'
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
   * NOVO: Executa pós-processamento com fallback local/externo
   */
  private async executePostProcessingWithFallback(userId: string, editalId: string, useLocalProcessing: boolean): Promise<void> {
    try {
      console.log(`🔍 Iniciando pós-processamento para edital ${editalId} (local: ${useLocalProcessing})`);
      
      if (useLocalProcessing) {
        // Processamento baseado no texto extraído localmente
        const edital = await storage.getEdital(editalId);
        const rawContent = edital?.rawContent;
        
        if (!rawContent) {
          throw new Error('Texto extraído não encontrado - processamento local falhou');
        }
        
        console.log(`📄 Analisando ${rawContent.length} caracteres de texto extraído`);
        
        // Análise local simples usando regex e padrões
        const analiseLocal = this.analyzeTextLocally(rawContent);
        
        // Salvar resultados
        await storage.updateEdital(editalId, {
          status: 'completed',
          hasSingleCargo: analiseLocal.hasSingleCargo,
          cargoName: analiseLocal.cargoName,
          cargos: analiseLocal.cargos,
          conteudoProgramatico: analiseLocal.conteudoProgramatico,
          processingLogs: JSON.stringify({
            method: 'local_processing',
            textLength: rawContent.length,
            processedAt: new Date().toISOString()
          }),
          processedAt: new Date()
        });
        
        console.log(`✅ Pós-processamento local concluído para edital ${editalId}`);
        
      } else {
        // Usar o método original para processamento externo
        await this.executePostProcessing(userId, editalId);
      }
      
    } catch (error) {
      console.error(`❌ Erro no pós-processamento do edital ${editalId}:`, error);
      
      await storage.updateEdital(editalId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        processedAt: new Date()
      });
    }
  }

  /**
   * Análise local de texto extraído do PDF
   */
  private analyzeTextLocally(text: string): {
    hasSingleCargo: boolean;
    cargoName: string | null;
    cargos: any[];
    conteudoProgramatico: string[];
  } {
    console.log('🔍 Iniciando análise local do texto');
    
    // Identificar cargos usando padrões comuns
    const cargoPatterns = [
      /cargo[:\s]+([^\n\.]+)/gi,
      /vaga[:\s]+([^\n\.]+)/gi,
      /função[:\s]+([^\n\.]+)/gi,
      /(auditor[^\n\.]*)/gi,
      /(analista[^\n\.]*)/gi,
      /(técnico[^\n\.]*)/gi,
      /(fiscal[^\n\.]*)/gi
    ];
    
    const cargosEncontrados = new Set<string>();
    
    for (const pattern of cargoPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const cargo = match[1] || match[0];
        if (cargo && cargo.length > 3 && cargo.length < 100) {
          cargosEncontrados.add(cargo.trim().toLowerCase());
        }
      }
    }
    
    // Identificar conhecimentos/disciplinas
    const disciplinaPatterns = [
      /conhecimento[s]?\s+específico[s]?[:\s]*([^\n]+)/gi,
      /disciplina[s]?[:\s]*([^\n]+)/gi,
      /matéria[s]?[:\s]*([^\n]+)/gi,
      /(direito[^\n]*)/gi,
      /(português[^\n]*)/gi,
      /(matemática[^\n]*)/gi,
      /(informática[^\n]*)/gi,
      /(raciocínio[^\n]*)/gi,
      /(legislação[^\n]*)/gi
    ];
    
    const disciplinasEncontradas = new Set<string>();
    
    for (const pattern of disciplinaPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const disciplina = match[1] || match[0];
        if (disciplina && disciplina.length > 3 && disciplina.length < 200) {
          disciplinasEncontradas.add(disciplina.trim());
        }
      }
    }
    
    // Estruturar resultados
    const cargosArray = Array.from(cargosEncontrados);
    const disciplinasArray = Array.from(disciplinasEncontradas);
    
    const primeiroCargo = cargosArray.length > 0 ? cargosArray[0] : 'Cargo do Concurso';
    
    const cargos = [{
      nome: primeiroCargo,
      conteudoProgramatico: disciplinasArray.map(d => `• ${d}`)
    }];
    
    console.log(`📊 Análise local concluída: ${cargosArray.length} cargos, ${disciplinasArray.length} disciplinas`);
    
    return {
      hasSingleCargo: cargosArray.length <= 1,
      cargoName: primeiroCargo,
      cargos: cargos,
      conteudoProgramatico: disciplinasArray.map(d => `📖 ${d}`)
    };
  }

  /**
   * MÉTODO ORIGINAL: Executa pós-processamento com análise estruturada (para serviço externo)
   */
  private async executePostProcessing(userId: string, editalId: string): Promise<void> {
    try {
      console.log(`🔍 Iniciando pós-processamento para edital ${editalId}`);
      
      // Buscar o documentId do external processing
      const edital = await storage.getEdital(editalId);
      const documentId = edital?.externalFileId;
      
      if (!documentId) {
        throw new Error('DocumentId não encontrado - arquivo pode não ter sido indexado corretamente');
      }
      
      console.log(`🎯 Usando documentId específico para análise: ${documentId}`);
      
      // USAR NOVO MÉTODO analyzeEdital com queries estruturadas em JSON
      const analiseCompleta = await editalRAGService.analyzeEdital(userId, documentId);
      
      // Persistir resultados estruturados + texto bruto para auditoria
      await storage.updateEdital(editalId, {
        status: 'completed',
        hasSingleCargo: !analiseCompleta.hasMultipleCargos,
        cargoName: analiseCompleta.cargos.length === 1 ? analiseCompleta.cargos[0].nome : null,
        cargos: analiseCompleta.cargos,
        conteudoProgramatico: analiseCompleta.conteudoProgramatico,
        // AUDITORIA: Salvar respostas brutas da IA para revisão manual
        processingLogs: JSON.stringify({
          rawCargoAnalysis: analiseCompleta.rawResponses.cargoAnalysis,
          rawConteudoAnalysis: analiseCompleta.rawResponses.conteudoAnalysis,
          processedAt: new Date().toISOString(),
          documentId: documentId
        }),
        processedAt: new Date()
      });
      
      console.log(`✅ Pós-processamento concluído para edital ${editalId}`);
      console.log(`📊 Resultados: ${analiseCompleta.cargos.length} cargos, ${analiseCompleta.conteudoProgramatico.length} disciplinas`);
      
    } catch (error) {
      console.error(`❌ Erro no pós-processamento do edital ${editalId}:`, error);
      
      // Marcar como erro com detalhes
      await storage.updateEdital(editalId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
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
    
    // Estruturar conhecimentos  
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
   * Estrutura conhecimentos do texto da IA
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
    
    return estruturado.length > 0 ? estruturado : ['📝 Conhecimentos identificados'];
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

      // 3. Buscar conhecimentos usando RAG  
      console.log(`📚 Buscando conhecimentos para userId: ${userId}`);
      const resultadoConteudo = await editalRAGService.buscarConhecimentos(
        userId,
        "conhecimentos"
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
        // Buscar conhecimentos específicos para este cargo
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
   * Organiza conhecimentos de forma estruturada
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
        throw new Error('Não foi possível extrair conhecimentos estruturados do documento');
      }
      
      console.log(`✅ Conhecimentos organizados: ${conteudo.length} itens para ${nomeCargo}`);
      
    } catch (error) {
      console.error('❌ Erro ao organizar conhecimentos:', error);
      throw error; // Propagar erro - SEM FALLBACK
    }
    
    return conteudo;
  }

}

export const newEditalService = new NewEditalService();