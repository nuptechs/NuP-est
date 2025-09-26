import OpenAI from 'openai';
// Type compatibility - usando definição local para manter compatibilidade
interface TitleChunk {
  id: string;
  title: string;
  level: number;
  content: string;
  startPosition: number;
  endPosition: number;
  parentId?: string;
}

interface SummaryItem {
  id: string;
  title: string;
  level: number;
  summary: string;
  keyPoints: string[];
  importance: 'high' | 'medium' | 'low';
  parentId?: string;
  originalChunkId: string;
}

interface SmartSummary {
  documentName: string;
  overallSummary: string;
  totalSections: number;
  summaryItems: SummaryItem[];
  generatedAt: Date;
}

export class SmartSummaryService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  /**
   * Gera sumário inteligente baseado nos chunks do documento
   */
  async generateSmartSummary(chunks: TitleChunk[], documentName: string): Promise<SmartSummary> {
    console.log(`🧠 Gerando sumário inteligente para ${chunks.length} chunks`);
    
    const summaryItems: SummaryItem[] = [];
    
    // Processar chunks em lotes para otimizar chamadas da API
    const batchSize = 3;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchSummaries = await this.processBatchSummary(batch);
      summaryItems.push(...batchSummaries);
    }
    
    // Gerar sumário geral do documento
    const overallSummary = await this.generateOverallSummary(summaryItems, documentName);
    
    const smartSummary: SmartSummary = {
      documentName,
      overallSummary,
      totalSections: summaryItems.length,
      summaryItems,
      generatedAt: new Date()
    };
    
    console.log(`✅ Sumário inteligente gerado com ${summaryItems.length} seções`);
    return smartSummary;
  }
  
  /**
   * Processa um lote de chunks e gera sumários
   */
  private async processBatchSummary(chunks: TitleChunk[]): Promise<SummaryItem[]> {
    console.log(`🔄 [BATCH-DEBUG] Processando ${chunks.length} chunks:`, chunks.map(c => c.title));
    
    const prompt = this.buildBatchSummaryPrompt(chunks);
    
    try {
      console.log(`🚀 [OPENROUTER-DEBUG] Fazendo chamada para deepseek/deepseek-r1...`);
      const response = await this.openai.chat.completions.create({
        model: 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de documentos oficiais e editais. Sua tarefa é criar sumários concisos e informativos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      console.log(`📥 [OPENROUTER-DEBUG] Resposta recebida (${content?.length || 0} chars):`, content?.substring(0, 200) + '...');
      
      if (!content) {
        throw new Error('Resposta vazia da IA');
      }

      return this.parseBatchSummaryResponse(content, chunks);
    } catch (error) {
      console.error('❌ [BATCH-ERROR] Erro ao gerar sumário por lote:', error);
      console.log(`🔄 [FALLBACK] Usando fallback com ${chunks.length} chunks detectados`);
      // Fallback: criar sumários básicos
      return this.createFallbackSummaries(chunks);
    }
  }
  
  /**
   * Constrói o prompt para processamento em lote
   */
  private buildBatchSummaryPrompt(chunks: TitleChunk[]): string {
    const chunksText = chunks.map((chunk, index) => 
      `=== SEÇÃO ${index + 1}: ${chunk.title} ===\n${chunk.content.substring(0, 1000)}${chunk.content.length > 1000 ? '...' : ''}`
    ).join('\n\n');

    return `
Analise as seguintes seções de um edital e crie um sumário estruturado para cada uma:

${chunksText}

Para cada seção, forneça:
1. Um resumo conciso (máximo 150 palavras)
2. Pontos-chave principais (3-5 itens)
3. Nível de importância (high/medium/low)

Responda APENAS com JSON válido neste formato:
{
  "summaries": [
    {
      "section": 1,
      "title": "título da seção",
      "summary": "resumo conciso da seção",
      "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
      "importance": "high|medium|low"
    }
  ]
}

IMPORTANTE: Resposta deve ser JSON válido, sem texto adicional.
`;
  }
  
  /**
   * Faz parsing da resposta da IA para o formato esperado
   */
  private parseBatchSummaryResponse(content: string, chunks: TitleChunk[]): SummaryItem[] {
    console.log(`🔍 [PARSE-DEBUG] Fazendo parse da resposta para ${chunks.length} chunks`);
    
    try {
      // Limpar markdown da resposta se presente
      let cleanContent = content.trim();
      
      // Remover ```json e ``` se presentes
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      const summaries = parsed.summaries || [];
      
      const result = summaries.map((summary: any, index: number) => {
        const chunk = chunks[index];
        return {
          id: `summary_${chunk.id}`,
          title: chunk.title,
          level: chunk.level,
          summary: summary.summary || 'Resumo não disponível',
          keyPoints: summary.keyPoints || [],
          importance: summary.importance || 'medium',
          parentId: chunk.parentId,
          originalChunkId: chunk.id
        } as SummaryItem;
      });
      
      console.log(`✅ [PARSE-DEBUG] Parse bem-sucedido: ${result.length} summaryItems criados`);
      return result;
    } catch (error) {
      console.error('❌ [PARSE-ERROR] Erro ao fazer parse da resposta:', error);
      console.log(`🔄 [FALLBACK] Usando createFallbackSummaries para ${chunks.length} chunks`);
      return this.createFallbackSummaries(chunks);
    }
  }
  
  /**
   * Cria sumários básicos quando a IA falha
   */
  private createFallbackSummaries(chunks: TitleChunk[]): SummaryItem[] {
    console.log(`🔄 [FALLBACK-DEBUG] Criando ${chunks.length} sumários de fallback:`);
    chunks.forEach((chunk, i) => console.log(`  ${i+1}. "${chunk.title}" (level ${chunk.level})`));
    
    const fallbackItems = chunks.map(chunk => ({
      id: `summary_${chunk.id}`,
      title: chunk.title,
      level: chunk.level,
      summary: this.extractFirstSentences(chunk.content, 2),
      keyPoints: this.extractKeyWords(chunk.content),
      importance: 'medium' as const,
      parentId: chunk.parentId,
      originalChunkId: chunk.id
    }));
    
    console.log(`✅ [FALLBACK-DEBUG] ${fallbackItems.length} sumários fallback criados com títulos preservados`);
    return fallbackItems;
  }
  
  /**
   * Extrai as primeiras frases do conteúdo
   */
  private extractFirstSentences(content: string, count: number): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, count).join('. ') + '.';
  }
  
  /**
   * Extrai palavras-chave do conteúdo
   */
  private extractKeyWords(content: string): string[] {
    // Palavras comuns a ignorar
    const stopWords = ['o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'se', 'é', 'foi', 'são', 'será'];
    
    const words = content.toLowerCase()
      .match(/\b[a-záêàâíóôõü]{4,}\b/g) || [];
    
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  /**
   * Gera sumário geral do documento
   */
  private async generateOverallSummary(summaryItems: SummaryItem[], documentName: string): Promise<string> {
    const mainSections = summaryItems
      .filter(item => item.level <= 2)
      .map(item => `- ${item.title}: ${item.summary.substring(0, 100)}...`)
      .join('\n');

    const prompt = `
Com base nestas seções principais de um edital, crie um sumário geral conciso:

DOCUMENTO: ${documentName}

SEÇÕES PRINCIPAIS:
${mainSections}

Crie um resumo executivo em português (máximo 200 palavras) que destaque:
1. Propósito do edital
2. Principais seções/tópicos abordados
3. Aspectos mais relevantes

Responda apenas com o texto do resumo, sem formatação adicional.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em resumir documentos oficiais de forma clara e objetiva.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      return response.choices[0]?.message?.content || 'Resumo geral não disponível.';
    } catch (error) {
      console.error('Erro ao gerar resumo geral:', error);
      return `Este documento contém ${summaryItems.length} seções organizadas hierarquicamente, abordando diversos aspectos do edital ${documentName}.`;
    }
  }
}

// Instância singleton
export const smartSummaryService = new SmartSummaryService();