import dagre from 'dagre';
import type { MindMapNode, MindMapEdge, LayoutAlgorithm } from '../core/types';
import { NODE_DIMENSIONS } from '../core/constants';

export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing?: number;
  levelSpacing?: number;
}

export function calculateLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: LayoutOptions
): MindMapNode[] {
  switch (options.algorithm) {
    case 'dagre':
      return calculateDagreLayout(nodes, edges, options);
    case 'tree':
      return calculateTreeLayout(nodes, edges, options);
    case 'elk':
      return calculateDagreLayout(nodes, edges, options);
    default:
      return nodes;
  }
}

function calculateDagreLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: LayoutOptions
): MindMapNode[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({
    rankdir: options.direction || 'TB',
    nodesep: options.nodeSpacing || 100,
    ranksep: options.levelSpacing || 150,
    align: 'UL',
  });

  nodes.forEach((node) => {
    const dimensions = NODE_DIMENSIONS[node.data.type] || NODE_DIMENSIONS.leaf;
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.data.type] || NODE_DIMENSIONS.leaf;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });
}

function calculateTreeLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: LayoutOptions
): MindMapNode[] {
  const rootNode = nodes.find((n) => n.data.type === 'root');
  if (!rootNode) return nodes;

  const adjacencyList = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const positions = new Map<string, { x: number; y: number }>();
  const levelSpacing = options.levelSpacing || 150;
  const nodeSpacing = options.nodeSpacing || 100;

  function layoutNode(
    nodeId: string,
    level: number,
    parentX: number,
    siblingIndex: number,
    siblingCount: number
  ): void {
    const y = level * levelSpacing;
    const totalWidth = (siblingCount - 1) * nodeSpacing;
    const startX = parentX - totalWidth / 2;
    const x = startX + siblingIndex * nodeSpacing;

    positions.set(nodeId, { x, y });

    const children = adjacencyList.get(nodeId) || [];
    children.forEach((childId, index) => {
      layoutNode(childId, level + 1, x, index, children.length);
    });
  }

  layoutNode(rootNode.id, 0, 0, 0, 1);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return {
        ...node,
        position: pos,
      };
    }
    return node;
  });
}
