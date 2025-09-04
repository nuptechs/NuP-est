import fs from 'fs';
import path from 'path';
import { pineconeService } from './pinecone';
import { ragService } from './rag';
import { pdfService } from './pdf';

// Namespace específico para editais
const EDITAIS_NAMESPACE = 'editais-cebraspe';

interface EditalInfo {
  id: string;
  concursoNome: string;
  fileName: string;
  filePath: string;
  processedAt: Date;
  hasSingleCargo?: boolean;
  cargoName?: string;
  conteudoProgramatico?: ConteudoProgramatico;
}

interface ConteudoProgramatico {
  cargo: string;
  disciplinas: Disciplina[];
}

interface Disciplina {
  nome: string;
  topicos: string[];
}

class EditalProcessingService {
  
  /**
   * Processa PDF do edital e extrai informações
   */
  async processarEdital(
    concursoNome: string,
    filePath: string,
    fileName: string
  ): Promise<EditalInfo> {
    console.log(`📄 Processando edital: ${fileName} para concurso ${concursoNome}`);
    
    try {
      // 1. Extrair texto do PDF
      let pdfText = await this.extrairTextoPDF(filePath);
      console.log(`✅ Texto extraído do PDF (${pdfText.length} caracteres)`);
      
      // Truncar texto agressivamente para prevenir estouro de memória
      if (pdfText.length > 20000) { // 20KB - muito mais conservativo
        console.log(`⚠️ Texto muito grande (${pdfText.length} chars), truncando para 20KB`);
        pdfText = pdfText.substring(0, 20000);
        
        // Força garbage collection se disponível
        if (global.gc) {
          global.gc();
          console.log('🧹 Garbage collection forçado após truncar texto');
        }
      }
      
      // 2. Criar chunks do conteúdo
      const chunks = this.criarChunks(pdfText);
      console.log(`📋 Criados ${chunks.length} chunks para processamento`);
      
      // 3. Criar embeddings e enviar para Pinecone
      const editalId = `${concursoNome.toLowerCase().replace(/\s+/g, '_')}_edital`;
      await this.enviarParaPinecone(editalId, chunks, {
        concursoNome,
        fileName,
        type: 'edital'
      });
      
      // 4. Analisar cargo - sem tratamento de erro, falha limpa
      const analiseCarго = await this.analisarCargo(pdfText);
      console.log(`🔍 Análise de cargo:`, analiseCarго);
      
      // 5. Se tem apenas um cargo, extrair conteúdo programático
      let conteudoProgramatico: ConteudoProgramatico | undefined;
      if (analiseCarго.hasSingleCargo && analiseCarго.cargoName) {
        // Usar apenas uma parte do texto para extração programática
        const textoPrograma = pdfText.length > 50000 ? pdfText.substring(0, 50000) : pdfText;
        conteudoProgramatico = await this.extrairConteudoProgramatico(
          textoPrograma, 
          analiseCarго.cargoName
        );
        console.log(`📚 Conteúdo programático extraído para: ${analiseCarго.cargoName}`);
      }
      
      const editalInfo: EditalInfo = {
        id: editalId,
        concursoNome,
        fileName,
        filePath,
        processedAt: new Date(),
        hasSingleCargo: analiseCarго.hasSingleCargo,
        cargoName: analiseCarго.cargoName,
        conteudoProgramatico
      };
      
      console.log(`✅ Edital processado com sucesso: ${editalId}`);
      return editalInfo;
      
    } catch (error) {
      console.error(`❌ Erro ao processar edital ${fileName}:`, error);
      throw error;
    }
  }
  
  /**
   * Extrai texto de arquivo PDF usando o serviço otimizado
   */
  private async extrairTextoPDF(filePath: string): Promise<string> {
    try {
      // Se for arquivo .txt, ler como texto simples (para demonstração)
      if (filePath.endsWith('.txt')) {
        console.log(`📖 Lendo arquivo de texto: ${filePath}`);
        const texto = fs.readFileSync(filePath, 'utf8');
        console.log(`✅ Texto extraído: ${texto.length} caracteres`);
        return texto;
      }
      
      // Para arquivos PDF reais, usar o serviço otimizado
      const result = await pdfService.processPDF(filePath);
      return result.text;
    } catch (error) {
      console.error('❌ Erro ao extrair texto do PDF:', error);
      throw new Error('Falha ao processar arquivo PDF');
    }
  }
  
  /**
   * Cria chunks do texto para processamento de forma mais eficiente em memória
   */
  private criarChunks(texto: string): { content: string; chunkIndex: number }[] {
    // Reduzir tamanho dos chunks para economizar memória
    const CHUNK_SIZE = 1000;
    const OVERLAP = 100;
    
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;
    
    // Processar texto mais longo em batches para evitar picos de memória
    while (start < texto.length) {
      const end = Math.min(start + CHUNK_SIZE, texto.length);
      const chunk = texto.slice(start, end);
      
      // Só adicionar chunks não vazios
      if (chunk.trim().length > 0) {
        chunks.push({
          content: chunk.trim(),
          chunkIndex: chunkIndex++
        });
      }
      
      start = end - OVERLAP;
      
      // Forçar garbage collection a cada 50 chunks se disponível
      if (chunkIndex % 50 === 0 && global.gc) {
        global.gc();
      }
    }
    
    return chunks;
  }
  
  /**
   * Envia chunks para Pinecone
   */
  private async enviarParaPinecone(
    editalId: string,
    chunks: { content: string; chunkIndex: number }[],
    metadata: any
  ): Promise<void> {
    await pineconeService.upsertDocument(
      editalId,
      chunks,
      {
        userId: EDITAIS_NAMESPACE,
        title: `${metadata.concursoNome} - ${metadata.fileName}`,
        category: 'edital',
        ...metadata
      }
    );
  }
  
