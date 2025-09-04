import { embeddingsService } from './embeddings';
import { pineconeService } from './pinecone';

// Interface para dados detalhados dos concursos
export interface ConcursoDetalhado {
  id: string;
  name: string;
  url: string;
  vagas?: string;
  salario?: string;
  orgao?: string;
  cargo?: string;
  requisitos?: string;
  inscricoes?: string;
  dataProva?: string;
  status?: string;
  description?: string;
  fullContent: string; // Conteúdo completo para embeddings
}

// Namespace específico para concursos no Pinecone
const CONCURSOS_NAMESPACE = 'concursos-cebraspe';

// Dados dos concursos (será expandido com scraping detalhado)
const concursosDetalhados: ConcursoDetalhado[] = [
  {
    id: 'sefaz_se_25_auditor',
    name: 'SEFAZ SE AUDITOR',
    url: 'https://www.cebraspe.org.br/concursos/SEFAZ_SE_25_AUDITOR',
    vagas: '10 vagas',
    salario: 'Até R$ 22.541,47',
    orgao: 'Secretaria da Fazenda de Sergipe',
    cargo: 'Auditor Fiscal',
    status: 'Em Andamento',
    fullContent: 'SEFAZ SE AUDITOR 2025 Secretaria da Fazenda de Sergipe Auditor Fiscal 10 vagas salário até R$ 22.541,47 concurso em andamento cebraspe'
  },
  {
    id: 'pf_25',
    name: 'POLÍCIA FEDERAL',
    url: 'https://www.cebraspe.org.br/concursos/PF_25',
    vagas: '1000 vagas',
    salario: 'Até R$ 26.800,00',
    orgao: 'Polícia Federal',
    cargo: 'Agente da Polícia Federal',
    status: 'Em Andamento',
    fullContent: 'POLÍCIA FEDERAL PF 2025 Agente da Polícia Federal 1000 vagas salário até R$ 26.800,00 concurso em andamento cebraspe segurança pública'
  },
  {
    id: 'inss_22',
    name: 'INSS',
    url: 'https://www.cebraspe.org.br/concursos/INSS_22',
    vagas: '1000 vagas',
    salario: 'Até R$ 5.905,79',
    orgao: 'Instituto Nacional do Seguro Social',
    cargo: 'Técnico do Seguro Social',
    status: 'Em Andamento',
    fullContent: 'INSS 2022 Instituto Nacional do Seguro Social Técnico do Seguro Social 1000 vagas salário até R$ 5.905,79 concurso em andamento previdência social'
  },
  {
    id: 'prf_21',
    name: 'POLÍCIA RODOVIÁRIA FEDERAL',
    url: 'https://www.cebraspe.org.br/concursos/PRF_21',
    vagas: '1500 vagas',
    orgao: 'Polícia Rodoviária Federal',
    cargo: 'Policial Rodoviário Federal',
    status: 'Em Andamento',
    fullContent: 'POLÍCIA RODOVIÁRIA FEDERAL PRF 2021 Policial Rodoviário Federal 1500 vagas concurso em andamento segurança pública rodovias federais trânsito'
  },
  {
    id: 'tcu_25_tefc',
    name: 'TCU TEFC',
    url: 'https://www.cebraspe.org.br/concursos/TCU_25_TEFC',
    vagas: '40 vagas',
    salario: 'Até R$ 15.128,26',
    orgao: 'Tribunal de Contas da União',
    cargo: 'Técnico Federal de Controle Externo',
    status: 'Em Andamento',
    fullContent: 'TCU TEFC 2025 Tribunal de Contas da União Técnico Federal de Controle Externo 40 vagas salário até R$ 15.128,26 concurso em andamento controle externo'
  },
  {
    id: 'tj_ce_25_notarios',
    name: 'TJ CE NOTÁRIOS',
    url: 'https://www.cebraspe.org.br/concursos/TJ_CE_25_NOTARIOS',
    vagas: '44 vagas',
    orgao: 'Tribunal de Justiça do Ceará',
    cargo: 'Notários e Registradores',
    status: 'Novos',
    fullContent: 'TJ CE NOTÁRIOS 2025 Tribunal de Justiça do Ceará Notários e Registradores 44 vagas concurso novo cartórios ceará'
  },
  {
    id: 'banrisul_25',
    name: 'BANRISUL',
    url: 'https://www.cebraspe.org.br/concursos/BANRISUL_25',
    vagas: '100 vagas',
    salario: 'Até R$ 5.847,62',
    orgao: 'Banco do Estado do Rio Grande do Sul',
    cargo: 'Escriturário',
    status: 'Em Andamento',
    fullContent: 'BANRISUL 2025 Banco do Estado do Rio Grande do Sul Escriturário 100 vagas salário até R$ 5.847,62 concurso em andamento bancário rio grande do sul'
  },
  {
    id: 'susep_25',
    name: 'SUSEP',
    url: 'https://www.cebraspe.org.br/concursos/SUSEP_25',
    vagas: '75 vagas',
    salario: 'Até R$ 18.033,52',
    orgao: 'Superintendência de Seguros Privados',
    cargo: 'Especialista em Regulação de Seguros Privados',
    status: 'Em Andamento',
    fullContent: 'SUSEP 2025 Superintendência de Seguros Privados Especialista em Regulação de Seguros Privados 75 vagas salário até R$ 18.033,52 seguros privados previdência'
  },
  // Concursos Encerrados
  {
    id: 'pc_df_22',
    name: 'POLÍCIA CIVIL DF',
    url: 'https://www.cebraspe.org.br/concursos/PC_DF_22',
    vagas: '1.800 vagas',
    salario: 'Até R$ 17.315,99',
    orgao: 'Polícia Civil do Distrito Federal',
    cargo: 'Agente, Escrivão e Papiloscopista',
    status: 'Encerrado',
    fullContent: 'POLÍCIA CIVIL DF 2022 Polícia Civil do Distrito Federal Agente Escrivão Papiloscopista 1800 vagas salário até R$ 17.315,99 concurso encerrado segurança pública polícia civil distrito federal'
  },
  {
    id: 'trt_15_21',
    name: 'TRT 15ª REGIÃO',
    url: 'https://www.cebraspe.org.br/concursos/TRT_15_21',
    vagas: '110 vagas',
    salario: 'Até R$ 13.994,78',
    orgao: 'Tribunal Regional do Trabalho 15ª Região',
    cargo: 'Analista Judiciário e Técnico Judiciário',
    status: 'Encerrado',
    fullContent: 'TRT 15ª REGIÃO 2021 Tribunal Regional do Trabalho 15ª Região Analista Judiciário Técnico Judiciário 110 vagas salário até R$ 13.994,78 concurso encerrado justiça trabalhista campinas'
  },
  {
    id: 'dpu_21',
    name: 'DEFENSORIA PÚBLICA DA UNIÃO',
    url: 'https://www.cebraspe.org.br/concursos/DPU_21',
    vagas: '192 vagas',
    salario: 'Até R$ 10.368,74',
    orgao: 'Defensoria Pública da União',
    cargo: 'Analista Técnico-Administrativo',
    status: 'Encerrado',
    fullContent: 'DEFENSORIA PÚBLICA DA UNIÃO DPU 2021 Analista Técnico-Administrativo 192 vagas salário até R$ 10.368,74 concurso encerrado defensoria pública assistência jurídica'
  },
  {
    id: 'pm_al_21',
    name: 'POLÍCIA MILITAR AL',
    url: 'https://www.cebraspe.org.br/concursos/PM_AL_21',
    vagas: '1.000 vagas',
    salario: 'Até R$ 4.915,00',
    orgao: 'Polícia Militar de Alagoas',
    cargo: 'Soldado da Polícia Militar',
    status: 'Encerrado',
    fullContent: 'POLÍCIA MILITAR AL 2021 Polícia Militar de Alagoas Soldado da Polícia Militar 1000 vagas salário até R$ 4.915,00 concurso encerrado segurança pública polícia militar alagoas'
  },
  {
    id: 'cbm_al_21',
    name: 'BOMBEIROS AL',
    url: 'https://www.cebraspe.org.br/concursos/CBM_AL_21',
    vagas: '240 vagas',
    salario: 'Até R$ 4.915,00',
    orgao: 'Corpo de Bombeiros de Alagoas',
    cargo: 'Soldado Bombeiro Militar',
    status: 'Encerrado',
    fullContent: 'BOMBEIROS AL 2021 Corpo de Bombeiros de Alagoas Soldado Bombeiro Militar 240 vagas salário até R$ 4.915,00 concurso encerrado bombeiros segurança pública alagoas'
  },
  {
    id: 'pc_pe_21',
    name: 'POLÍCIA CIVIL PE',
    url: 'https://www.cebraspe.org.br/concursos/PC_PE_21',
    vagas: '1.400 vagas',
    salario: 'Até R$ 4.236,51',
    orgao: 'Polícia Civil de Pernambuco',
    cargo: 'Agente de Polícia e Escrivão',
    status: 'Encerrado',
    fullContent: 'POLÍCIA CIVIL PE 2021 Polícia Civil de Pernambuco Agente de Polícia Escrivão 1400 vagas salário até R$ 4.236,51 concurso encerrado segurança pública polícia civil pernambuco'
  },
  {
    id: 'tse_21',
    name: 'TSE',
    url: 'https://www.cebraspe.org.br/concursos/TSE_21',
    vagas: '336 vagas',
    salario: 'Até R$ 13.994,78',
    orgao: 'Tribunal Superior Eleitoral',
    cargo: 'Analista Judiciário e Técnico Judiciário',
    status: 'Encerrado',
    fullContent: 'TSE 2021 Tribunal Superior Eleitoral Analista Judiciário Técnico Judiciário 336 vagas salário até R$ 13.994,78 concurso encerrado justiça eleitoral eleições'
  },
  {
    id: 'pgm_manaus_21',
    name: 'PGM MANAUS',
    url: 'https://www.cebraspe.org.br/concursos/PGM_MANAUS_21',
    vagas: '30 vagas',
    salario: 'Até R$ 3.500,00',
    orgao: 'Procuradoria Geral do Município de Manaus',
    cargo: 'Procurador Municipal',
    status: 'Encerrado',
    fullContent: 'PGM MANAUS 2021 Procuradoria Geral do Município de Manaus Procurador Municipal 30 vagas salário até R$ 3.500,00 concurso encerrado procuradoria municipal manaus amazonas'
  },
  {
    id: 'sedf_22',
    name: 'SEDF',
    url: 'https://www.cebraspe.org.br/concursos/SEDF_22',
    vagas: '2.888 vagas',
    salario: 'Até R$ 4.817,59',
    orgao: 'Secretaria de Educação do Distrito Federal',
    cargo: 'Professor de Educação Básica',
    status: 'Encerrado',
    fullContent: 'SEDF 2022 Secretaria de Educação do Distrito Federal Professor de Educação Básica 2888 vagas salário até R$ 4.817,59 concurso encerrado educação professor distrito federal'
  }
];

