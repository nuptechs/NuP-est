import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { MindMapNodeData } from '../../core/types';
import { useMindMapEngine } from '../../engine/MindMapEngine';
import { useStyleStore, useNodeStyle } from '../../store/useStyleStore';
import { getColorFromPalette } from '../../utils/hierarchyUtils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, Target, GitBranch, FileText, Award, TrendingUp, AlertCircle } from 'lucide-react';

interface MindMapNodeProps extends NodeProps {
  data: MindMapNodeData;
}

export const MindMapNode = memo(({ id, data, selected }: MindMapNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [label, setLabel] = useState(data.label);
  const updateNode = useMindMapEngine((state) => state.updateNode);
  const addNode = useMindMapEngine((state) => state.addNode);
  const collapseNode = useMindMapEngine((state) => state.collapseNode);
  const expandNode = useMindMapEngine((state) => state.expandNode);
  const edges = useMindMapEngine((state) => state.edges);
  
  // Check if node has children
  const hasChildren = edges.some(edge => edge.source === id);
  
  // Get style configuration from store with proper memoization
  const currentStyleSheet = useStyleStore((state) => state.currentStyleSheet);
  const baseNodeStyle = useNodeStyle(data.type, id);

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

  const handleAddChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Generate auto label based on number of children
    const childrenCount = useMindMapEngine.getState().edges.filter(edge => edge.source === id).length;
    const newLabel = `Novo ${childrenCount + 1}`;
    addNode(id, newLabel);
  }, [id, addNode]);

  // Compute final node style based on color mode
  const computedStyle = useCallback(() => {
    const colorMode = currentStyleSheet?.colorMode || 'type-based';
    
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
      shape: baseNodeStyle.shape,
    };
  }, [currentStyleSheet, data.type, data.level, data.branchId, data.performance, baseNodeStyle]);
  
  const nodeStyle = computedStyle();

  const getShapeClass = () => {
    switch (nodeStyle.shape) {
      case 'circle':
        return 'rounded-full min-w-[100px] aspect-square flex items-center justify-center p-3';
      case 'ellipse':
        return 'rounded-full min-w-[120px] px-6';
      case 'hexagon':
        // Perfect hexagon with flat top/bottom
        return '[clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] min-w-[100px] aspect-square flex items-center justify-center p-3';
      case 'diamond':
        // Perfect diamond/rhombus
        return '[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)] min-w-[100px] aspect-square flex items-center justify-center p-3';
      case 'rectangle':
        return 'rounded-none min-w-[80px]';
      case 'pill':
        return 'rounded-full min-w-[100px] px-5';
      case 'parallelogram':
        // Professional parallelogram with 15° skew
        return '[clip-path:polygon(20%_0%,100%_0%,80%_100%,0%_100%)] min-w-[120px] px-6';
      case 'trapezoid':
        // Isosceles trapezoid
        return '[clip-path:polygon(15%_0%,85%_0%,100%_100%,0%_100%)] min-w-[120px] px-5';
      case 'octagon':
        // Regular octagon
        return '[clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)] min-w-[100px] aspect-square flex items-center justify-center p-3';
      case 'star':
        // 5-pointed star with better proportions
        return '[clip-path:polygon(50%_0%,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)] min-w-[110px] aspect-square flex items-center justify-center p-4';
      case 'rounded':
      default:
        return 'rounded-lg min-w-[80px]';
    }
  };
  
  const getBorderRadiusStyle = () => {
    // Only apply borderRadius for shapes that actually need the inline style
    // Circle, ellipse, and pill use Tailwind's rounded-full which is always 9999px
    const shapesWithBorderRadius = ['rounded', 'rectangle'];
    if (shapesWithBorderRadius.includes(nodeStyle.shape)) {
      return { borderRadius: `${nodeStyle.borderRadius}px` };
    }
    return {};
  };

  const getTypeIcon = () => {
    switch (data.type) {
      case 'root':
        return <Target className="w-3.5 h-3.5 opacity-70" />;
      case 'branch':
        return <GitBranch className="w-3.5 h-3.5 opacity-70" />;
      case 'leaf':
        return <FileText className="w-3.5 h-3.5 opacity-70" />;
      default:
        return null;
    }
  };

  const getPerformanceBadge = () => {
    if (!data.performance) return null;
    
    const { mastery, accuracy } = data.performance;
    
    if (mastery === 'high') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-md" title={`Domínio: Alto${accuracy ? ` (${Math.round(accuracy)}%)` : ''}`}>
          <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
      );
    } else if (mastery === 'medium') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 dark:bg-amber-500/30 rounded-md" title={`Domínio: Médio${accuracy ? ` (${Math.round(accuracy)}%)` : ''}`}>
          <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        </div>
      );
    } else if (mastery === 'low') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 dark:bg-rose-500/30 rounded-md" title={`Domínio: Baixo${accuracy ? ` (${Math.round(accuracy)}%)` : ''}`}>
          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div 
      className="relative group" 
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-2 !h-2"
      />
      
      <div
        className={cn(
          'px-4 py-2.5 border transition-all duration-300 cursor-grab active:cursor-grabbing',
          'shadow-sm hover:shadow-md',
          selected && 'ring-2 ring-primary ring-offset-2 shadow-lg scale-105',
          isHovered && !selected && 'shadow-md',
          getShapeClass()
        )}
        style={{
          backgroundColor: nodeStyle.backgroundColor,
          borderColor: nodeStyle.borderColor,
          borderWidth: `${nodeStyle.borderWidth}px`,
          ...getBorderRadiusStyle(),
        }}
      >
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          {hasChildren && (
            <button
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-all duration-200 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (data.collapsed) {
                  expandNode(id);
                } else {
                  collapseNode(id);
                }
              }}
              data-testid={`button-collapse-${data.label}`}
              title={data.collapsed ? "Expandir" : "Recolher"}
            >
              {data.collapsed ? (
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              )}
            </button>
          )}
          
          {getTypeIcon()}
          
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
              className="font-medium leading-snug tracking-tight"
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
          
          {getPerformanceBadge()}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-2 !h-2"
      />

      {/* Add child button - always visible on mobile, hover on desktop */}
      <button
        onClick={handleAddChild}
        className={cn(
          "absolute -bottom-5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 z-10",
          // Mobile (<md): always visible (opacity-100)
          // Desktop (md+): visible only on hover
          "opacity-100 md:opacity-0",
          isHovered && "md:opacity-100"
        )}
        data-testid={`button-add-child-${data.label}`}
        title="Adicionar nó filho"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
