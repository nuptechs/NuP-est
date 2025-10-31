/**
 * Style Panel - SimpleMind-inspired customization panel
 * Allows users to choose style sheets and customize individual elements
 */

import { useState } from 'react';
import { Palette, Circle, Square, Hexagon, Minus, Plus, Type, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStyleStore, useStyleActions, useCurrentStyleSheet } from '../store/useStyleStore';
import { getBuiltInStyleSheets, getStyleSheetsForTheme } from '../core/builtInStyleSheets';
import type { NodeShape, EdgeType, BorderStyle } from '../core/styles';

interface StylePanelProps {
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

export function StylePanel({ selectedNodeId, selectedEdgeId }: StylePanelProps) {
  const [activeTab, setActiveTab] = useState<'sheets' | 'nodes' | 'edges'>('sheets');
  const currentSheet = useCurrentStyleSheet();
  const isDarkMode = useStyleStore((state) => state.isDarkMode);
  const actions = useStyleActions();
  
  const allStyleSheets = getBuiltInStyleSheets();
  const themeStyleSheets = getStyleSheetsForTheme(isDarkMode);
  
  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Estilos</h3>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'sheets'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-style-sheets"
          >
            Temas
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'nodes'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-nodes"
          >
            Nós
          </button>
          <button
            onClick={() => setActiveTab('edges')}
            className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'edges'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-edges"
          >
            Linhas
          </button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === 'sheets' && <StyleSheetsTab />}
          {activeTab === 'nodes' && <NodesTab selectedNodeId={selectedNodeId} />}
          {activeTab === 'edges' && <EdgesTab selectedEdgeId={selectedEdgeId} />}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={actions.reset}
          data-testid="button-reset-styles"
        >
          Resetar para Padrão
        </Button>
      </div>
    </div>
  );
}

