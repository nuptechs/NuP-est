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
    // SimpleMind-inspired: clean, minimal, elegant
    const baseStyle = 'px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer inline-block';
    
    // Performance-based colors (adaptive learning) - Cleaner palette
    if (data.performance) {
      let performanceStyle = '';
      switch (data.performance.mastery) {
        case 'high':
          performanceStyle = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 hover:border-emerald-500';
          break;
        case 'medium':
          performanceStyle = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/50 hover:border-amber-500';
          break;
        case 'low':
          performanceStyle = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/50 hover:border-rose-500';
          break;
        default:
          performanceStyle = 'bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400';
      }
      
      const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-1' : '';
      return cn(baseStyle, performanceStyle, selectedStyle);
    }
    
    // Default type-based styling - SimpleMind clean design
    let typeStyle = '';
    switch (data.type) {
      case 'root':
        typeStyle = 'bg-blue-500 text-white border-blue-600 font-bold text-base hover:bg-blue-600';
        break;
      case 'branch':
        typeStyle = 'bg-transparent text-slate-800 dark:text-slate-100 border-slate-400 dark:border-slate-500 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/30';
        break;
      case 'leaf':
        typeStyle = 'bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/20';
        break;
    }

    const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-1' : '';
    
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
