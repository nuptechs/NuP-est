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
  Focus,
  Workflow,
  Save,
  Move,
  List,
} from 'lucide-react';
import type { ExportFormat } from '../core/types';

interface ToolbarProps {
  onAddNode: () => void;
  onDeleteNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
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
  onToggleFocusMode?: () => void;
  focusMode?: boolean;
  onToggleFreeForm?: () => void;
  freeFormMode?: boolean;
  onToggleOutlineView?: () => void;
  showOutlineView?: boolean;
  onApplyAutoLayout?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export function Toolbar({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  onSave,
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
  onToggleFocusMode,
  focusMode,
  onToggleFreeForm,
  freeFormMode,
  onToggleOutlineView,
  showOutlineView,
  onApplyAutoLayout,
  canUndo,
  canRedo,
  hasSelection,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
      {/* Left section: Primary actions */}
      <div className="flex items-center gap-1.5">
        {onSave && (
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            data-testid="button-save"
            className="h-9 px-3 rounded-lg transition-all duration-200 bg-primary hover:bg-primary/90"
            title="Salvar mapa mental (Ctrl+S)"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span className="text-sm font-medium">Salvar</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddNode}
          data-testid="button-add-node"
          className="h-9 px-3 rounded-lg hover:bg-primary/10 transition-all duration-200"
          title="Adicionar nó filho ao nó selecionado"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="text-sm font-medium hidden sm:inline">Adicionar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteNode}
          disabled={!hasSelection}
          data-testid="button-delete-node"
          className="h-9 px-3 rounded-lg hover:bg-destructive/10 disabled:opacity-40 transition-all duration-200"
          title="Deletar nó selecionado"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          <span className="text-sm font-medium hidden sm:inline">Deletar</span>
        </Button>
      </div>

      {/* Center section: Edit & View actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          data-testid="button-undo"
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 disabled:opacity-40 transition-all duration-200"
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
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 disabled:opacity-40 transition-all duration-200"
          title="Refazer"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1.5" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          data-testid="button-zoom-in"
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 hidden md:flex transition-all duration-200"
          title="Ampliar"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          data-testid="button-zoom-out"
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 hidden md:flex transition-all duration-200"
          title="Reduzir"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          data-testid="button-fit-view"
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 transition-all duration-200"
          title="Ajustar visualização"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        
        {onToggleMinimap && (
          <Button
            variant={showMinimap ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleMinimap}
            data-testid="button-toggle-minimap"
            className="h-9 w-9 p-0 rounded-lg hidden lg:flex transition-all duration-200"
            title="Minimapa"
          >
            <Map className="w-4 h-4" />
          </Button>
        )}
        
        {onToggleOutlineView && (
          <Button
            variant={showOutlineView ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleOutlineView}
            data-testid="button-toggle-outline"
            className="h-9 w-9 p-0 rounded-lg transition-all duration-200"
            title="Visão em Lista"
          >
            <List className="w-4 h-4" />
          </Button>
        )}
        
        {onToggleStylePanel && (
          <Button
            variant={showStylePanel ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleStylePanel}
            data-testid="button-toggle-style-panel"
            className="h-9 w-9 p-0 rounded-lg transition-all duration-200"
            title="Painel de estilos"
          >
            <Palette className="w-4 h-4" />
          </Button>
        )}
        
        {onToggleFreeForm && (
          <Button
            variant={freeFormMode ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleFreeForm}
            data-testid="button-toggle-freeform"
            className="h-9 w-9 p-0 rounded-lg transition-all duration-200"
            title={freeFormMode ? "Modo livre ativo - posicione nós manualmente" : "Ativar modo livre - arrastar sem auto-layout"}
          >
            <Move className="w-4 h-4" />
          </Button>
        )}
        
        {onApplyAutoLayout && !freeFormMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onApplyAutoLayout}
            data-testid="button-auto-layout"
            className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 hidden lg:flex transition-all duration-200"
            title="Reorganizar automaticamente"
          >
            <Workflow className="w-4 h-4" />
          </Button>
        )}
        
        {onToggleFocusMode && (
          <Button
            variant={focusMode ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleFocusMode}
            data-testid="button-focus-mode"
            className="h-9 w-9 p-0 rounded-lg transition-all duration-200"
            title="Modo de foco"
          >
            <Focus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Right section: AI & Export */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateAI}
          data-testid="button-generate-ai"
          className="h-9 px-3 rounded-lg hover:bg-primary/10 transition-all duration-200"
          title="Gerar mapa mental com IA"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          <span className="text-sm font-medium hidden lg:inline">Gerar IA</span>
        </Button>
        
        <div className="w-px h-6 bg-border mx-1.5" />
        
        <Select onValueChange={(value) => onExport(value as ExportFormat)}>
          <SelectTrigger className="w-[100px] sm:w-[120px] h-9 rounded-lg border-border/50" data-testid="select-export">
            <Download className="w-4 h-4 mr-1.5" />
            <SelectValue placeholder="Exportar" />
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
          className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80 hidden md:flex transition-all duration-200"
          title="Importar"
        >
          <Upload className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
