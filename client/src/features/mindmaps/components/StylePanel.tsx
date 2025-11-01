/**
 * Style Panel - SimpleMind-inspired customization panel
 * Allows users to choose style sheets and customize individual elements
 */

import { useState, useEffect } from 'react';
import { Palette, Circle, Square, Hexagon, Minus, Plus, Type, Shuffle, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStyleStore, useStyleActions, useCurrentStyleSheet } from '../store/useStyleStore';
import { getBuiltInStyleSheets, getStyleSheetsForTheme } from '../core/builtInStyleSheets';
import { useMindMapEngine } from '../engine/MindMapEngine';
import type { NodeShape, EdgeType, BorderStyle } from '../core/styles';
import type { LayoutAlgorithm } from '../core/types';

interface StylePanelProps {
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

export function StylePanel({ selectedNodeId, selectedEdgeId }: StylePanelProps) {
  const [activeTab, setActiveTab] = useState<'sheets' | 'nodes' | 'edges' | 'layout'>('sheets');
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
          <h3 className="font-semibold text-lg">Estilos & Layout</h3>
        </div>
        
        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
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
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
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
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'edges'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-edges"
          >
            Linhas
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'layout'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-layout"
          >
            Layout
          </button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === 'sheets' && <StyleSheetsTab />}
          {activeTab === 'nodes' && <NodesTab selectedNodeId={selectedNodeId} />}
          {activeTab === 'edges' && <EdgesTab selectedEdgeId={selectedEdgeId} />}
          {activeTab === 'layout' && <LayoutTab />}
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

// ===== LAYOUT TAB =====
function LayoutTab() {
  const mindMap = useMindMapEngine((state) => state.mindMap);
  const currentLayout = mindMap?.config?.layout || 'dagre';
  const applyLayout = useMindMapEngine((state) => state.applyLayout);
  
  const handleLayoutChange = (newLayout: LayoutAlgorithm) => {
    // Update config in mind map
    if (mindMap) {
      useMindMapEngine.setState({
        mindMap: {
          ...mindMap,
          config: { ...mindMap.config, layout: newLayout }
        }
      });
    }
    // Apply the new layout
    applyLayout();
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Algoritmo de Layout</Label>
        <p className="text-xs text-muted-foreground">
          Escolha como organizar automaticamente os nós
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <Label className="text-sm">Algoritmo</Label>
        <Select value={currentLayout} onValueChange={(value) => handleLayoutChange(value as LayoutAlgorithm)}>
          <SelectTrigger data-testid="select-layout-algorithm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dagre">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                <div>
                  <div className="font-medium">Dagre (Padrão)</div>
                  <div className="text-xs text-muted-foreground">Layout hierárquico equilibrado</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="elk">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                <div>
                  <div className="font-medium">ELK</div>
                  <div className="text-xs text-muted-foreground">Layout avançado com menos cruzamentos</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="tree">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                <div>
                  <div className="font-medium">Tree</div>
                  <div className="text-xs text-muted-foreground">Árvore vertical clássica</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Separator />
      
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => applyLayout()}
        data-testid="button-apply-layout"
      >
        <Workflow className="w-4 h-4 mr-2" />
        Reorganizar Agora
      </Button>
    </div>
  );
}