// ===== STYLE SHEETS TAB =====
function StyleSheetsTab() {
  const currentSheet = useCurrentStyleSheet();
  const isDarkMode = useStyleStore((state) => state.isDarkMode);
  const actions = useStyleActions();
  const themeStyleSheets = getStyleSheetsForTheme(isDarkMode);
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Tema Atual</Label>
        <p className="text-sm text-muted-foreground mb-3">{currentSheet?.description}</p>
      </div>
      
      <Separator />
      
      <div>
        <Label className="text-sm font-medium mb-2 block">Temas Disponíveis</Label>
        <div className="grid gap-2">
          {themeStyleSheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => actions.setStyleSheetById(sheet.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                currentSheet?.id === sheet.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              data-testid={`style-sheet-${sheet.id}`}
            >
              <div className="flex items-start gap-3">
                {/* Preview */}
                <div className="flex gap-1 mt-1">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: sheet.nodeStyles.root.backgroundColor }}
                  />
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: sheet.nodeStyles.branch.backgroundColor }}
                  />
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: sheet.nodeStyles.leaf.backgroundColor }}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{sheet.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {sheet.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== NODES TAB =====
function NodesTab({ selectedNodeId }: { selectedNodeId?: string }) {
  const currentSheet = useCurrentStyleSheet();
  
  if (!selectedNodeId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Selecione um nó para personalizar
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Personalização do Nó</Label>
        <p className="text-xs text-muted-foreground">
          Customize a aparência deste nó específico
        </p>
      </div>
      
      <Separator />
      
      {/* Node Shape */}
      <div className="space-y-2">
        <Label className="text-sm">Forma</Label>
        <Select defaultValue="rounded">
          <SelectTrigger data-testid="select-node-shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rounded">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Arredondado
              </div>
            </SelectItem>
            <SelectItem value="rectangle">
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4" />
                Retângulo
              </div>
            </SelectItem>
            <SelectItem value="circle">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Círculo
              </div>
            </SelectItem>
            <SelectItem value="hexagon">
              <div className="flex items-center gap-2">
                <Hexagon className="w-4 h-4" />
                Hexágono
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Colors */}
      <div className="space-y-2">
        <Label className="text-sm">Cores</Label>
        <div className="grid grid-cols-3 gap-2">
          <ColorPicker label="Fundo" defaultColor="#ffffff" />
          <ColorPicker label="Borda" defaultColor="#cbd5e1" />
          <ColorPicker label="Texto" defaultColor="#0f172a" />
        </div>
      </div>
      
      {/* Border Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Espessura da Borda</Label>
          <span className="text-xs text-muted-foreground">2px</span>
        </div>
        <Slider
          defaultValue={[2]}
          min={0}
          max={10}
          step={1}
          className="w-full"
          data-testid="slider-border-width"
        />
      </div>
      
      {/* Border Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Arredondamento</Label>
          <span className="text-xs text-muted-foreground">12px</span>
        </div>
        <Slider
          defaultValue={[12]}
          min={0}
          max={50}
          step={1}
          className="w-full"
          data-testid="slider-border-radius"
        />
      </div>
      
      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tamanho do Texto</Label>
          <span className="text-xs text-muted-foreground">14px</span>
        </div>
        <Slider
          defaultValue={[14]}
          min={10}
          max={32}
          step={1}
          className="w-full"
          data-testid="slider-font-size"
        />
      </div>
      
      {/* Font Weight */}
      <div className="space-y-2">
        <Label className="text-sm">Peso da Fonte</Label>
        <Select defaultValue="normal">
          <SelectTrigger data-testid="select-font-weight">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="semibold">Semi-negrito</SelectItem>
            <SelectItem value="bold">Negrito</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ===== EDGES TAB =====
function EdgesTab({ selectedEdgeId }: { selectedEdgeId?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Estilo das Linhas</Label>
        <p className="text-xs text-muted-foreground">
          {selectedEdgeId ? 'Personalize esta linha específica' : 'Estilo padrão para todas as linhas'}
        </p>
      </div>
      
      <Separator />
      
      {/* Edge Type */}
      <div className="space-y-2">
        <Label className="text-sm">Tipo de Linha</Label>
        <Select defaultValue="smoothstep">
          <SelectTrigger data-testid="select-edge-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="smoothstep">Curva Suave</SelectItem>
            <SelectItem value="straight">Reta</SelectItem>
            <SelectItem value="step">Angular</SelectItem>
            <SelectItem value="bezier">Bezier</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Line Color */}
      <div className="space-y-2">
        <Label className="text-sm">Cor da Linha</Label>
        <ColorPicker label="" defaultColor="#94a3b8" fullWidth />
      </div>
      
      {/* Line Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Espessura da Linha</Label>
          <span className="text-xs text-muted-foreground">2px</span>
        </div>
        <Slider
          defaultValue={[2]}
          min={1}
          max={10}
          step={1}
          className="w-full"
          data-testid="slider-line-width"
        />
      </div>
      
      {/* Animated */}
      <div className="flex items-center justify-between">
        <Label className="text-sm">Animação</Label>
        <button
          className="w-11 h-6 rounded-full bg-muted relative transition-colors data-[checked=true]:bg-primary"
          data-checked={false}
          data-testid="toggle-animated"
        >
          <div className="w-4 h-4 rounded-full bg-white absolute top-1 left-1 transition-transform data-[checked=true]:translate-x-5" />
        </button>
      </div>
    </div>
  );
}

// ===== COLOR PICKER COMPONENT =====
function ColorPicker({ label, defaultColor, fullWidth = false }: { label: string; defaultColor: string; fullWidth?: boolean }) {
  const [color, setColor] = useState(defaultColor);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`h-10 rounded-lg border border-border hover:border-primary/50 transition-colors ${fullWidth ? 'w-full' : ''}`}
          data-testid={`color-picker-${label.toLowerCase()}`}
        >
          <div className="flex items-center gap-2 px-3">
            <div
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: color }}
            />
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <Label className="text-sm">Escolha uma cor</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-32 rounded cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            placeholder="#000000"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
