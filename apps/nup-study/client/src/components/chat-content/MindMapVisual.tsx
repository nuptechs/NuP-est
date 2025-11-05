import { ReactFlow, Node, Edge, Background, Controls, MiniMap, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children?: MindMapNode[];
  color?: string;
  level?: number;
}

interface MindMapVisualProps {
  data: MindMapNode;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(347, 77%, 50%)',
  'hsl(199, 89%, 48%)',
];

function buildNodesAndEdges(
  root: MindMapNode,
  parentId: string | null = null,
  level: number = 0,
  x: number = 0,
  y: number = 0,
  horizontalSpacing: number = 300,
  verticalSpacing: number = 100,
  nodes: Node[] = [],
  edges: Edge[] = [],
  siblingIndex: number = 0,
  totalSiblings: number = 1
): { nodes: Node[]; edges: Edge[] } {
  const nodeId = root.id;
  const color = root.color || COLORS[level % COLORS.length];

  // Calculate position based on level and siblings
  let nodeX = x;
  let nodeY = y;

  if (level > 0) {
    // Spread children vertically
    const offset = (siblingIndex - (totalSiblings - 1) / 2) * verticalSpacing;
    nodeX = x + horizontalSpacing;
    nodeY = y + offset;
  }

  nodes.push({
    id: nodeId,
    type: 'default',
    position: { x: nodeX, y: nodeY },
    data: {
      label: (
        <div className="px-4 py-2 min-w-[150px] max-w-[250px]">
          <div className="font-semibold text-sm break-words">{root.label}</div>
          {root.description && (
            <div className="text-xs text-muted-foreground mt-1 break-words">
              {root.description}
            </div>
          )}
        </div>
      ),
    },
    style: {
      background: color,
      color: 'white',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      fontSize: level === 0 ? '16px' : '14px',
      fontWeight: level === 0 ? 'bold' : 'normal',
      boxShadow: level === 0 ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  if (parentId) {
    edges.push({
      id: `${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'smoothstep',
      animated: level === 1,
      style: { stroke: color, strokeWidth: 2 },
    });
  }

  if (root.children && root.children.length > 0) {
    root.children.forEach((child, index) => {
      buildNodesAndEdges(
        child,
        nodeId,
        level + 1,
        nodeX,
        nodeY,
        horizontalSpacing,
        verticalSpacing,
        nodes,
        edges,
        index,
        root.children!.length
      );
    });
  }

  return { nodes, edges };
}

export function MindMapVisual({ data }: MindMapVisualProps) {
  const [showMiniMap, setShowMiniMap] = useState(false);
  
  const { nodes, edges } = useMemo(() => {
    return buildNodesAndEdges(data);
  }, [data]);

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden bg-background">
      <div className="relative" style={{ height: '500px', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="#aaa" gap={16} />
          <Controls showInteractive={false} />
          {showMiniMap && (
            <MiniMap 
              nodeColor={(node) => node.style?.background as string || '#999'}
              maskColor="rgba(0, 0, 0, 0.05)"
              pannable
              zoomable
            />
          )}
        </ReactFlow>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMiniMap(!showMiniMap)}
          className="absolute top-3 right-3 z-10 bg-background/95 backdrop-blur shadow-md"
          data-testid="button-toggle-minimap"
        >
          <Map className="h-4 w-4 mr-2" />
          {showMiniMap ? 'Ocultar' : 'Mostrar'} Minimap
        </Button>
      </div>
      <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/30 border-t border-border">
        🧠 Mapa Mental • Use scroll para zoom • Arraste para navegar
      </div>
    </div>
  );
}