class CebraspeEmbeddingsService {
  
  /**
   * Extrai área do concurso baseado no nome e órgão
   */
  private extractArea(name: string, orgao: string): string {
    const combined = `${name} ${orgao}`.toLowerCase();
    
    if (combined.includes('policia') || combined.includes('seguranca')) {
      return 'seguranca-publica';
    }
    if (combined.includes('tribunal') || combined.includes('justica') || combined.includes('tse') || combined.includes('trt')) {
      return 'poder-judiciario';
    }
    if (combined.includes('defensoria')) {
      return 'defensoria-publica';
    }
    if (combined.includes('educacao') || combined.includes('professor') || combined.includes('sedf')) {
      return 'educacao';
    }
    if (combined.includes('fazenda') || combined.includes('sefaz') || combined.includes('auditor')) {
      return 'fazenda-tributario';
    }
    if (combined.includes('banco') || combined.includes('banrisul')) {
      return 'bancario';
    }
    if (combined.includes('susep') || combined.includes('seguros')) {
      return 'seguros-previdencia';
    }
    if (combined.includes('inss') || combined.includes('previdencia')) {
      return 'previdencia-social';
    }
    if (combined.includes('procuradoria') || combined.includes('pgm')) {
      return 'procuradoria';
    }
    if (combined.includes('bombeiros') || combined.includes('cbm')) {
      return 'bombeiros';
    }
    
    return 'outros';
  }
  
