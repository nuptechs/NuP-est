/**
 * MindMapViewer - Read-only inline mind map renderer
 * FASE 2: Embedded mind map viewer for flashcards
 * Features: Compact display, zoom/pan controls, performance optimized
 */

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MindMapNode } from "./nodes/MindMapNode";
import { Button } from "@nup/uibutton";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
import { toPng } from "html-to-image";

const nodeTypes = {
  mindMapNode: MindMapNode,
};

interface MindMapViewerProps {
  mindMapData: {
    nodes: any[];
    edges: any[];
    layout?: string;
    styleSheetId?: string | null;
  };
  height?: string;
  showControls?: boolean;
  showMinimap?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  onExport?: (dataUrl: string) => void;
}

function MindMapViewerContent({
  mindMapData,
  height = "400px",
  showControls = true,
  showMinimap = false,
  enableZoom = true,
  enablePan = true,
  onExport,
}: MindMapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(mindMapData.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(mindMapData.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Update nodes/edges when data changes
  useEffect(() => {
    setNodes(mindMapData.nodes || []);
    setEdges(mindMapData.edges || []);
  }, [mindMapData, setNodes, setEdges]);

  // Fit view on load
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [reactFlowInstance, nodes]);

  const handleExport = useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;

    try {
      const dataUrl = await toPng(viewport as HTMLElement, {
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      if (onExport) {
        onExport(dataUrl);
      } else {
        // Default: trigger download
        const link = document.createElement('a');
        link.download = `mindmap-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Failed to export mind map:', error);
    }
  }, [onExport]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  return (
    <div 
      className="mindmap-viewer-container relative rounded-lg border border-border overflow-hidden bg-background"
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={enablePan ? onNodesChange : undefined}
        onEdgesChange={enablePan ? onEdgesChange : undefined}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        zoomOnScroll={enableZoom}
        panOnDrag={enablePan}
        zoomOnDoubleClick={enableZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        className="mindmap-viewer"
      >
        <Background />
        
        {showControls && (
          <Panel position="top-right" className="flex gap-2 m-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleFitView}
              className="h-8 w-8"
              data-testid="button-fit-view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleExport}
              className="h-8 w-8"
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </Panel>
        )}

        {showMinimap && (
          <MiniMap
            className="bg-background border border-border"
            nodeColor={(node) => {
              const data = node.data as any;
              return data?.backgroundColor || "#cbd5e1";
            }}
          />
        )}
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <p>Nenhum mapa mental disponível</p>
        </div>
      )}
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function MindMapViewer(props: MindMapViewerProps) {
  return (
    <ReactFlowProvider>
      <MindMapViewerContent {...props} />
    </ReactFlowProvider>
  );
}
