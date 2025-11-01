import type { Material } from '@shared/schema';
import { HybridSearchService } from '../rag/HybridSearchService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HierarchyNode {
  level: number;
  title: string;
  content: string;
  children: HierarchyNode[];
}

export class MindMapGenerator {
  private hybridSearch: HybridSearchService;

  constructor() {
    this.hybridSearch = new HybridSearchService();
  }

  async generateFromMaterial(
    material: Material, 
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      onProgress?.(10); // Starting

      // 1. Buscar chunks relacionados ao material usando RAG
      onProgress?.(20); // Starting search
      const searchResults = await this.hybridSearch.search(material.title, {
        userId,
        topK: 30,
        materialIds: [material.id],
      });

      if (!searchResults || searchResults.length === 0) {
        throw new Error('No content found in material');
      }

      onProgress?.(50); // Search complete, building hierarchy

      // 2. Construir hierarquia a partir dos chunks
      const hierarchy = this.buildHierarchyFromChunks(searchResults);

      onProgress?.(70); // Hierarchy built, generating mermaid

      // 3. Gerar Mermaid syntax usando GPT-4o-mini
      const mermaidSyntax = await this.generateMermaidFromHierarchy(
        material.title,
        hierarchy
      );

      onProgress?.(90); // Generation complete

      return mermaidSyntax;
    } catch (error) {
      console.error('[MindMapGenerator] Error generating from material:', error);
      throw error;
    }
  }

  async generateFromPrompt(
    prompt: string,
    userId: string,
    subjectId?: string,
    useRAG: boolean = true,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      onProgress?.(10); // Starting

      if (!useRAG) {
        onProgress?.(50); // Halfway
        // Geração pura sem RAG
        const result = await this.generateMermaidFromPromptOnly(prompt);
        onProgress?.(90);
        return result;
      }

      onProgress?.(20); // Starting RAG search

      // 1. Buscar conteúdo relacionado via RAG
      const searchResults = await this.hybridSearch.search(prompt, {
        userId,
        topK: 20,
        category: subjectId,
      });

      onProgress?.(50); // Search complete, generating

      // 2. Gerar mapa mental com contexto RAG
      const mermaidSyntax = await this.generateMermaidWithRAGContext(
        prompt,
        searchResults || []
      );

      onProgress?.(90); // Generation complete

      return mermaidSyntax;
    } catch (error) {
      console.error('[MindMapGenerator] Error generating from prompt:', error);
      throw error;
    }
  }

  private buildHierarchyFromChunks(chunks: any[]): HierarchyNode[] {
    const rootNodes: HierarchyNode[] = [];
    
    // Agrupa chunks por metadata (título, seção, etc.)
    for (const chunk of chunks) {
      const metadata = chunk.metadata || {};
      const keywords = metadata.keywords || [];
      
      // Usa as primeiras keywords como títulos de nível
      if (keywords.length > 0) {
        const mainKeyword = keywords[0];
        
        let existingNode = rootNodes.find(n => n.title === mainKeyword);
        if (!existingNode) {
          existingNode = {
            level: 1,
            title: mainKeyword,
            content: chunk.content,
            children: [],
          };
          rootNodes.push(existingNode);
        }
        
        // Adiciona sub-tópicos
        if (keywords.length > 1) {
          const subKeyword = keywords[1];
          let subNode = existingNode.children.find(n => n.title === subKeyword);
          if (!subNode) {
            subNode = {
              level: 2,
              title: subKeyword,
              content: chunk.content,
              children: [],
            };
            existingNode.children.push(subNode);
          }
        }
      }
    }
    
    return rootNodes.slice(0, 8); // Limita a 8 tópicos principais
  }

  private async generateMermaidFromHierarchy(
    title: string,
    hierarchy: HierarchyNode[]
  ): Promise<string> {
    const hierarchyText = this.formatHierarchyForPrompt(hierarchy);

    const prompt = `Você é um especialista em mapas mentais educacionais.

TAREFA: Crie um mapa mental estruturado em sintaxe Mermaid a partir do conteúdo fornecido.

TÍTULO: ${title}

CONTEÚDO HIERARQUIZADO:
${hierarchyText}

REGRAS:
1. Use APENAS conceitos-chave (máximo 3-4 palavras por nó)
2. Organize em hierarquia lógica (máximo 4 níveis)
3. Use a sintaxe Mermaid mindmap correta
4. Limite a 25-30 nós totais
5. Priorize os conceitos mais importantes

EXEMPLO DE FORMATO:
mindmap
  root((Título Principal))
    Conceito 1
      Detalhe 1.1
      Detalhe 1.2
    Conceito 2
      Detalhe 2.1

IMPORTANTE: Retorne APENAS a sintaxe Mermaid, sem explicações adicionais.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const mermaidSyntax = response.choices[0]?.message?.content?.trim() || '';
    
    // Remove markdown code blocks se houver
    return mermaidSyntax
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  private async generateMermaidWithRAGContext(
    prompt: string,
    ragResults: any[]
  ): Promise<string> {
    const contextText = ragResults
      .slice(0, 10)
      .map((r, i) => `${i + 1}. ${r.content}`)
      .join('\n\n');

    const systemPrompt = `Você é um especialista em mapas mentais educacionais.

CONTEXTO DO MATERIAL DO ALUNO:
${contextText || 'Nenhum material encontrado na base de conhecimento.'}

TAREFA: Crie um mapa mental em sintaxe Mermaid sobre: "${prompt}"

REGRAS:
1. Se houver contexto disponível, USE-O como base
2. Organize conceitos de forma hierárquica e lógica
3. Use conceitos-chave (máximo 3-4 palavras por nó)
4. Máximo 4 níveis de profundidade
5. Limite a 25-30 nós totais

${ragResults.length === 0 ? 'ATENÇÃO: Não há material do aluno sobre este tema. Crie um mapa mental genérico básico.' : ''}

FORMATO (sintaxe Mermaid mindmap):
mindmap
  root((${prompt}))
    Conceito Principal 1
      Subtópico 1.1
      Subtópico 1.2
    Conceito Principal 2

Retorne APENAS a sintaxe Mermaid, sem explicações.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const mermaidSyntax = response.choices[0]?.message?.content?.trim() || '';
    
    return mermaidSyntax
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  private async generateMermaidFromPromptOnly(prompt: string): Promise<string> {
    const systemPrompt = `Crie um mapa mental educacional em sintaxe Mermaid sobre: "${prompt}"

REGRAS:
1. Use conceitos-chave (máximo 3-4 palavras por nó)
2. Organize de forma hierárquica e didática
3. Máximo 4 níveis de profundidade
4. Limite a 20-25 nós totais

FORMATO (sintaxe Mermaid):
mindmap
  root((${prompt}))
    Tópico 1
      Subtópico 1.1
    Tópico 2

Retorne APENAS a sintaxe Mermaid, sem explicações.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.5,
      max_tokens: 1200,
    });

    const mermaidSyntax = response.choices[0]?.message?.content?.trim() || '';
    
    return mermaidSyntax
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  private formatHierarchyForPrompt(hierarchy: HierarchyNode[]): string {
    let result = '';
    
    const formatNode = (node: HierarchyNode, indent: string = ''): void => {
      result += `${indent}${node.title}\n`;
      if (node.children.length > 0) {
        node.children.forEach(child => formatNode(child, indent + '  '));
      }
    };
    
    hierarchy.forEach(node => formatNode(node));
    
    return result;
  }
}

export const mindMapGenerator = new MindMapGenerator();
