export function generateId(prefix = 'node'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateNodeId(): string {
  return generateId('node');
}

export function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}`;
}

export function generateMindMapId(): string {
  return generateId('mindmap');
}
