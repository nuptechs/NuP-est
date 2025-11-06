/**
 * OutlineTree Component
 * 
 * Displays hierarchical document structure with visual indentation
 */

import { ChevronRight, ChevronDown, FileText, BookOpen } from 'lucide-react';
import { useState } from 'react';
import type { DocumentOutlineNode } from '@shared/schema';
import { cn } from '@/lib/utils';

interface OutlineTreeProps {
  nodes: DocumentOutlineNode[];
  onNodeClick?: (node: DocumentOutlineNode) => void;
  selectedNodeId?: string;
  className?: string;
}

interface OutlineNodeItemProps {
  node: DocumentOutlineNode;
  depth: number;
  onNodeClick?: (node: DocumentOutlineNode) => void;
  selectedNodeId?: string;
}

function OutlineNodeItem({ node, depth, onNodeClick, selectedNodeId }: OutlineNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const indentClass = `pl-${Math.min(depth * 4, 12)}`;
  
  return (
    <div className="outline-node">
      <button
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          if (onNodeClick) {
            onNodeClick(node);
          }
        }}
        className={cn(
          "w-full flex items-center gap-2 py-2 px-3 text-left text-sm rounded-md transition-colors",
          indentClass,
          isSelected 
            ? "bg-primary/10 text-primary dark:bg-primary/20" 
            : "hover:bg-muted dark:hover:bg-muted/50",
          "group"
        )}
        data-testid={`outline-node-${node.id}`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
          
          {depth === 0 ? (
            <BookOpen className="h-4 w-4 flex-shrink-0 text-primary" />
          ) : (
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          
          <span className="font-medium truncate flex-1">{node.title}</span>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          {node.wordCount && (
            <span className="hidden sm:inline">{node.wordCount} palavras</span>
          )}
          {node.estimatedFlashcards && (
            <span className="bg-muted dark:bg-muted/50 px-2 py-0.5 rounded-full">
              ~{node.estimatedFlashcards} cards
            </span>
          )}
        </div>
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onNodeClick={onNodeClick}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineTree({ nodes, onNodeClick, selectedNodeId, className }: OutlineTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma estrutura detectada</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} data-testid="outline-tree">
      {nodes.map((node) => (
        <OutlineNodeItem
          key={node.id}
          node={node}
          depth={0}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
}
