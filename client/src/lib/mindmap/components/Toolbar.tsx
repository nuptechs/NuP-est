import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Upload,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import type { ExportFormat } from '../core/types';

interface ToolbarProps {
  onAddNode: () => void;
  onDeleteNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: ExportFormat) => void;
  onImport: () => void;
  onGenerateAI: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export function Toolbar({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  onExport,
  onImport,
  onGenerateAI,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo,
  canRedo,
  hasSelection,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddNode}
          data-testid="button-add-node"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Node
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteNode}
          disabled={!hasSelection}
          data-testid="button-delete-node"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          data-testid="button-undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          data-testid="button-redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          data-testid="button-fit-view"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateAI}
          data-testid="button-generate-ai"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          AI Generate
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Select onValueChange={(value) => onExport(value as ExportFormat)}>
          <SelectTrigger className="w-[140px] h-8" data-testid="select-export">
            <Download className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Export" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="mermaid">Mermaid</SelectItem>
            <SelectItem value="svg">SVG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onImport}
          data-testid="button-import"
        >
          <Upload className="w-4 h-4 mr-1" />
          Import
        </Button>
      </div>
    </div>
  );
}
