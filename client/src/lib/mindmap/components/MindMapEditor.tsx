import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MindMapNode as MindMapNodeComponent } from './nodes/MindMapNode';
import { Toolbar } from './Toolbar';
import { useMindMapEngine } from '../engine/MindMapEngine';
import type { ExportFormat, MindMapConfig } from '../core/types';
import { mindMapAI } from '../ai/MindMapAI';
import { useToast } from '@/hooks/use-toast';

const nodeTypes = {
  default: MindMapNodeComponent,
};

interface MindMapEditorProps {
  title: string;
  config?: MindMapConfig;
  onSave?: (data: any) => void;
  className?: string;
}

export function MindMapEditor({ title, config, onSave, className }: MindMapEditorProps) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const {
    nodes,
    edges,
    selectedNodes,
    history,
    historyIndex,
    initializeMindMap,
    addNode,
    deleteNode,
    updateNode,
    undo,
    redo,
    applyLayout,
    exportData,
    selectNode,
    clearSelection,
    collapseNode,
    expandNode,
  } = useMindMapEngine();

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initializeMindMap(title, config);
      initialized.current = true;
    }
  }, [title, config, initializeMindMap]);

  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
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
    const prompt = window.prompt('Enter a topic to generate a mind map:');
    if (!prompt) return;

    try {
      toast({
        title: 'Generating...',
        description: 'AI is creating your mind map',
      });

      const mindMapData = await mindMapAI.generateFromPrompt({
        prompt,
        useRAG: true,
        maxDepth: 4,
        maxNodes: 30,
      });

      useMindMapEngine.getState().loadMindMap(mindMapData);
      applyLayout();

      toast({
        title: 'Success',
        description: 'Mind map generated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate mind map',
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
        const response = await fetch('/api/mindmaps/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, format }),
        });
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Exported',
        description: `Mind map exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          e.preventDefault();
          handleDeleteNode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave, handleDeleteNode, selectedNodes]);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }} data-testid="mindmap-editor">
      <Toolbar
        onAddNode={handleAddNode}
        onDeleteNode={handleDeleteNode}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onImport={handleImport}
        onGenerateAI={handleGenerateAI}
        onZoomIn={() => reactFlowInstance?.zoomIn()}
        onZoomOut={() => reactFlowInstance?.zoomOut()}
        onFitView={() => reactFlowInstance?.fitView()}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasSelection={selectedNodes.length > 0}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {
          changes.forEach((change) => {
            if (change.type === 'select' && change.selected) {
              selectNode(change.id);
            }
          });
        }}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        {config?.showControls !== false && <Controls />}
        {config?.showMinimap !== false && (
          <MiniMap nodeColor={(node: any) => {
            switch (node.data.type) {
              case 'root':
                return 'hsl(var(--primary))';
              case 'branch':
                return 'hsl(var(--secondary))';
              default:
                return 'hsl(var(--muted))';
            }
          }} />
        )}
        <Panel position="top-right">
          <div className="bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-muted-foreground">
            {nodes.length} nodes
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
