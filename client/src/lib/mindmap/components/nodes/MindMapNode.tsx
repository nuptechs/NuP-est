import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { MindMapNodeData } from '../../core/types';
import { useMindMapEngine } from '../../engine/MindMapEngine';
import { useStyleStore } from '../../store/useStyleStore';
import { getColorFromPalette } from '../../utils/hierarchyUtils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MindMapNodeProps extends NodeProps {
  data: MindMapNodeData;
}

export const MindMapNode = memo(({ id, data, selected }: MindMapNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const updateNode = useMindMapEngine((state) => state.updateNode);
  
  // Get style configuration from store
  const currentStyleSheet = useStyleStore((state) => state.currentStyleSheet);
  const getNodeStyle = useStyleStore((state) => state.getNodeStyle);

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

  // Compute final node style based on color mode
  const computedStyle = useCallback(() => {
    const colorMode = currentStyleSheet?.colorMode || 'type-based';
    
    // Get base style from store
    const baseNodeStyle = getNodeStyle(data.type, id);
    
    let backgroundColor: string;
    let textColor: string;
    let borderColor: string;
    
    // Performance-based coloring (adaptive learning) takes priority
    if (colorMode === 'performance-based' && data.performance) {
      switch (data.performance.mastery) {
        case 'high':
          backgroundColor = '#f0fdf4'; // emerald-50
          textColor = '#047857'; // emerald-700
          borderColor = '#34d399'; // emerald-400
          break;
        case 'medium':
          backgroundColor = '#fffbeb'; // amber-50
          textColor = '#b45309'; // amber-700
          borderColor = '#fbbf24'; // amber-400
          break;
        case 'low':
          backgroundColor = '#fef2f2'; // rose-50
          textColor = '#be123c'; // rose-700
          borderColor = '#fb7185'; // rose-400
          break;
        default:
          backgroundColor = baseNodeStyle.backgroundColor;
          textColor = baseNodeStyle.textColor;
          borderColor = baseNodeStyle.borderColor;
      }
    } else if (colorMode === 'level-based') {
      // Level-based: Use color palette by level
      const level = data.level || 0;
      const palette = currentStyleSheet?.colorPalette?.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      backgroundColor = getColorFromPalette(palette, level);
      textColor = level === 0 ? '#ffffff' : baseNodeStyle.textColor;
      borderColor = backgroundColor;
    } else if (colorMode === 'branch-based') {
      // Branch-based: Use color palette by branchId
      const branchId = data.branchId || id;
      const palette = currentStyleSheet?.colorPalette?.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      // Hash branchId to palette index for consistent colors
      const branchIndex = Array.from(branchId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      backgroundColor = getColorFromPalette(palette, branchIndex);
      textColor = data.level === 0 ? '#ffffff' : baseNodeStyle.textColor;
      borderColor = backgroundColor;
    } else {
      // Type-based (default): Use nodeStyles from style sheet
      backgroundColor = baseNodeStyle.backgroundColor;
      textColor = baseNodeStyle.textColor;
      borderColor = baseNodeStyle.borderColor;
    }
    
    return {
      backgroundColor,
      textColor,
      borderColor,
      borderWidth: baseNodeStyle.borderWidth,
      borderRadius: baseNodeStyle.borderRadius,
      fontSize: baseNodeStyle.fontSize,
      fontWeight: baseNodeStyle.fontWeight,
    };
  }, [currentStyleSheet, data.type, data.level, data.branchId, data.performance, id, getNodeStyle]);
  
  const nodeStyle = computedStyle();

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
      
      <div
        className={cn(
          'px-3 py-2 border transition-all duration-200 cursor-pointer inline-block',
          selected && 'ring-2 ring-blue-400 ring-offset-0',
          getShapeClass()
        )}
        style={{
          backgroundColor: nodeStyle.backgroundColor,
          borderColor: nodeStyle.borderColor,
          borderWidth: `${nodeStyle.borderWidth}px`,
          borderRadius: `${nodeStyle.borderRadius}px`,
        }}
      >
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
                color: nodeStyle.textColor,
                fontSize: `${nodeStyle.fontSize}px`,
                fontWeight: nodeStyle.fontWeight,
              }}
            />
          ) : (
            <div
              className="font-medium leading-tight"
              style={{
                fontSize: `${nodeStyle.fontSize}px`,
                fontWeight: nodeStyle.fontWeight,
                color: nodeStyle.textColor,
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
