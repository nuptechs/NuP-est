// Mind Map types
export interface MindMap {
  id: string;
  userId: string;
  subjectId?: string | null;
  materialId?: string | null;
  title: string;
  description?: string | null;
  content: MindMapContent;
  generatedFromAI: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MindMapContent {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  config?: MindMapConfig;
}

export interface MindMapNode {
  id: string;
  data: {
    label: string;
    type?: 'root' | 'branch' | 'leaf';
    level?: number;
    [key: string]: any;
  };
  position: { x: number; y: number };
  [key: string]: any;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: any;
}

export interface MindMapConfig {
  [key: string]: any;
}
