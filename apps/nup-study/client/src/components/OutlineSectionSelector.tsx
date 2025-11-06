/**
 * OutlineSectionSelector Component
 * 
 * Allows users to select specific sections/chapters from document outline
 * with hierarchical checkbox selection
 */

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown, FileText, BookOpen, CheckSquare, Square } from 'lucide-react';
import type { DocumentOutlineNode } from '@shared/schema';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OutlineSectionSelectorProps {
  nodes: DocumentOutlineNode[];
  selectedSections: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
}

interface SectionNodeProps {
  node: DocumentOutlineNode;
  depth: number;
  selectedSections: string[];
  onToggle: (nodeId: string, includeChildren: boolean) => void;
}

function SectionNode({ node, depth, selectedSections, onToggle }: SectionNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedSections.includes(node.id);
  
  const allChildrenIds = hasChildren 
    ? getAllDescendantIds(node)
    : [];
  
  const allChildrenSelected = hasChildren 
    ? allChildrenIds.every(id => selectedSections.includes(id))
    : false;
    
  const someChildrenSelected = hasChildren
    ? allChildrenIds.some(id => selectedSections.includes(id)) && !allChildrenSelected
    : false;

  const indentClass = `pl-${Math.min(depth * 4, 12)}`;

  return (
    <div className="section-node">
      <div className={cn("flex items-center gap-2 py-2 px-3", indentClass)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-muted dark:hover:bg-muted/50 rounded"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
        </button>

        <Checkbox
          id={`section-${node.id}`}
          checked={isSelected || allChildrenSelected}
          onCheckedChange={(checked) => {
            onToggle(node.id, !!checked && hasChildren);
          }}
          className={cn(
            someChildrenSelected && "bg-primary/30 border-primary",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          )}
          data-testid={`checkbox-section-${node.id}`}
        />

        <label
          htmlFor={`section-${node.id}`}
          className="flex items-center gap-2 flex-1 cursor-pointer select-none min-w-0"
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {depth === 0 ? (
              <BookOpen className="h-4 w-4 flex-shrink-0 text-primary" />
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            
            <span className={cn(
              "text-sm truncate",
              isSelected && "font-medium text-primary dark:text-primary"
            )}>
              {node.title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            {node.estimatedFlashcards && node.estimatedFlashcards > 0 && (
              <Badge variant="secondary" className="text-xs">
                ~{node.estimatedFlashcards} cards
              </Badge>
            )}
          </div>
        </label>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <SectionNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedSections={selectedSections}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getAllDescendantIds(node: DocumentOutlineNode): string[] {
  const ids = [node.id];
  
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getAllDescendantIds(child));
    }
  }
  
  return ids;
}

function getAllNodeIds(nodes: DocumentOutlineNode[]): string[] {
  const ids: string[] = [];
  
  for (const node of nodes) {
    ids.push(...getAllDescendantIds(node));
  }
  
  return ids;
}

function getTotalEstimatedFlashcards(nodes: DocumentOutlineNode[], selectedIds: string[]): number {
  let total = 0;
  
  function traverse(node: DocumentOutlineNode) {
    if (selectedIds.includes(node.id) && node.estimatedFlashcards) {
      total += node.estimatedFlashcards;
    }
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  for (const node of nodes) {
    traverse(node);
  }
  
  return total;
}

export function OutlineSectionSelector({
  nodes,
  selectedSections,
  onSelectionChange,
  className
}: OutlineSectionSelectorProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedSections);

  useEffect(() => {
    setLocalSelection(selectedSections);
  }, [selectedSections]);

  const handleToggle = (nodeId: string, includeChildren: boolean) => {
    const newSelection = [...localSelection];
    const isCurrentlySelected = newSelection.includes(nodeId);

    if (isCurrentlySelected) {
      const index = newSelection.indexOf(nodeId);
      newSelection.splice(index, 1);
      
      if (includeChildren) {
        const node = findNodeById(nodes, nodeId);
        if (node) {
          const childIds = getAllDescendantIds(node).filter(id => id !== nodeId);
          childIds.forEach(id => {
            const idx = newSelection.indexOf(id);
            if (idx !== -1) {
              newSelection.splice(idx, 1);
            }
          });
        }
      }
    } else {
      newSelection.push(nodeId);
      
      if (includeChildren) {
        const node = findNodeById(nodes, nodeId);
        if (node) {
          const childIds = getAllDescendantIds(node).filter(id => id !== nodeId);
          childIds.forEach(id => {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          });
        }
      }
    }

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const allNodeIds = getAllNodeIds(nodes);
  const allSelected = allNodeIds.every(id => localSelection.includes(id));
  const estimatedCards = getTotalEstimatedFlashcards(nodes, localSelection);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
      setLocalSelection([]);
    } else {
      onSelectionChange(allNodeIds);
      setLocalSelection(allNodeIds);
    }
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma seção disponível</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="outline-section-selector">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 dark:bg-muted/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
            data-testid="button-select-all"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Desmarcar Tudo
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Selecionar Tudo
              </>
            )}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {localSelection.length} de {allNodeIds.length} seções
          </div>
        </div>

        {estimatedCards > 0 && (
          <Badge variant="default" className="text-sm">
            ~{estimatedCards} flashcards
          </Badge>
        )}
      </div>

      <div className="border dark:border-border rounded-lg p-2 max-h-[400px] overflow-y-auto">
        {nodes.map((node) => (
          <SectionNode
            key={node.id}
            node={node}
            depth={0}
            selectedSections={localSelection}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

function findNodeById(nodes: DocumentOutlineNode[], id: string): DocumentOutlineNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}
