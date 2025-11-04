import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { MindMapNode as MindMapNodeComponent } from './nodes/MindMapNode';
import { Toolbar } from './Toolbar';
import { StylePanel } from './StylePanel';
import { OutlineView } from './OutlineView';
import { 
  useMindMapEngine,
  useMindMapNodes,
  useMindMapEdges,
  useMindMapSelection,
  useMindMapHistory,
  useMindMapActions
} from '../engine/MindMapEngine';
import { useStyleStore } from '../store/useStyleStore';
import type { ExportFormat, MindMapConfig, MindMapData } from '../core/types';
import { mindMapAI } from '../ai/MindMapAI';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const nodeTypes = {
  mindMapNode: MindMapNodeComponent,
  default: MindMapNodeComponent,
};

interface MindMapEditorProps {
  title: string;
  config?: MindMapConfig;
  initialData?: MindMapData | null;
  onSave?: (data: any) => void;
  className?: string;
}

export function MindMapEditor({ title, config, initialData, onSave, className }: MindMapEditorProps) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [showMinimap, setShowMinimap] = useState(config?.showMinimap ?? false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showOutlineView, setShowOutlineView] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined);
  
  // Optimized selectors - only re-render when specific slices change
  const nodes = useMindMapNodes();
  const edges = useMindMapEdges();
  const selectedNodes = useMindMapSelection();
  const { canUndo, canRedo } = useMindMapHistory();
  
  // Actions never cause re-renders
  const {
    initializeMindMap,
    loadMindMap,
    addNode,
    deleteNode,
    updateNode,
    undo,
    redo,
    toggleFreeFormMode,
    applyLayout,
    exportData,
    selectNode,
    clearSelection,
    collapseNode,
    expandNode,
  } = useMindMapActions();
  
  const mindMap = useMindMapEngine((state) => state.mindMap);
  const freeFormMode = mindMap?.config?.freeForm ?? false;

  const initialized = useRef(false);
  
  // Filter out hidden nodes and edges (collapsed children)
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => !node.hidden);
  }, [nodes]);
  
  const visibleEdges = useMemo(() => {
    return edges.filter(edge => !edge.hidden);
  }, [edges]);
  
  // Apply style store to edges
  const getEdgeStyle = useStyleStore((state) => state.getEdgeStyle);
  const styledEdges = useMemo(() => {
    return visibleEdges.map(edge => {
      // getEdgeStyle now always returns complete EdgeStyle (uses DEFAULT_EDGE_STYLE as fallback in store)
      const edgeStyle = getEdgeStyle(edge.id);
      
      return {
        ...edge,
        type: edgeStyle.type,
        style: {
          ...edge.style,
          stroke: edge.crosslink ? 'hsl(var(--chart-2))' : edgeStyle.color, // Crosslinks in different color
          strokeWidth: edgeStyle.width,
          strokeDasharray: edge.crosslink ? '5,5' : undefined, // Dashed for crosslinks
        },
        animated: edgeStyle.animated,
        label: edge.label, // SimpleMind: Edge labels
        labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.85 },
        labelStyle: { fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 },
      };
    });
  }, [visibleEdges, getEdgeStyle]);

  useEffect(() => {
    if (!initialized.current) {
      if (initialData) {
        loadMindMap(initialData);
      } else {
        initializeMindMap(title, config);
      }
      initialized.current = true;
    }
  }, [title, config, initialData, initializeMindMap, loadMindMap]);

  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      // First fit the view
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        
        // Then apply auto-collapse after layout is complete
        setTimeout(() => {
          const engine = useMindMapEngine.getState();
          engine.autoCollapseBySize();
          
          console.log('[MindMapEditor] Auto-collapse applied', {
            totalNodes: nodes.length,
            visibleNodes: nodes.filter(n => !n.hidden).length,
            hiddenNodes: nodes.filter(n => n.hidden).length,
          });
          
          // Fit view again after collapse to show only visible nodes
          setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
          }, 100);
        }, 300);
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);

  const handleAddNode = useCallback(() => {
    if (selectedNodes.length === 1) {
      const newLabel = prompt('Enter node label:');
      if (newLabel) {
        addNode(selectedNodes[0], newLabel);
      }
    } else if (nodes.length === 0) {
      const newLabel = prompt('Enter root node label:');
      if (newLabel) {
        addNode(null, newLabel);
      }
    } else {
      toast({
        title: 'Selection required',
        description: 'Please select a parent node first',
        variant: 'destructive',
      });
    }
  }, [selectedNodes, nodes.length, addNode, toast]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodes.length > 0) {
      selectedNodes.forEach((nodeId) => deleteNode(nodeId));
      clearSelection();
    }
  }, [selectedNodes, deleteNode, clearSelection]);

  const handleGenerateAI = useCallback(async () => {
    const prompt = window.prompt('Digite o tópico para gerar um mapa mental:');
    if (!prompt) return;

    try {
      toast({
        title: 'Gerando...',
        description: 'A IA está criando seu mapa mental',
      });

      const mindMapData = await mindMapAI.generateFromPrompt({
        prompt,
        useRAG: true,
        maxDepth: 4,
        maxNodes: 30,
      });

      if (!mindMapData || !mindMapData.nodes || mindMapData.nodes.length === 0) {
        throw new Error('No mind map data generated');
      }

      useMindMapEngine.getState().loadMindMap(mindMapData);
      applyLayout();
      
      // Auto-collapse large generated maps for better initial view
      setTimeout(() => {
        useMindMapEngine.getState().autoCollapseBySize();
      }, 200);

      toast({
        title: 'Sucesso!',
        description: 'Mapa mental gerado com sucesso',
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Erro ao gerar',
        description: error instanceof Error ? error.message : 'Falha ao gerar mapa mental. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [applyLayout, toast]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      const data = exportData();
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'mermaid') {
        const mermaidSyntax = mindMapAI.generateMermaidSyntax(data);
        const blob = new Blob([mermaidSyntax], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.mmd`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'png' || format === 'svg') {
        if (!reactFlowWrapper.current) {
          throw new Error('React Flow wrapper not found');
        }

        toast({
          title: 'Exporting...',
          description: 'Generating image',
        });

        const imageExportFn = format === 'png' ? toPng : toSvg;
        const dataUrl = await imageExportFn(reactFlowWrapper.current, {
          backgroundColor: '#ffffff',
          width: reactFlowWrapper.current.offsetWidth,
          height: reactFlowWrapper.current.offsetHeight,
          quality: 1.0,
        });

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${title.replace(/\s+/g, '_')}.${format}`;
        a.click();
      }

      toast({
        title: 'Exported',
        description: `Mind map exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Could not export mind map',
        variant: 'destructive',
      });
    }
  }, [exportData, title, toast]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.mmd';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      try {
        const data = JSON.parse(text);
        useMindMapEngine.getState().loadMindMap(data);
        applyLayout();
        toast({
          title: 'Imported',
          description: 'Mind map imported successfully',
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid file format',
          variant: 'destructive',
        });
      }
    };
    input.click();
  }, [applyLayout, toast]);

  const handleSave = useCallback(async () => {
    const data = exportData();
    
    if (onSave) {
      await onSave(data);
    }
    
    toast({
      title: 'Saved',
      description: 'Mind map saved successfully',
    });
  }, [exportData, onSave, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if editing
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } 
      // Save
      else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } 
      // Delete node
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          e.preventDefault();
          handleDeleteNode();
        }
      }
      // Tab: Add child node (modern UX)
      else if (e.key === 'Tab' && selectedNodes.length === 1) {
        e.preventDefault();
        const label = prompt('Enter child node label:');
        if (label) {
          addNode(selectedNodes[0], label);
        }
      }
      // Enter: Add sibling node (modern UX)
      else if (e.key === 'Enter' && selectedNodes.length === 1) {
        e.preventDefault();
        const selectedNode = nodes.find(n => n.id === selectedNodes[0]);
        const parentEdge = edges.find(e => e.target === selectedNodes[0]);
        const label = prompt('Enter sibling node label:');
        if (label) {
          addNode(parentEdge?.source || null, label);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave, handleDeleteNode, selectedNodes, addNode, nodes, edges]);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }} data-testid="mindmap-editor">
      {!focusMode && (
        <Toolbar
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onUndo={undo}
          onRedo={redo}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          onGenerateAI={handleGenerateAI}
          onZoomIn={() => reactFlowInstance?.zoomIn()}
          onZoomOut={() => reactFlowInstance?.zoomOut()}
          onFitView={() => reactFlowInstance?.fitView()}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
          showMinimap={showMinimap}
          onToggleStylePanel={() => setShowStylePanel(!showStylePanel)}
          showStylePanel={showStylePanel}
          onToggleFocusMode={() => setFocusMode(!focusMode)}
          focusMode={focusMode}
          onToggleFreeForm={toggleFreeFormMode}
          freeFormMode={freeFormMode}
          onToggleOutlineView={() => setShowOutlineView(!showOutlineView)}
          showOutlineView={showOutlineView}
          onApplyAutoLayout={() => applyLayout()}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={selectedNodes.length > 0}
        />
      )}

      <div className="flex flex-col md:flex-row" style={{ height: focusMode ? '100%' : 'calc(100% - 64px)' }}>
        <div 
          ref={reactFlowWrapper} 
          className={cn(
            "relative",
            (showStylePanel || showOutlineView) && !focusMode ? "h-[60%] md:h-full" : "h-full"
          )}
          style={{ 
            width: (showStylePanel || showOutlineView) && !focusMode 
              ? `calc(100% - ${showStylePanel && showOutlineView ? 'min(640px, 70vw)' : 'min(320px, 35vw)'})` 
              : '100%',
          }}
        >
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg text-sm font-medium hover:bg-muted/80 transition-all duration-200"
            data-testid="button-exit-focus-mode"
          >
            Sair do Modo Foco
          </button>
        )}
        <ReactFlow
          nodes={visibleNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          className="bg-background"
          onNodesChange={(changes) => {
            // Handle selection/deselection
            changes.forEach((change) => {
              if (change.type === 'select') {
                if (change.selected) {
                  selectNode(change.id);
                } else {
                  // Clear from selection when deselected
                  const currentSelection = useMindMapEngine.getState().selectedNodes;
                  useMindMapEngine.setState({ 
                    selectedNodes: currentSelection.filter(nodeId => nodeId !== change.id)
                  });
                }
              }
            });
            // Apply all changes to ReactFlow state
            useMindMapEngine.getState().applyNodesChange(changes);
          }}
          onEdgesChange={(changes) => {
            // Handle edge selection
            changes.forEach((change) => {
              if (change.type === 'select') {
                if (change.selected) {
                  setSelectedEdgeId(change.id);
                } else if (selectedEdgeId === change.id) {
                  setSelectedEdgeId(undefined);
                }
              }
            });
            useMindMapEngine.getState().applyEdgesChange(changes);
          }}
          onConnect={(connection) => {
            if (connection.source && connection.target) {
              useMindMapEngine.getState().addEdge(connection);
            }
          }}
          fitView
          minZoom={0.1}
          maxZoom={2}
        >
          <Background 
            color="hsl(var(--border))" 
            gap={20} 
            size={0.5}
            className="opacity-30 dark:opacity-20"
          />
          {config?.showControls !== false && !focusMode && (
            <Controls 
              className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg"
            />
          )}
          {showMinimap && !focusMode && (
            <MiniMap 
              nodeColor={(node: any) => {
                if (node.data.performance) {
                  switch (node.data.performance.mastery) {
                    case 'high':
                      return '#10b981';
                    case 'medium':
                      return '#f59e0b';
                    case 'low':
                      return '#ef4444';
                    default:
                      return 'hsl(var(--muted))';
                  }
                }
                switch (node.data.type) {
                  case 'root':
                    return 'hsl(var(--primary))';
                  case 'branch':
                    return 'hsl(var(--muted-foreground))';
                  default:
                    return 'hsl(var(--muted))';
                }
              }}
              className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg"
              maskColor="hsl(var(--background) / 0.8)"
            />
          )}
          {!focusMode && (
            <Panel position="top-right">
              <div className="bg-background/95 backdrop-blur-sm border border-border px-4 py-2 rounded-xl text-sm text-muted-foreground shadow-md font-medium">
                {nodes.length} {nodes.length === 1 ? 'nó' : 'nós'}
              </div>
            </Panel>
          )}
        </ReactFlow>
        </div>
        
        {/* Outline View */}
        {showOutlineView && !focusMode && (
          <div className="w-full md:w-[320px] md:min-w-[320px] h-[40%] md:h-full">
            <OutlineView 
              onNodeClick={(nodeId) => {
                const node = nodes.find(n => n.id === nodeId);
                if (node && reactFlowInstance) {
                  reactFlowInstance.setCenter(
                    node.position.x + 50,
                    node.position.y + 25,
                    { zoom: 1.2, duration: 800 }
                  );
                }
              }}
            />
          </div>
        )}
        
        {/* Style Panel */}
        {showStylePanel && !focusMode && (
          <StylePanel 
            selectedNodeId={selectedNodes.length === 1 ? selectedNodes[0] : undefined}
            selectedEdgeId={selectedEdgeId}
          />
        )}
      </div>
    </div>
  );
}