  /**
   * Analisa se o edital tem apenas um cargo usando RAG
   */
  private async analisarCargo(textoEdital: string): Promise<{
    hasSingleCargo: boolean;
    cargoName?: string;
  }> {
    try {
      const prompt = `
Analise o seguinte edital de concurso público e identifique quantos cargos estão sendo oferecidos.

TEXTO DO EDITAL:
${textoEdital.substring(0, 2000)} // Primeiros 2000 caracteres para análise

TAREFA:
1. Determine se o edital oferece apenas UM cargo ou MÚLTIPLOS cargos
2. Se for apenas um cargo, identifique o nome exato do cargo
3. Responda em formato JSON estruturado

FORMATO DA RESPOSTA (JSON):
{
  "hasSingleCargo": true/false,
  "cargoName": "Nome exato do cargo se houver apenas um",
  "totalCargos": número_total_de_cargos,
  "explicacao": "Breve explicação da análise"
}
`;

      console.log('🔍 Enviando prompt para análise de cargo...');
      const resultado = await ragService.generateContextualResponse({
        userId: EDITAIS_NAMESPACE,
        query: prompt,
        category: 'edital',
        enableReRanking: false
      });

      console.log('📥 Resposta da IA recebida:', resultado?.response?.substring(0, 200) + '...');
      
      if (!resultado || !resultado.response) {
        console.error('❌ RAG retornou resultado vazio ou inválido:', resultado);
        throw new Error('RAG não retornou resposta válida para análise de cargo');
      }

      try {
        const analise = JSON.parse(resultado.response);
        console.log('✅ Análise parseada com sucesso:', { 
          hasSingleCargo: analise.hasSingleCargo, 
          cargoName: analise.cargoName 
        });
        
        if (typeof analise.hasSingleCargo === 'undefined') {
          console.error('❌ Propriedade hasSingleCargo ausente na resposta:', analise);
          throw new Error('Resposta da IA não contém propriedade hasSingleCargo');
        }
        
        return {
          hasSingleCargo: analise.hasSingleCargo,
          cargoName: analise.cargoName
        };
      } catch (parseError) {
        console.error('❌ Erro ao parsear JSON da análise de cargo:', parseError);
        console.error('❌ Resposta que falhou no parse:', resultado.response);
        throw new Error('Falha na análise de cargo: resposta IA inválida - ' + parseError.message);
      }
      
    } catch (error) {
      console.error('❌ Erro na análise de cargo:', error);
      throw error; // Propagar erro sem mascarar
    }
  }
  
  /**
   * Extrai conteúdo programático usando RAG
   */
  private async extrairConteudoProgramatico(
    textoEdital: string,
    cargoName: string
  ): Promise<ConteudoProgramatico> {
    try {
      const prompt = `
Extraia o conteúdo programático do seguinte edital de concurso público para o cargo "${cargoName}".

TEXTO DO EDITAL:
${textoEdital}

TAREFA:
1. Encontre a seção de conteúdo programático/matérias/disciplinas
2. Organize as disciplinas e seus respectivos tópicos
3. Mantenha a estrutura hierárquica original
4. Responda em formato JSON estruturado

FORMATO DA RESPOSTA (JSON):
{
  "cargo": "${cargoName}",
  "disciplinas": [
    {
      "nome": "Nome da disciplina",
      "topicos": [
        "Tópico 1",
        "Tópico 2",
        "..."
      ]
    }
  ]
}
`;

      const resultado = await ragService.generateContextualResponse({
        userId: EDITAIS_NAMESPACE,
        query: prompt,
        category: 'edital',
        enableReRanking: false
      });

      try {
        const conteudo = JSON.parse(resultado.response);
        return conteudo;
      } catch (parseError) {
        console.error('❌ Erro ao parsear conteúdo programático:', parseError);
        throw new Error('Falha na extração de conteúdo programático: resposta IA inválida');
      }
      
    } catch (error) {
      console.error('❌ Erro ao extrair conteúdo programático:', error);
      throw error;
    }
  }
  
  /**
   * Busca informações de edital processado
   */
  async buscarInformacaoEdital(
    concursoNome: string,
    query: string
  ): Promise<string> {
    try {
      const results = await pineconeService.searchSimilarContent(
        query,
        EDITAIS_NAMESPACE,
        {
          topK: 5,
          category: 'edital',
          minSimilarity: 0.3
        }
      );
      
      if (results.length === 0) {
        return 'Nenhuma informação encontrada no edital processado.';
      }
      
      // Usar RAG para gerar resposta estruturada
      const contexto = results.map(r => r.content).join('\n\n');
      const prompt = `
Com base no seguinte conteúdo do edital, responda à pergunta de forma clara e estruturada.

CONTEXTO DO EDITAL:
${contexto}

PERGUNTA: ${query}

Responda de forma organizada e completa.
`;

      const resultado = await ragService.generateContextualResponse({
        userId: EDITAIS_NAMESPACE,
        query: prompt,
        category: 'edital',
        enableReRanking: true
      });
      
      return resultado.response;
      
    } catch (error) {
      console.error('❌ Erro ao buscar informação do edital:', error);
      throw error;
    }
  }
  
  /**
   * Lista editais processados
   */
  getNamespace(): string {
    return EDITAIS_NAMESPACE;
  }
}

export const editalService = new EditalProcessingService();
export { EditalInfo, ConteudoProgramatico, Disciplina };