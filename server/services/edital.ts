import fs from 'fs';
import path from 'path';
import { pineconeService } from './pinecone';
import { ragService } from './rag';
// Lazy import to avoid loading issues
const loadPdfParse = async () => {
  try {
    const pdfParse = await import('pdf-parse');
    return pdfParse.default;
  } catch (error) {
    console.error('Erro ao carregar pdf-parse:', error);
    throw new Error('Falha ao carregar biblioteca de processamento de PDF');
  }
};

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
      const pdfText = await this.extrairTextoPDF(filePath);
      console.log(`✅ Texto extraído do PDF (${pdfText.length} caracteres)`);
      
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
      
      // 4. Analisar se tem apenas um cargo
      const analiseCarго = await this.analisarCargo(pdfText);
      console.log(`🔍 Análise de cargo:`, analiseCarго);
      
      // 5. Se tem apenas um cargo, extrair conteúdo programático
      let conteudoProgramatico: ConteudoProgramatico | undefined;
      if (analiseCarго.hasSingleCargo && analiseCarго.cargoName) {
        conteudoProgramatico = await this.extrairConteudoProgramatico(
          pdfText, 
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
   * Extrai texto de arquivo PDF
   */
  private async extrairTextoPDF(filePath: string): Promise<string> {
    try {
      const pdf = await loadPdfParse();
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('❌ Erro ao extrair texto do PDF:', error);
      throw new Error('Falha ao processar arquivo PDF');
    }
  }
  
  /**
   * Cria chunks do texto para processamento
   */
  private criarChunks(texto: string): { content: string; chunkIndex: number }[] {
    const CHUNK_SIZE = 2000;
    const OVERLAP = 200;
    
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;
    
    while (start < texto.length) {
      const end = Math.min(start + CHUNK_SIZE, texto.length);
      const chunk = texto.slice(start, end);
      
      chunks.push({
        content: chunk,
        chunkIndex: chunkIndex++
      });
      
      start = end - OVERLAP;
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
${textoEdital.substring(0, 4000)} // Primeiros 4000 caracteres para análise

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

      const resultado = await ragService.generateContextualResponse({
        userId: EDITAIS_NAMESPACE,
        query: prompt,
        category: 'edital',
        enableReRanking: false
      });

      try {
        const analise = JSON.parse(resultado.response);
        return {
          hasSingleCargo: analise.hasSingleCargo,
          cargoName: analise.cargoName
        };
      } catch (parseError) {
        console.warn('⚠️ Erro ao parsear resposta da análise de cargo, usando regex fallback');
        
        // Fallback: análise simples por regex
        const cargosEncontrados = textoEdital.match(/CARGO[:\s]*([A-Z\s]+)/gi) || [];
        const hasSingleCargo = cargosEncontrados.length === 1;
        const cargoName = hasSingleCargo ? cargosEncontrados[0].replace(/CARGO[:\s]*/i, '').trim() : undefined;
        
        return { hasSingleCargo, cargoName };
      }
      
    } catch (error) {
      console.error('❌ Erro na análise de cargo:', error);
      return { hasSingleCargo: false };
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
        console.warn('⚠️ Erro ao parsear conteúdo programático, retornando estrutura básica');
        
        // Fallback: estrutura básica
        return {
          cargo: cargoName,
          disciplinas: [
            {
              nome: 'Conteúdo não estruturado',
              topicos: ['Consulte o edital original para detalhes completos']
            }
          ]
        };
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