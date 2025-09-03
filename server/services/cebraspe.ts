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
  }
];

class CebraspeEmbeddingsService {
  
  /**
   * Processa e envia dados dos concursos para o Pinecone
   */
  async processarConcursosParaPinecone(): Promise<void> {
    console.log('🚀 Iniciando processamento de concursos para Pinecone...');
    
    try {
      for (const concurso of concursosDetalhados) {
        console.log(`📄 Processando: ${concurso.name}`);
        
        // Criar chunks do conteúdo (um chunk por concurso)
        const chunks = [{
          content: concurso.fullContent,
          chunkIndex: 0
        }];
        
        // Preparar metadados usando a interface do PineconeService
        const metadata = {
          userId: CONCURSOS_NAMESPACE, // Usar namespace como userId para separação
          title: concurso.name,
          category: 'concurso',
        };
        
        // Enviar para Pinecone usando o método existente
        await pineconeService.upsertDocument(
          concurso.id,
          chunks,
          metadata
        );
        
        console.log(`✅ ${concurso.name} processado com sucesso`);
      }
      
      console.log('🎉 Todos os concursos foram processados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao processar concursos:', error);
      throw error;
    }
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
          minSimilarity: 0.1 // Diminuir threshold para encontrar mais resultados
        }
      );
      
      console.log(`📊 Encontrados ${results.length} resultados`);
      
      // Converter resultados para formato de concurso
      const concursosEncontrados: ConcursoDetalhado[] = results.map((result, index) => {
        const concursoOriginal = concursosDetalhados.find(c => c.name === result.title);
        return {
          id: concursoOriginal?.id || `concurso_${index}`,
          name: result.title,
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