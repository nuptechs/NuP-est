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
    const baseStyle = 'px-5 py-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-lg';
    
    // Performance-based colors (adaptive learning) - Modern palette
    if (data.performance) {
      let performanceStyle = '';
      switch (data.performance.mastery) {
        case 'high':
          performanceStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700 shadow-emerald-100 dark:shadow-emerald-900/20';
          break;
        case 'medium':
          performanceStyle = 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-900/20';
          break;
        case 'low':
          performanceStyle = 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700 shadow-rose-100 dark:shadow-rose-900/20';
          break;
        default:
          performanceStyle = 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      }
      
      const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-2 shadow-xl scale-105' : 'shadow-md';
      return cn(baseStyle, performanceStyle, selectedStyle);
    }
    
    // Default type-based styling - Modern, clean design
    let typeStyle = '';
    switch (data.type) {
      case 'root':
        typeStyle = 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 font-bold text-lg min-w-[220px] shadow-lg shadow-blue-500/30';
        break;
      case 'branch':
        typeStyle = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 font-semibold min-w-[180px] shadow-md';
        break;
      case 'leaf':
        typeStyle = 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 min-w-[150px] shadow-sm';
        break;
    }

    const selectedStyle = selected ? 'ring-2 ring-blue-400 ring-offset-2 shadow-xl scale-105' : '';
    
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
        className="!bg-blue-400 !w-2 !h-2 !border-2 !border-white hover:!w-3 hover:!h-3 transition-all"
      />
      
      <div className="flex items-center gap-2">
        {data.collapsed !== undefined && (
          <button
            className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
            data-testid={`button-collapse-${data.label}`}
          >
            {data.collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
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
            className="bg-transparent border-none outline-none focus:ring-0 w-full font-medium"
            autoFocus
            data-testid={`input-node-label-${data.label}`}
          />
        ) : (
          <div
            className="font-medium leading-relaxed"
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
        className="!bg-blue-400 !w-2 !h-2 !border-2 !border-white hover:!w-3 hover:!h-3 transition-all"
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
