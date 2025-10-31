/**
 * Hierarchy Utilities
 * Calculate level and branch information for mind map nodes
 */

import type { MindMapNode, MindMapEdge } from '../core/types';

/**
 * Calculate hierarchical level for each node (0 = root, 1 = children of root, etc.)
 */
export function calculateNodeLevels(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): Map<string, number> {
  const levels = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();
  
  // Find root node (node with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target));
  const rootNode = nodes.find(n => !targetIds.has(n.id));
  
  if (!rootNode) {
    // No root found, assign level 0 to all
    nodes.forEach(n => levels.set(n.id, 0));
    return levels;
  }
  
  // Build parent-children map
  edges.forEach(edge => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  });
  
  // BFS to calculate levels
  const queue: Array<{ nodeId: string; level: number }> = [{ nodeId: rootNode.id, level: 0 }];
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    levels.set(nodeId, level);
    
    const children = childrenMap.get(nodeId) || [];
    children.forEach(childId => {
      queue.push({ nodeId: childId, level: level + 1 });
    });
  }
  
  return levels;
}

/**
 * Calculate branch ID for each node (all nodes inherit the ID of their root-level parent)
 * Root node has its own ID as branchId
 * First-level children become branch roots, all their descendants share their branchId
 */
export function calculateNodeBranches(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  levels: Map<string, number>
): Map<string, string> {
  const branches = new Map<string, string>();
  const parentMap = new Map<string, string>();
  
  // Build parent map
  edges.forEach(edge => {
    parentMap.set(edge.target, edge.source);
  });
  
  // Assign branch IDs
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    
    if (level === 0) {
      // Root node - its own branch
      branches.set(node.id, node.id);
    } else if (level === 1) {
      // First-level children - they are branch roots
      branches.set(node.id, node.id);
    } else {
      // Descendants - find their branch root (level 1 ancestor)
      let currentId = node.id;
      let currentLevel = level;
      
      while (currentLevel > 1) {
        const parentId = parentMap.get(currentId);
        if (!parentId) break;
        currentId = parentId;
        currentLevel = levels.get(currentId) || 0;
      }
      
      branches.set(node.id, currentId);
    }
  });
  
  return branches;
}

/**
 * Update node data with calculated hierarchy information
 */
export function enrichNodesWithHierarchy(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): MindMapNode[] {
  const levels = calculateNodeLevels(nodes, edges);
  const branches = calculateNodeBranches(nodes, edges, levels);
  
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      level: levels.get(node.id) || 0,
      branchId: branches.get(node.id) || node.id,
    },
  }));
}

/**
 * Get color from palette based on index (with wrap-around)
 */
export function getColorFromPalette(palette: string[], index: number): string {
  if (palette.length === 0) return '#3b82f6'; // Fallback blue
  return palette[index % palette.length];
}
