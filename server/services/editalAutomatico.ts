import { ragService } from './rag';
import { pineconeService } from './pinecone';
import { editalService } from './edital';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Namespace para editais automáticos
const EDITAIS_NAMESPACE = 'editais-cebraspe';

/**
 * Serviço para processamento automático de editais
 * Encontra, baixa, processa e indexa editais automaticamente
 */
class EditalAutomaticoService {
  /**
   * Processa automaticamente o edital de um concurso
   * Encontra o edital, baixa, processa e retorna o conteúdo estruturado
   */
  async processarEditalAutomaticamente(concursoNome: string): Promise<{
    success: boolean;
    editalUrl?: string;
    cargos?: Array<{
      nome: string;
      conteudoProgramatico: Array<{
        disciplina: string;
        topicos: string[];
      }>;
    }>;
    error?: string;
  }> {
    try {
      console.log(`🤖 Iniciando processamento automático do edital: ${concursoNome}`);
      
      // Passo 1: Encontrar URL do edital
      const editalUrl = await this.encontrarUrlEdital(concursoNome);
      if (!editalUrl) {
        return {
          success: false,
          error: 'Não foi possível encontrar o URL do edital automaticamente'
        };
      }
      
      console.log(`📄 URL do edital encontrado: ${editalUrl}`);
      
      // Passo 2: Baixar o PDF do edital
      const caminhoArquivo = await this.baixarPDF(editalUrl, concursoNome);
      if (!caminhoArquivo) {
        return {
          success: false,
          editalUrl,
          error: 'Falha ao baixar o arquivo PDF do edital'
        };
      }
      
      console.log(`💾 PDF baixado: ${caminhoArquivo}`);
      
      // Passo 3: Processar e indexar no Pinecone
      const resultadoProcessamento = await editalService.processarEdital(
        concursoNome,
        caminhoArquivo,
        `edital_${concursoNome}.pdf`
      );
      
      // Passo 4: Detectar cargos e extrair conteúdo programático
      const cargos = await this.extrairCargosEConteudo(concursoNome);
      
      // Limpar arquivo temporário
      this.limparArquivoTemporario(caminhoArquivo);
      
      return {
        success: true,
        editalUrl,
        cargos
      };
      
    } catch (error) {
      console.error('❌ Erro no processamento automático:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  
  /**
   * Encontra automaticamente a URL do edital usando RAG
   */
  private async encontrarUrlEdital(concursoNome: string): Promise<string | null> {
    try {
      // Buscar informações do concurso no namespace de concursos
      const resultados = await pineconeService.searchSimilarContent(
        `edital ${concursoNome} PDF documento oficial`,
        'sistema',
        {
          topK: 3,
          category: 'concursos-cebraspe'
        }
      );
      
      if (resultados.length === 0) {
        return null;
      }
      
      // Usar RAG para extrair URL do edital
      const contexto = resultados.map((r: any) => r.content).join('\n\n');
      const prompt = `
Com base nas informações sobre o concurso "${concursoNome}", extraia a URL do edital em PDF.

Informações do concurso:
${contexto}

INSTRUÇÕES:
- Encontre a URL direta para download do edital em PDF
- A URL deve ser completa e acessível
- Retorne apenas a URL, sem texto adicional
- Se não encontrar uma URL válida, retorne "NAO_ENCONTRADO"

URL do edital:`;

      const resposta = await ragService.generateContextualResponse({
        userId: 'sistema',
        query: prompt,
        maxContextLength: 2000
      });
      const respostaText = resposta.response;
      
      if (respostaText.includes('NAO_ENCONTRADO') || respostaText.includes('não encontr')) {
        // Se não encontrou no RAG, tentar URLs conhecidas do Cebraspe
        return this.tentarUrlsPadrao(concursoNome);
      }
      
      // Extrair URL da resposta
      const urlMatch = respostaText.match(/(https?:\/\/[^\s]+\.pdf)/i);
      return urlMatch ? urlMatch[1] : this.tentarUrlsPadrao(concursoNome);
      
    } catch (error) {
      console.error('Erro ao buscar URL do edital:', error);
      return this.tentarUrlsPadrao(concursoNome);
    }
  }
  
  /**
   * Tenta URLs padrão conhecidas do Cebraspe
   */
  private async tentarUrlsPadrao(concursoNome: string): Promise<string | null> {
    const padroes = [
      // Padrões conhecidos de URLs do Cebraspe
      `https://www.cebraspe.org.br/concursos/${this.normalizarNome(concursoNome)}/edital.pdf`,
      `https://www.cebraspe.org.br/concursos/${this.normalizarNome(concursoNome)}_25/edital.pdf`,
      `https://cdn.cebraspe.org.br/concursos/${this.normalizarNome(concursoNome)}/edital_abertura.pdf`
    ];
    
    for (const url of padroes) {
      const existe = await this.verificarUrlExiste(url);
      if (existe) {
        return url;
      }
    }
    
    return null;
  }
  
  /**
   * Verifica se uma URL existe (retorna 200)
   */
  private async verificarUrlExiste(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = url.startsWith('https:') ? https : http;
      
      const req = client.request(url, { method: 'HEAD' }, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  }
  
  /**
   * Baixa um PDF de uma URL
   */
  private async baixarPDF(url: string, concursoNome: string): Promise<string | null> {
    return new Promise((resolve) => {
      const client = url.startsWith('https:') ? https : http;
      const nomeArquivo = `edital_${this.normalizarNome(concursoNome)}_${Date.now()}.pdf`;
      const caminhoCompleto = path.join('/tmp', nomeArquivo);
      
      const arquivo = fs.createWriteStream(caminhoCompleto);
      
      const req = client.get(url, (res) => {
        if (res.statusCode !== 200) {
          arquivo.close();
          fs.unlink(caminhoCompleto, () => {});
          resolve(null);
          return;
        }
        
        res.pipe(arquivo);
        
        arquivo.on('finish', () => {
          arquivo.close();
          resolve(caminhoCompleto);
        });
        
        arquivo.on('error', (err) => {
          console.error('Erro ao escrever arquivo:', err);
          fs.unlink(caminhoCompleto, () => {});
          resolve(null);
        });
      });
      
      req.on('error', (err) => {
        console.error('Erro ao baixar PDF:', err);
        resolve(null);
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        arquivo.close();
        fs.unlink(caminhoCompleto, () => {});
        resolve(null);
      });
    });
  }
  
  /**
   * Extrai cargos e conteúdo programático do edital indexado
   */
  private async extrairCargosEConteudo(concursoNome: string): Promise<Array<{
    nome: string;
    conteudoProgramatico: Array<{
      disciplina: string;
      topicos: string[];
    }>;
  }>> {
    try {
      // Buscar conteúdo do edital no namespace específico
      const resultadosEdital = await pineconeService.searchSimilarContent(
        `cargos vagas conteúdo programático ${concursoNome}`,
        'sistema',
        {
          topK: 10,
          category: EDITAIS_NAMESPACE
        }
      );
      
      if (resultadosEdital.length === 0) {
        return [];
      }
      
      const contextoEdital = resultadosEdital.map((r: any) => r.content).join('\n\n');
      
      // Detectar cargos disponíveis
      const promptCargos = `
Analise o edital do concurso "${concursoNome}" e identifique TODOS os cargos/vagas disponíveis.

Conteúdo do edital:
${contextoEdital}

INSTRUÇÕES:
- Liste TODOS os cargos/vagas mencionados no edital
- Retorne em formato JSON: {"cargos": ["Cargo 1", "Cargo 2", ...]}
- Use nomes completos e oficiais dos cargos
- Se houver apenas um cargo, retorne array com um elemento

Cargos encontrados:`;

      const responseCargos = await ragService.generateContextualResponse({
        userId: 'sistema',
        query: promptCargos,
        maxContextLength: 3000
      });
      const respostaCargos = responseCargos.response;
      
      let cargos: string[] = [];
      try {
        const dadosCargos = JSON.parse(respostaCargos.replace(/```json|```/g, ''));
        cargos = dadosCargos.cargos || [];
      } catch {
        // Se falhar o parse, tentar extrair manualmente
        const matches = respostaCargos.match(/"([^"]+)"/g);
        cargos = matches ? matches.map((m: string) => m.replace(/"/g, '')) : [];
      }
      
      // Para cada cargo, extrair conteúdo programático
      const resultadosFinais: Array<{
        nome: string;
        conteudoProgramatico: Array<{
          disciplina: string;
          topicos: string[];
        }>;
      }> = [];
      
      for (const cargo of cargos) {
        const conteudo = await this.extrairConteudoPorCargo(cargo, contextoEdital);
        resultadosFinais.push({
          nome: cargo,
          conteudoProgramatico: conteudo
        });
      }
      
      return resultadosFinais;
      
    } catch (error) {
      console.error('Erro ao extrair cargos e conteúdo:', error);
      return [];
    }
  }
  
  /**
   * Extrai conteúdo programático específico para um cargo
   */
  private async extrairConteudoPorCargo(cargo: string, contextoEdital: string): Promise<Array<{
    disciplina: string;
    topicos: string[];
  }>> {
    try {
      const prompt = `
Extraia o conteúdo programático específico para o cargo "${cargo}" do edital.

Conteúdo do edital:
${contextoEdital}

INSTRUÇÕES:
- Encontre a seção de conteúdo programático para este cargo específico
- Organize por disciplinas e tópicos
- Retorne em formato JSON estruturado:
{
  "disciplinas": [
    {
      "nome": "Nome da Disciplina",
      "topicos": [
        "Tópico 1",
        "Tópico 2",
        "Tópico 3"
      ]
    }
  ]
}
- Se não encontrar conteúdo específico, retorne array vazio
- Seja preciso e completo na extração

Conteúdo programático para ${cargo}:`;

      const response = await ragService.generateContextualResponse({
        userId: 'sistema',
        query: prompt,
        maxContextLength: 4000
      });
      const resposta = response.response;
      
      try {
        const dados = JSON.parse(resposta.replace(/```json|```/g, ''));
        return dados.disciplinas.map((d: any) => ({
          disciplina: d.nome,
          topicos: d.topicos
        }));
      } catch {
        // Se falhar o parse JSON, tentar extração manual básica
        return this.extrairConteudoManual(resposta);
      }
      
    } catch (error) {
      console.error(`Erro ao extrair conteúdo para cargo ${cargo}:`, error);
      return [];
    }
  }
  
  /**
   * Extração manual de conteúdo quando JSON falha
   */
  private extrairConteudoManual(texto: string): Array<{
    disciplina: string;
    topicos: string[];
  }> {
    const disciplinas: Array<{
      disciplina: string;
      topicos: string[];
    }> = [];
    
    const linhas = texto.split('\n');
    let disciplinaAtual = '';
    let topicosAtuais: string[] = [];
    
    for (const linha of linhas) {
      const linhaLimpa = linha.trim();
      
      if (!linhaLimpa) continue;
      
      // Detectar disciplina (linhas que parecem títulos)
      if (linhaLimpa.length < 100 && !linhaLimpa.startsWith('-') && !linhaLimpa.match(/^\d/)) {
        if (disciplinaAtual && topicosAtuais.length > 0) {
          disciplinas.push({
            disciplina: disciplinaAtual,
            topicos: [...topicosAtuais]
          });
        }
        disciplinaAtual = linhaLimpa;
        topicosAtuais = [];
      } else if (linhaLimpa.startsWith('-') || linhaLimpa.match(/^\d/)) {
        // Tópico
        topicosAtuais.push(linhaLimpa.replace(/^[-\d.\s]+/, ''));
      }
    }
    
    // Adicionar última disciplina
    if (disciplinaAtual && topicosAtuais.length > 0) {
      disciplinas.push({
        disciplina: disciplinaAtual,
        topicos: topicosAtuais
      });
    }
    
    return disciplinas;
  }
  
  /**
   * Normaliza nome do concurso para URLs
   */
  private normalizarNome(nome: string): string {
    return nome
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }
  
  /**
   * Remove arquivo temporário
   */
  private limparArquivoTemporario(caminho: string): void {
    try {
      fs.unlinkSync(caminho);
      console.log(`🗑️ Arquivo temporário removido: ${caminho}`);
    } catch (error) {
      console.warn('Aviso: Não foi possível remover arquivo temporário:', caminho);
    }
  }
}

export const editalAutomaticoService = new EditalAutomaticoService();