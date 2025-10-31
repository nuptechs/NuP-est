import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { MindMapNodeData } from '../../core/types';
import { useMindMapEngine } from '../../engine/MindMapEngine';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MindMapNodeProps extends NodeProps {
  data: MindMapNodeData;
}

export const MindMapNode = memo(({ id, data, selected }: MindMapNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const updateNode = useMindMapEngine((state) => state.updateNode);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (label !== data.label) {
      updateNode(id, { label });
    }
  }, [label, data.label, id, updateNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      // Commit changes on Enter
      if (label !== data.label) {
        updateNode(id, { label });
      }
    }
  }, [label, data.label, id, updateNode]);

  const getNodeStyle = () => {
    // SimpleMind-inspired: clean, minimal, elegant with solid backgrounds
    const baseStyle = 'px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer inline-block';
    
    // Performance-based colors (adaptive learning) - Solid backgrounds
    if (data.performance) {
      let performanceStyle = '';
      switch (data.performance.mastery) {
        case 'high':
          performanceStyle = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600';
          break;
        case 'medium':
          performanceStyle = 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-600';
          break;
        case 'low':
          performanceStyle = 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-600';
          break;
        default:
          performanceStyle = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
      }
      
      const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-0' : '';
      return cn(baseStyle, performanceStyle, selectedStyle);
    }
    
    // Default type-based styling - SimpleMind clean design with solid colors
    let typeStyle = '';
    switch (data.type) {
      case 'root':
        typeStyle = 'bg-blue-500 text-white border-blue-600 font-bold text-base';
        break;
      case 'branch':
        typeStyle = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 font-semibold';
        break;
      case 'leaf':
        typeStyle = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
        break;
    }

    const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-0' : '';
    
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
    <div className="relative" onDoubleClick={handleDoubleClick}>
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-2 !h-2"
      />
      
      <div className={cn(getNodeStyle(), getShapeClass())}>
        <div className="flex items-center gap-2 whitespace-nowrap">
          {data.collapsed !== undefined && (
            <button
              className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
              data-testid={`button-collapse-${data.label}`}
            >
              {data.collapsed ? (
                <ChevronRight className="w-3 h-3 opacity-50" />
              ) : (
                <ChevronDown className="w-3 h-3 opacity-50" />
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
              className="bg-transparent border-none outline-none focus:ring-0 font-medium min-w-[100px]"
              autoFocus
              data-testid={`input-node-label-${data.label}`}
              style={{
                width: `${Math.max(100, label.length * 8 + 20)}px`,
              }}
            />
          ) : (
            <div
              className="font-medium leading-tight"
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
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-2 !h-2"
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
