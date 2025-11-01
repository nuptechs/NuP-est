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
  Map,
  Palette,
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
  onToggleMinimap?: () => void;
  showMinimap?: boolean;
  onToggleStylePanel?: () => void;
  showStylePanel?: boolean;
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
  onToggleMinimap,
  showMinimap,
  onToggleStylePanel,
  showStylePanel,
  canUndo,
  canRedo,
  hasSelection,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-card border-b border-border overflow-x-auto">
      <div className="flex items-center gap-0.5 sm:gap-1 border-r border-border pr-1 sm:pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddNode}
          data-testid="button-add-node"
          className="h-8 px-2"
          title="Adicionar nó filho ao nó selecionado"
        >
          <Plus className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteNode}
          disabled={!hasSelection}
          data-testid="button-delete-node"
          className="h-8 px-2"
          title="Deletar nó selecionado"
        >
          <Trash2 className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Deletar</span>
        </Button>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 border-r border-border pr-1 sm:pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          data-testid="button-undo"
          className="h-8 px-2"
          title="Desfazer"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          data-testid="button-redo"
          className="h-8 px-2"
          title="Refazer"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 border-r border-border pr-1 sm:pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          data-testid="button-zoom-in"
          className="h-8 px-2 hidden md:flex"
          title="Zoom +"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          data-testid="button-zoom-out"
          className="h-8 px-2 hidden md:flex"
          title="Zoom -"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          data-testid="button-fit-view"
          className="h-8 px-2"
          title="Ajustar visualização"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        {onToggleMinimap && (
          <Button
            variant={showMinimap ? "default" : "ghost"}
            size="sm"
            onClick={onToggleMinimap}
            data-testid="button-toggle-minimap"
            className="h-8 px-2 hidden lg:flex"
            title="Minimapa"
          >
            <Map className="w-4 h-4" />
          </Button>
        )}
        {onToggleStylePanel && (
          <Button
            variant={showStylePanel ? "default" : "ghost"}
            size="sm"
            onClick={onToggleStylePanel}
            data-testid="button-toggle-style-panel"
            className="h-8 px-2"
            title="Estilos"
          >
            <Palette className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 border-r border-border pr-1 sm:pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateAI}
          data-testid="button-generate-ai"
          className="h-8 px-2"
          title="Gerar mapa mental com IA"
        >
          <Sparkles className="w-4 h-4 sm:mr-1" />
          <span className="hidden lg:inline">Gerar IA</span>
        </Button>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <Select onValueChange={(value) => onExport(value as ExportFormat)}>
          <SelectTrigger className="w-[100px] sm:w-[140px] h-8" data-testid="select-export">
            <Download className="w-4 h-4 sm:mr-1" />
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
          className="h-8 px-2 hidden md:flex"
          title="Importar"
        >
          <Upload className="w-4 h-4 sm:mr-1" />
          <span className="hidden lg:inline">Import</span>
        </Button>
      </div>
    </div>
  );
}
