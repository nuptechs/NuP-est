import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { MindMapNode, MindMapEdge, LayoutAlgorithm } from '../core/types';
import { NODE_DIMENSIONS } from '../core/constants';

const elk = new ELK();

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
): MindMapNode[] | Promise<MindMapNode[]> {
  switch (options.algorithm) {
    case 'dagre':
      return calculateDagreLayout(nodes, edges, options);
    case 'tree':
      return calculateTreeLayout(nodes, edges, options);
    case 'elk':
      return calculateElkLayout(nodes, edges, options);
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
    nodesep: options.nodeSpacing || 180,  // Increased from 100 to prevent overlap
    ranksep: options.levelSpacing || 250, // Increased from 150 for better vertical spacing
    align: 'UL',
    marginx: 40,  // Add margins to prevent edge clipping
    marginy: 40,
  });

  nodes.forEach((node) => {
    // Use measured dimensions if available, fallback to constants
    const measuredWidth = node.width || node.data.width;
    const measuredHeight = node.height || node.data.height;
    const dimensions = NODE_DIMENSIONS[node.data.type] || NODE_DIMENSIONS.leaf;
    
    // Add padding to prevent tight overlaps
    const width = (measuredWidth || dimensions.width) + 48;
    const height = (measuredHeight || dimensions.height) + 32;
    
    dagreGraph.setNode(node.id, {
      width,
      height,
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

async function calculateElkLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: LayoutOptions
): Promise<MindMapNode[]> {
  const isHorizontal = options.direction === 'LR' || options.direction === 'RL';
  
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'mrtree',  // Optimized for tree/mind map structures
      'elk.direction': options.direction === 'LR' ? 'RIGHT' : 
                      options.direction === 'RL' ? 'LEFT' : 
                      options.direction === 'BT' ? 'UP' : 'DOWN',
      'elk.spacing.nodeNode': String(options.nodeSpacing || 80),
      'elk.spacing.edgeNode': String(options.levelSpacing || 120),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(options.levelSpacing || 120),
      'elk.edgeRouting': 'POLYLINE',
    },
    children: nodes.map((node) => {
      const measuredWidth = node.width || node.data.width;
      const measuredHeight = node.height || node.data.height;
      const dimensions = NODE_DIMENSIONS[node.data.type] || NODE_DIMENSIONS.leaf;
      
      return {
        id: node.id,
        width: measuredWidth || dimensions.width,
        height: measuredHeight || dimensions.height,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    return nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      
      if (layoutedNode) {
        return {
          ...node,
          position: {
            x: layoutedNode.x || 0,
            y: layoutedNode.y || 0,
          },
          targetPosition: isHorizontal ? 'left' : 'top',
          sourcePosition: isHorizontal ? 'right' : 'bottom',
        };
      }
      
      return node;
    });
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Fallback to dagre on error
    return calculateDagreLayout(nodes, edges, options);
  }
}
