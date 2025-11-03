import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, Edit2 } from 'lucide-react';
import { useMindMapNodes, useMindMapActions } from '../engine/MindMapEngine';
import { cn } from '@/lib/utils';
import type { MindMapNode } from '../core/types';

interface OutlineItemProps {
  node: MindMapNode;
  children: MindMapNode[];
  level: number;
  onNodeClick: (nodeId: string) => void;
}

function OutlineItem({ node, children, level, onNodeClick }: OutlineItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { updateNode } = useMindMapActions();
  const hasChildren = children.length > 0;

  return (
    <div className="outline-item">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all",
          "group"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => onNodeClick(node.id)}
        data-testid={`outline-item-${node.data.label}`}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
            data-testid={`button-outline-toggle-${node.data.label}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 opacity-60" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60" />
            )}
          </button>
        )}

        {!hasChildren && <div className="w-5" />}

        {node.data.type !== 'root' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateNode(node.id, { checked: !node.data.checked });
            }}
            className="p-0.5 hover:bg-muted rounded"
            data-testid={`button-outline-checkbox-${node.data.label}`}
          >
            {node.data.checked ? (
              <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Square className="w-4 h-4 opacity-40" />
            )}
          </button>
        )}

        {node.data.icon && (
          <span className="text-sm">{node.data.icon}</span>
        )}

        <span 
          className={cn(
            "flex-1 text-sm font-medium",
            node.data.type === 'root' && "text-base font-semibold",
            node.data.checked && "line-through opacity-60"
          )}
        >
          {node.data.label}
        </span>

        <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>

      {hasChildren && isExpanded && (
        <div className="outline-children">
          {children.map(child => (
            <OutlineItemWithChildren
              key={child.id}
              nodeId={child.id}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OutlineItemWithChildrenProps {
  nodeId: string;
  level: number;
  onNodeClick: (nodeId: string) => void;
}

function OutlineItemWithChildren({ nodeId, level, onNodeClick }: OutlineItemWithChildrenProps) {
  const nodes = useMindMapNodes();
  const node = nodes.find(n => n.id === nodeId);
  const children = useMemo(
    () => nodes.filter(n => n.parentId === nodeId),
    [nodes, nodeId]
  );

  if (!node) return null;

  return (
    <OutlineItem
      node={node}
      children={children}
      level={level}
      onNodeClick={onNodeClick}
    />
  );
}

interface OutlineViewProps {
  onNodeClick?: (nodeId: string) => void;
}

export function OutlineView({ onNodeClick }: OutlineViewProps) {
  const nodes = useMindMapNodes();
  const { selectNode } = useMindMapActions();

  const rootNode = useMemo(() => nodes.find(n => n.data.type === 'root'), [nodes]);

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
    onNodeClick?.(nodeId);
  };

  if (!rootNode) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Nenhum mapa mental carregado</p>
      </div>
    );
  }

  return (
    <div 
      className="outline-view h-full overflow-y-auto p-4 bg-background border-l border-border"
      data-testid="outline-view"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Visão em Lista
        </h3>
      </div>
      
      <OutlineItemWithChildren
        nodeId={rootNode.id}
        level={0}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
