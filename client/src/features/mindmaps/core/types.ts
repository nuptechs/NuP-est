import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

export type NodeType = 'root' | 'branch' | 'leaf';
export type NodeShape = 'rectangle' | 'rounded' | 'circle' | 'hexagon' | 'diamond';
export type LayoutAlgorithm = 'dagre' | 'elk' | 'tree';
export type ExportFormat = 'json' | 'mermaid' | 'svg' | 'png' | 'pdf';

export interface MindMapNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  shape?: NodeShape;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  collapsed?: boolean;
  level?: number; // Hierarchical level (0 = root, 1 = first level children, etc.)
  branchId?: string; // ID of the root branch this node belongs to
  checked?: boolean; // SimpleMind: Checkbox to mark concept as studied
  icon?: string; // SimpleMind: Icon/emoji for the node
  tags?: string[]; // SimpleMind: Tags for categorization
  metadata?: Record<string, any>;
  performance?: {
    mastery: 'high' | 'medium' | 'low' | 'none';
    accuracy?: number;
    questionsAnswered?: number;
  };
}

export interface MindMapNode extends ReactFlowNode {
  data: MindMapNodeData;
}

export interface MindMapEdge extends ReactFlowEdge {
  animated?: boolean;
  style?: Record<string, any>;
  label?: string; // SimpleMind: Label describing the relationship
  crosslink?: boolean; // SimpleMind: True if this is a crosslink (not hierarchical)
}

export interface MindMapTheme {
  name: string;
  root: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  branch: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  leaf: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  edge: {
    stroke: string;
    strokeWidth: number;
  };
}

export interface MindMapConfig {
  theme?: MindMapTheme;
  layout?: LayoutAlgorithm;
  freeForm?: boolean; // SimpleMind-style: Allow free positioning without auto-layout
  nodeSpacing?: number;
  levelSpacing?: number;
  editable?: boolean;
  showMinimap?: boolean;
  showControls?: boolean;
  enableUndo?: boolean;
  autoSave?: boolean;
  maxUndoSteps?: number;
}

export interface MindMapData {
  id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  config?: MindMapConfig;
  metadata?: {
    userId?: string;
    subjectId?: string;
    materialId?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: number;
  };
}

export interface AIGenerationOptions {
  prompt: string;
  subjectId?: string;
  materialId?: string;
  useRAG?: boolean;
  maxDepth?: number;
  maxNodes?: number;
  model?: 'gpt-4o-mini' | 'deepseek-r1';
}

export interface MindMapExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  imageQuality?: number;
  backgroundColor?: string;
}

export interface MindMapEvent {
  type: 'node:add' | 'node:update' | 'node:delete' | 'edge:add' | 'edge:delete' | 'save' | 'export';
  payload: any;
  timestamp: number;
}

export type MindMapEventListener = (event: MindMapEvent) => void;

export interface IMindMapService {
  create(title: string, config?: MindMapConfig): MindMapData;
  load(id: string): Promise<MindMapData | null>;
  save(mindMap: MindMapData): Promise<void>;
  delete(id: string): Promise<void>;
  export(mindMap: MindMapData, options: MindMapExportOptions): Promise<Blob | string>;
  import(data: string | File, format: ExportFormat): Promise<MindMapData>;
  generateFromAI(options: AIGenerationOptions): Promise<MindMapData>;
  generateFromMaterial(materialId: string): Promise<MindMapData>;
}