  /**
   * Processa e envia dados dos concursos para o Pinecone usando scraping real
   */
  async processarConcursosParaPinecone(): Promise<void> {
    console.log('🚀 Iniciando processamento REAL de concursos do Cebraspe...');
    
    try {
      // Importar webScraperService
      const { webScraperService } = await import('./web-scraper');
      
      // URLs do site real do Cebraspe para tentar
      const cebraspeUrls = [
        'https://www.cebraspe.org.br/concursos/',
        'https://www.cebraspe.org.br/concursos/encerrado',
        'https://www.cebraspe.org.br/concursos/andamento'
      ];
      
      console.log('🌐 Fazendo scraping real de múltiplas páginas do Cebraspe...');
      
      let totalProcessed = 0;
      let successfulUrls = [];
      
      // Tentar processar cada URL
      for (const url of cebraspeUrls) {
        try {
          console.log(`🔍 Tentando URL: ${url}`);
          
          const result = await webScraperService.processWebsiteIntelligently(
            url,
            ['concurso_publico'],
            `cebraspe-real-${url.split('/').pop() || 'main'}`
          );
          
          if (result.success) {
            totalProcessed += result.documentsProcessed || 0;
            successfulUrls.push(url);
            console.log(`✅ ${url} processada com sucesso - ${result.documentsProcessed} documentos`);
          } else {
            console.warn(`⚠️ ${url} falhou: ${result.error}`);
          }
        } catch (error) {
          console.warn(`❌ Erro ao processar ${url}:`, error.message);
        }
      }
      
      const result = {
        success: totalProcessed > 0,
        documentsProcessed: totalProcessed,
        method: `múltiplas URLs (${successfulUrls.length}/${cebraspeUrls.length} sucessos)`,
        error: totalProcessed === 0 ? 'Nenhuma URL foi processada com sucesso' : undefined
      };
      
      if (result.success) {
        console.log(`🎉 Processamento real concluído com sucesso!`);
        console.log(`📊 ${result.documentsProcessed} documentos processados usando método: ${result.method}`);
        console.log('✅ Dados reais do Cebraspe agora estão indexados no Pinecone');
      } else {
        console.warn('⚠️ Processamento simples falhou, tentando com navegador avançado...');
        
        // Tentar com browser scraping (Playwright)
        const browserResult = await this.processarComBrowser();
        
        if (browserResult.success) {
          console.log(`🎉 Processamento com navegador concluído com sucesso!`);
          console.log(`📊 ${browserResult.documentsProcessed} documentos processados via browser`);
          console.log('✅ Dados extraídos via navegador agora estão indexados no Pinecone');
        } else {
          console.warn('⚠️ Processamento com navegador também falhou, usando dados de fallback...');
          
          // Se o browser scraping também falhar, usar dados hardcoded como fallback
          await this.processarDadosHardcoded();
        }
      }
      
    } catch (error) {
      console.error('❌ Erro no processamento real:', error);
      console.log('🔄 Tentando com dados de fallback...');
      
      // Em caso de erro, usar dados hardcoded como backup
      await this.processarDadosHardcoded();
    }
  }

