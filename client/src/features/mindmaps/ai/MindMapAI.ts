import type { MindMapData, AIGenerationOptions, MindMapNode, MindMapEdge } from '../core/types';
import { generateNodeId, generateEdgeId, generateMindMapId } from '../utils';
import { DEFAULT_CONFIG } from '../core/constants';

interface MermaidNode {
  id: string;
  label: string;
  children?: MermaidNode[];
}

export class MindMapAIService {
  private apiEndpoint = '/api/mindmaps/generate';
  private jobsEndpoint = '/api/mindmaps/jobs';

  /**
   * Create an async generation job (recommended - non-blocking with progress)
   * Returns a jobId that can be polled for status
   */
  async createGenerationJob(options: AIGenerationOptions): Promise<string> {
    try {
      const response = await fetch(this.jobsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'prompt',
          prompt: options.prompt,
          subjectId: options.subjectId,
          useRAG: options.useRAG ?? true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create generation job: ${errorText}`);
      }

      const data = await response.json();
      return data.jobId;
    } catch (error) {
      console.error('[MindMapAI] Error creating job:', error);
      throw error;
    }
  }

  /**
   * Create an async generation job from material
   */
  async createMaterialGenerationJob(materialId: string): Promise<string> {
    try {
      const response = await fetch(this.jobsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'material',
          materialId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create material generation job: ${errorText}`);
      }

      const data = await response.json();
      return data.jobId;
    } catch (error) {
      console.error('[MindMapAI] Error creating material job:', error);
      throw error;
    }
  }

  /**
   * Get job status and result
   */
  async getJobStatus(jobId: string): Promise<any> {
    const response = await fetch(`${this.jobsEndpoint}/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }

    return response.json();
  }

  /**
   * Legacy: Generate from prompt (synchronous - blocks until complete)
   * Use createGenerationJob for better UX with progress tracking
   */
  async generateFromPrompt(options: AIGenerationOptions): Promise<MindMapData> {
    try {
      console.log('[MindMapAI] Sending request with options:', options);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      console.log('[MindMapAI] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MindMapAI] Error response:', errorText);
        throw new Error(`Failed to generate mind map: ${errorText}`);
      }

      let data;
      try {
        const responseText = await response.text();
        console.log('[MindMapAI] Raw response text:', responseText.substring(0, 200));
        data = JSON.parse(responseText);
        console.log('[MindMapAI] Parsed data:', { hasMermaid: !!data.mermaid, mermaidLength: data.mermaid?.length });
      } catch (parseError) {
        console.error('[MindMapAI] JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (!data.mermaid || typeof data.mermaid !== 'string' || data.mermaid.trim().length === 0) {
        console.error('[MindMapAI] Invalid mermaid data received:', data);
        throw new Error('No mind map data generated from server');
      }

      const mindMapData = this.convertMermaidToMindMap(data.mermaid, options.prompt);
      console.log('[MindMapAI] Converted to mind map:', { nodeCount: mindMapData.nodes.length, edgeCount: mindMapData.edges.length });
      
      return mindMapData;
    } catch (error) {
      console.error('[MindMapAI] AI generation error:', error);
      throw error;
    }
  }

  async generateFromMaterial(materialId: string): Promise<MindMapData> {
    try {
      const response = await fetch(`/api/mindmaps/generate-from-material/${materialId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate mind map from material');
      }

      const data = await response.json();
      return this.convertMermaidToMindMap(data.mermaid, data.title || 'Generated Mind Map');
    } catch (error) {
      console.error('Material generation error:', error);
      throw error;
    }
  }

  private convertMermaidToMindMap(mermaidSyntax: string, title: string): MindMapData {
    const parsedTree = this.parseMermaidSyntax(mermaidSyntax);
    const { nodes, edges } = this.convertTreeToNodesEdges(parsedTree);

    return {
      id: generateMindMapId(),
      title,
      nodes,
      edges,
      config: DEFAULT_CONFIG,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    };
  }

  private parseMermaidSyntax(syntax: string): MermaidNode {
    const lines = syntax
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('mindmap') && !line.trim().startsWith('```'));

    const root: MermaidNode = {
      id: 'root',
      label: 'Root',
      children: [],
    };

    const stack: { node: MermaidNode; indent: number }[] = [{ node: root, indent: -1 }];

    lines.forEach((line) => {
      const indent = line.search(/\S/);
      const content = line.trim()
        .replace(/^root\(\(/, '')
        .replace(/\)\)$/, '')
        .replace(/^\(/, '')
        .replace(/\)$/, '')
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .replace(/^::icon\(.*\)\s*/, '');

      const newNode: MermaidNode = {
        id: generateNodeId(),
        label: content,
        children: [],
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        const parent = stack[stack.length - 1].node;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(newNode);
      }

      stack.push({ node: newNode, indent });
    });

    return root.children && root.children.length > 0 ? root.children[0] : root;
  }

  private convertTreeToNodesEdges(
    tree: MermaidNode,
    parentId: string | null = null,
    level = 0
  ): { nodes: MindMapNode[]; edges: MindMapEdge[] } {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    const node: MindMapNode = {
      id: tree.id,
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        label: tree.label,
        type: level === 0 ? 'root' : level === 1 ? 'branch' : 'leaf',
        shape: 'rounded',
      },
    };

    nodes.push(node);

    if (parentId) {
      edges.push({
        id: generateEdgeId(parentId, tree.id),
        source: parentId,
        target: tree.id,
        type: 'bezier',  // Bezier for smooth curves
      });
    }

    if (tree.children && tree.children.length > 0) {
      tree.children.forEach((child) => {
        const { nodes: childNodes, edges: childEdges } = this.convertTreeToNodesEdges(
          child,
          tree.id,
          level + 1
        );
        nodes.push(...childNodes);
        edges.push(...childEdges);
      });
    }

    return { nodes, edges };
  }

  generateMermaidSyntax(mindMap: MindMapData): string {
    const rootNode = mindMap.nodes.find((n) => n.data.type === 'root');
    if (!rootNode) return '';

    let mermaid = 'mindmap\n';
    mermaid += `  root((${rootNode.data.label}))\n`;

    const buildTree = (nodeId: string, indent: number): string => {
      const children = mindMap.edges
        .filter((e) => e.source === nodeId)
        .map((e) => mindMap.nodes.find((n) => n.id === e.target))
        .filter((n): n is MindMapNode => n !== undefined);

      return children
        .map((child) => {
          const indentation = '  '.repeat(indent);
          let line = `${indentation}${child.data.label}\n`;
          line += buildTree(child.id, indent + 1);
          return line;
        })
        .join('');
    };

    mermaid += buildTree(rootNode.id, 2);

    return mermaid;
  }
}

export const mindMapAI = new MindMapAIService();