// ===== NODES TAB =====
function NodesTab({ selectedNodeId }: { selectedNodeId?: string }) {
  const actions = useStyleActions();
  const elementStyles = useStyleStore((state) => state.elementCustomStyles);
  const currentStyles = selectedNodeId ? elementStyles.get(selectedNodeId)?.node : undefined;
  
  const [shape, setShape] = useState<NodeShape>(currentStyles?.shape || 'rounded');
  const [bgColor, setBgColor] = useState(currentStyles?.backgroundColor || '#ffffff');
  const [borderColor, setBorderColor] = useState(currentStyles?.borderColor || '#cbd5e1');
  const [textColor, setTextColor] = useState(currentStyles?.textColor || '#0f172a');
  const [borderWidth, setBorderWidth] = useState(currentStyles?.borderWidth || 2);
  const [borderRadius, setBorderRadius] = useState(currentStyles?.borderRadius || 12);
  const [fontSize, setFontSize] = useState(currentStyles?.fontSize || 14);
  const [fontWeight, setFontWeight] = useState<string>(currentStyles?.fontWeight || 'normal');
  
  // Sync local state when selected node changes (always reset, even if no custom styles)
  useEffect(() => {
    setShape(currentStyles?.shape || 'rounded');
    setBgColor(currentStyles?.backgroundColor || '#ffffff');
    setBorderColor(currentStyles?.borderColor || '#cbd5e1');
    setTextColor(currentStyles?.textColor || '#0f172a');
    setBorderWidth(currentStyles?.borderWidth || 2);
    setBorderRadius(currentStyles?.borderRadius || 12);
    setFontSize(currentStyles?.fontSize || 14);
    setFontWeight(currentStyles?.fontWeight || 'normal');
  }, [selectedNodeId, currentStyles]);
  
  if (!selectedNodeId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Selecione um nó para personalizar
      </div>
    );
  }
  
  const updateNodeStyle = (updates: any) => {
    actions.setElementCustomStyle(selectedNodeId, {
      node: {
        ...currentStyles,
        ...updates
      }
    });
  };
  
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
        <Select 
          value={shape} 
          onValueChange={(value) => {
            setShape(value as NodeShape);
            updateNodeStyle({ shape: value });
          }}
        >
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
          <ColorPicker 
            label="Fundo" 
            color={bgColor}
            onChange={(color) => {
              setBgColor(color);
              updateNodeStyle({ backgroundColor: color });
            }}
          />
          <ColorPicker 
            label="Borda" 
            color={borderColor}
            onChange={(color) => {
              setBorderColor(color);
              updateNodeStyle({ borderColor: color });
            }}
          />
          <ColorPicker 
            label="Texto" 
            color={textColor}
            onChange={(color) => {
              setTextColor(color);
              updateNodeStyle({ textColor: color });
            }}
          />
        </div>
      </div>
      
      {/* Border Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Espessura da Borda</Label>
          <span className="text-xs text-muted-foreground">{borderWidth}px</span>
        </div>
        <Slider
          value={[borderWidth]}
          onValueChange={([value]) => {
            setBorderWidth(value);
            updateNodeStyle({ borderWidth: value });
          }}
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
          <span className="text-xs text-muted-foreground">{borderRadius}px</span>
        </div>
        <Slider
          value={[borderRadius]}
          onValueChange={([value]) => {
            setBorderRadius(value);
            updateNodeStyle({ borderRadius: value });
          }}
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
          <span className="text-xs text-muted-foreground">{fontSize}px</span>
        </div>
        <Slider
          value={[fontSize]}
          onValueChange={([value]) => {
            setFontSize(value);
            updateNodeStyle({ fontSize: value });
          }}
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
        <Select 
          value={fontWeight}
          onValueChange={(value) => {
            setFontWeight(value);
            updateNodeStyle({ fontWeight: value });
          }}
        >
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
  const actions = useStyleActions();
  const elementStyles = useStyleStore((state) => state.elementCustomStyles);
  const currentStyles = selectedEdgeId ? elementStyles.get(selectedEdgeId)?.edge : undefined;
  
  const [edgeType, setEdgeType] = useState<EdgeType>(currentStyles?.type || 'smoothstep');
  const [color, setColor] = useState(currentStyles?.color || '#94a3b8');
  const [width, setWidth] = useState(currentStyles?.width || 2);
  const [animated, setAnimated] = useState(currentStyles?.animated || false);
  
  // Sync local state when selected edge changes (always reset, even if no custom styles)
  useEffect(() => {
    setEdgeType(currentStyles?.type || 'smoothstep');
    setColor(currentStyles?.color || '#94a3b8');
    setWidth(currentStyles?.width || 2);
    setAnimated(currentStyles?.animated || false);
  }, [selectedEdgeId, currentStyles]);
  
  const updateEdgeStyle = (updates: any) => {
    if (selectedEdgeId) {
      actions.setElementCustomStyle(selectedEdgeId, {
        edge: {
          ...currentStyles,
          ...updates
        }
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Estilo das Linhas</Label>
        <p className="text-xs text-muted-foreground">
          {selectedEdgeId ? 'Personalize esta linha específica' : 'Selecione uma linha para personalizar'}
        </p>
      </div>
      
      <Separator />
      
      {selectedEdgeId ? (
        <>
          {/* Edge Type */}
          <div className="space-y-2">
            <Label className="text-sm">Tipo de Linha</Label>
            <Select 
              value={edgeType}
              onValueChange={(value) => {
                setEdgeType(value as EdgeType);
                updateEdgeStyle({ type: value });
              }}
            >
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
            <ColorPicker 
              label="" 
              color={color}
              onChange={(newColor) => {
                setColor(newColor);
                updateEdgeStyle({ color: newColor });
              }}
              fullWidth 
            />
          </div>
          
          {/* Line Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Espessura da Linha</Label>
              <span className="text-xs text-muted-foreground">{width}px</span>
            </div>
            <Slider
              value={[width]}
              onValueChange={([value]) => {
                setWidth(value);
                updateEdgeStyle({ width: value });
              }}
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
              onClick={() => {
                setAnimated(!animated);
                updateEdgeStyle({ animated: !animated });
              }}
              className="w-11 h-6 rounded-full bg-muted relative transition-colors data-[checked=true]:bg-primary"
              data-checked={animated}
              data-testid="toggle-animated"
            >
              <div 
                className="w-4 h-4 rounded-full bg-white absolute top-1 left-1 transition-transform data-[checked=true]:translate-x-5"
                data-checked={animated}
              />
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Selecione uma linha para personalizar
        </div>
      )}
    </div>
  );
}

// ===== COLOR PICKER COMPONENT =====
function ColorPicker({ 
  label, 
  color,
  onChange,
  fullWidth = false 
}: { 
  label: string; 
  color: string;
  onChange: (color: string) => void;
  fullWidth?: boolean;
}) {
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
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-32 rounded cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            placeholder="#000000"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