  /**
   * Processa usando navegador avançado (Playwright)
   */
  private async processarComBrowser(): Promise<{ success: boolean; documentsProcessed: number }> {
    console.log('🚀 Iniciando processamento com navegador Playwright...');
    
    try {
      // Importar browserScraperService
      const { browserScraperService } = await import('./browser-scraper');
      
      // URLs do site do Cebraspe para tentar com navegador
      const cebraspeUrls = [
        'https://www.cebraspe.org.br/concursos/',
        'https://www.cebraspe.org.br/concursos/encerrado',
        'https://www.cebraspe.org.br/concursos/andamento'
      ];
      
      // Usar browser scraping para extrair dados reais
      const result = await browserScraperService.scrapeMultipleCebraspePages(cebraspeUrls);
      
      if (result.success && result.results.length > 0) {
        console.log(`📊 Browser extraiu ${result.totalConcursos} concursos reais!`);
        
        // Processar e indexar os concursos extraídos
        for (const concurso of result.results) {
          // Criar chunks do conteúdo extraído
          const chunks = [{
            content: concurso.texto || concurso.titulo,
            chunkIndex: 0
          }];
          
          // Extrair ano do título/texto
          const yearMatch = concurso.titulo.match(/20\d{2}/);
          const year = yearMatch ? yearMatch[0] : '2025';
          
          // Preparar metadados
          const metadata = {
            userId: CONCURSOS_NAMESPACE,
            title: concurso.titulo,
            category: 'concurso',
            status: 'Extraído via Browser',
            year: year,
            area: this.extractArea(concurso.titulo, concurso.titulo)
          };
          
          // Gerar ID único baseado no título
          const concursoId = `browser-${concurso.titulo.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;
          
          // Enviar para Pinecone
          await pineconeService.upsertDocument(
            concursoId,
            chunks,
            metadata
          );
          
          console.log(`✅ ${concurso.titulo} indexado via browser`);
        }
        
        return {
          success: true,
          documentsProcessed: result.totalConcursos
        };
      } else {
        console.warn('⚠️ Browser scraping não encontrou concursos');
        return {
          success: false,
          documentsProcessed: 0
        };
      }
      
    } catch (error) {
      console.error('❌ Erro no processamento com browser:', error);
      return {
        success: false,
        documentsProcessed: 0
      };
    }
  }

  /**
   * Processa dados hardcoded como fallback
   */
  private async processarDadosHardcoded(): Promise<void> {
    console.log('📋 Processando dados hardcoded como fallback...');
    
    for (const concurso of concursosDetalhados) {
      console.log(`📄 Processando: ${concurso.name}`);
      
      // Criar chunks do conteúdo (um chunk por concurso)
      const chunks = [{
        content: concurso.fullContent,
        chunkIndex: 0
      }];
      
      // Extrair ano do fullContent para metadados
      const yearMatch = concurso.fullContent.match(/20\d{2}/);
      const year = yearMatch ? yearMatch[0] : '2025';
      
      // Preparar metadados usando a interface do PineconeService
      const metadata = {
        userId: CONCURSOS_NAMESPACE, // Usar namespace como userId para separação
        title: `${concurso.name} ${year}`,
        category: 'concurso',
        status: concurso.status || 'Em Andamento',
        year: year,
        area: this.extractArea(concurso.name, concurso.orgao || '')
      };
      
      // Enviar para Pinecone usando o método existente
      await pineconeService.upsertDocument(
        concurso.id,
        chunks,
        metadata
      );
      
      console.log(`✅ ${concurso.name} processado com sucesso`);
    }
    
    console.log('✅ Dados de fallback processados com sucesso!');
  }
  
  /**
   * Busca concursos usando RAG
   */
  async buscarConcursoPorRAG(query: string): Promise<ConcursoDetalhado[]> {
    try {
      console.log(`🔍 Buscando concurso via RAG: "${query}"`);
      
      // Buscar usando o PineconeService existente
      const results = await pineconeService.searchSimilarContent(
        query,
        CONCURSOS_NAMESPACE, // Usar namespace como userId
        {
          topK: 5,
          category: 'concurso',
          minSimilarity: 0.45 // Threshold mais alto para resultados relevantes
        }
      );
      
      console.log(`📊 Encontrados ${results.length} resultados`);
      
      // Converter resultados para formato de concurso
      const concursosEncontrados: ConcursoDetalhado[] = results.map((result, index) => {
        // Buscar por nome base (removendo ano do title se presente)
        const baseName = result.title.replace(/\s+20\d{2}$/, '');
        const concursoOriginal = concursosDetalhados.find(c => c.name === baseName);
        return {
          id: concursoOriginal?.id || `concurso_${index}`,
          name: baseName,
          url: concursoOriginal?.url || '',
          vagas: concursoOriginal?.vagas || '',
          salario: concursoOriginal?.salario || '',
          orgao: concursoOriginal?.orgao || '',
          cargo: concursoOriginal?.cargo || '',
          status: concursoOriginal?.status || '',
          fullContent: result.content,
          description: `Score: ${result.similarity.toFixed(3)}`
        };
      });
      
      return concursosEncontrados;
    } catch (error) {
      console.error('❌ Erro na busca por RAG:', error);
      throw error;
    }
  }
  
  /**
   * Retorna o namespace usado para concursos
   */
  getConcursosNamespace(): string {
    return CONCURSOS_NAMESPACE;
  }
  
  /**
   * Lista todos os concursos disponíveis
   */
  listarTodosConcursos(): ConcursoDetalhado[] {
    return concursosDetalhados;
  }
}

export const cebraspeEmbeddingsService = new CebraspeEmbeddingsService();