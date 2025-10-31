import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { MindMapNodeData } from '../../core/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MindMapNodeProps extends NodeProps {
  data: MindMapNodeData;
}

export const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (label !== data.label) {
      data.label = label;
    }
  }, [label, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
    }
  }, []);

  const getNodeStyle = () => {
    const baseStyle = 'px-4 py-2 rounded-lg border-2 transition-all duration-200 shadow-md';
    
    let typeStyle = '';
    switch (data.type) {
      case 'root':
        typeStyle = 'bg-primary text-primary-foreground border-primary font-bold text-lg min-w-[200px]';
        break;
      case 'branch':
        typeStyle = 'bg-secondary text-secondary-foreground border-border font-semibold min-w-[160px]';
        break;
      case 'leaf':
        typeStyle = 'bg-card text-card-foreground border-border min-w-[140px]';
        break;
    }

    const selectedStyle = selected ? 'ring-2 ring-primary ring-offset-2' : '';
    
    return cn(baseStyle, typeStyle, selectedStyle);
  };

  const getShapeClass = () => {
    switch (data.shape) {
      case 'circle':
        return 'rounded-full aspect-square flex items-center justify-center';
      case 'hexagon':
        return 'clip-hexagon';
      case 'diamond':
        return 'rotate-45';
      case 'rectangle':
        return 'rounded-none';
      default:
        return 'rounded-lg';
    }
  };

  return (
    <div className={cn(getNodeStyle(), getShapeClass())} onDoubleClick={handleDoubleClick}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border !w-3 !h-3"
      />
      
      <div className="flex items-center gap-2">
        {data.collapsed !== undefined && (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
            }}
            data-testid={`button-collapse-${data.label}`}
          >
            {data.collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
        
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none focus:ring-0 w-full"
            autoFocus
            data-testid={`input-node-label-${data.label}`}
          />
        ) : (
          <div
            className="text-center whitespace-nowrap"
            style={{
              fontSize: data.fontSize || 14,
              color: data.color,
            }}
            data-testid={`text-node-label-${data.label}`}
          >
            {data.label}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border !w-3 !h-3"
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
