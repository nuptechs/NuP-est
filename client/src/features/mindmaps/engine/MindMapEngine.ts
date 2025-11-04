import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type {
  MindMapNode,
  MindMapEdge,
  MindMapData,
  MindMapConfig,
  NodeType,
} from '../core/types';
import { DEFAULT_CONFIG } from '../core/constants';
import { generateNodeId, generateEdgeId, generateMindMapId } from '../utils';
import { calculateLayout } from './layout';
import { enrichNodesWithHierarchy } from '../utils/hierarchyUtils';

interface MindMapEngineState {
  mindMap: MindMapData | null;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodes: string[];
  history: { nodes: MindMapNode[]; edges: MindMapEdge[] }[];
  historyIndex: number;
  
  initializeMindMap: (title: string, config?: MindMapConfig) => void;
  loadMindMap: (mindMap: MindMapData) => void;
  
  addNode: (parentId: string | null, label: string, type?: NodeType) => string;
  updateNode: (id: string, updates: Partial<MindMapNode['data']>) => void;
  deleteNode: (id: string) => void;
  
  addEdge: (connection: Connection) => void;
  deleteEdge: (id: string) => void;
  
  applyNodesChange: (changes: NodeChange[]) => void;
  applyEdgesChange: (changes: EdgeChange[]) => void;
  
  selectNode: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  collapseNode: (id: string) => void;
  expandNode: (id: string) => void;
  autoCollapseBySize: () => void;
  
  toggleFreeFormMode: () => void;
  applyLayout: () => void;
  
  undo: () => void;
  redo: () => void;
  
  exportData: () => MindMapData;
}

export const useMindMapEngine = create<MindMapEngineState>((set, get) => ({
  mindMap: null,
  nodes: [],
  edges: [],
  selectedNodes: [],
  history: [],
  historyIndex: -1,

  initializeMindMap: (title: string, config?: MindMapConfig) => {
    const rootNode: MindMapNode = {
      id: generateNodeId(),
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        label: title,
        type: 'root',
        shape: 'rounded',
      },
    };

    const mindMap: MindMapData = {
      id: generateMindMapId(),
      title,
      nodes: [rootNode],
      edges: [],
      config: { ...DEFAULT_CONFIG, ...config },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    };

    set({
      mindMap,
      nodes: [rootNode],
      edges: [],
      history: [{ nodes: [rootNode], edges: [] }],
      historyIndex: 0,
    });
  },

  loadMindMap: (mindMap: MindMapData) => {
    // CRITICAL: Preserve hidden/collapsed state from database
    // Map comes pre-collapsed from backend, don't call applyLayout which loses this state
    const { nodes, edges } = mindMap;
    
    // Only enrich with hierarchy WITHOUT calling calculateLayout
    // This preserves the hidden/collapsed flags from database
    const enrichedNodes = enrichNodesWithHierarchy(nodes, edges);
    
    set({
      mindMap,
      nodes: enrichedNodes,
      edges: mindMap.edges,
      history: [{ nodes: enrichedNodes, edges: mindMap.edges }],
      historyIndex: 0,
    });
  },

  addNode: (parentId: string | null, label: string, type?: NodeType) => {
    const { nodes, edges } = get();
    const newNodeId = generateNodeId();
    
    const inferredType: NodeType = type || (parentId ? (nodes.find(n => n.id === parentId)?.data.type === 'root' ? 'branch' : 'leaf') : 'root');
    
    const newNode: MindMapNode = {
      id: newNodeId,
      type: 'default',
      position: { x: 100, y: 100 },
      data: {
        label,
        type: inferredType,
        shape: 'rounded',
        isNew: true, // Mark as newly created for auto-focus
      },
    };

    const newNodes = [...nodes, newNode];
    const newEdges = parentId
      ? [...edges, {
          id: generateEdgeId(parentId, newNodeId),
          source: parentId,
          target: newNodeId,
          type: 'smoothstep',
        }]
      : edges;

    set({
      nodes: newNodes,
      edges: newEdges,
      history: [...get().history.slice(0, get().historyIndex + 1), { nodes: newNodes, edges: newEdges }],
      historyIndex: get().historyIndex + 1,
    });

    get().applyLayout();
    
    return newNodeId;
  },

  updateNode: (id: string, updates: Partial<MindMapNode['data']>) => {
    const { nodes } = get();
    const newNodes = nodes.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    );

    set({
      nodes: newNodes,
      history: [...get().history.slice(0, get().historyIndex + 1), { nodes: newNodes, edges: get().edges }],
      historyIndex: get().historyIndex + 1,
    });
  },

  deleteNode: (id: string) => {
    const { nodes, edges } = get();
    
    const nodesToDelete = new Set([id]);
    const findChildren = (nodeId: string) => {
      edges.forEach((edge) => {
        if (edge.source === nodeId && !nodesToDelete.has(edge.target)) {
          nodesToDelete.add(edge.target);
          findChildren(edge.target);
        }
      });
    };
    findChildren(id);

    const newNodes = nodes.filter((node) => !nodesToDelete.has(node.id));
    const newEdges = edges.filter(
      (edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
    );

    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodes: get().selectedNodes.filter((nodeId) => !nodesToDelete.has(nodeId)),
      history: [...get().history.slice(0, get().historyIndex + 1), { nodes: newNodes, edges: newEdges }],
      historyIndex: get().historyIndex + 1,
    });
    
    // Re-apply layout to recalculate hierarchy after node deletion
    get().applyLayout();
  },

  addEdge: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const { edges } = get();
    const newEdge: MindMapEdge = {
      id: generateEdgeId(connection.source, connection.target),
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
    };

    const newEdges = [...edges, newEdge];
    set({
      edges: newEdges,
      history: [...get().history.slice(0, get().historyIndex + 1), { nodes: get().nodes, edges: newEdges }],
      historyIndex: get().historyIndex + 1,
    });

    get().applyLayout();
  },

  applyNodesChange: (changes: NodeChange[]) => {
    const newNodes = applyNodeChanges(changes, get().nodes) as MindMapNode[];
    
    // Check if this is a position change (drag) - if so, add to history
    const hasPositionChange = changes.some(c => c.type === 'position' && c.dragging === false);
    
    if (hasPositionChange) {
      set({
        nodes: newNodes,
        history: [...get().history.slice(0, get().historyIndex + 1), { nodes: newNodes, edges: get().edges }],
        historyIndex: get().historyIndex + 1,
      });
    } else {
      set({ nodes: newNodes });
    }
  },

  applyEdgesChange: (changes: EdgeChange[]) => {
    const newEdges = applyEdgeChanges(changes, get().edges) as MindMapEdge[];
    set({ edges: newEdges });
    
    // Re-apply layout to recalculate hierarchy when edges change
    get().applyLayout();
  },

  deleteEdge: (id: string) => {
    const { edges } = get();
    const newEdges = edges.filter((edge) => edge.id !== id);

    set({
      edges: newEdges,
      history: [...get().history.slice(0, get().historyIndex + 1), { nodes: get().nodes, edges: newEdges }],
      historyIndex: get().historyIndex + 1,
    });
    
    // Re-apply layout to recalculate hierarchy (level, branchId)
    get().applyLayout();
  },

  selectNode: (id: string, multiSelect = false) => {
    const { selectedNodes } = get();
    
    if (multiSelect) {
      const newSelection = selectedNodes.includes(id)
        ? selectedNodes.filter((nodeId) => nodeId !== id)
        : [...selectedNodes, id];
      set({ selectedNodes: newSelection });
    } else {
      set({ selectedNodes: [id] });
    }
  },

  clearSelection: () => {
    set({ selectedNodes: [] });
  },

  collapseNode: (id: string) => {
    const { nodes, edges } = get();
    
    const childIds = new Set<string>();
    const findChildren = (nodeId: string) => {
      edges.forEach((edge) => {
        if (edge.source === nodeId) {
          childIds.add(edge.target);
          findChildren(edge.target);
        }
      });
    };
    findChildren(id);

    console.log('[CollapseNode] Collapsing node', {
      nodeId: id,
      childrenFound: childIds.size,
      children: Array.from(childIds).slice(0, 5),
    });

    const newNodes = nodes.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, collapsed: true } };
      }
      if (childIds.has(node.id)) {
        // Mark both top-level and data.hidden for compatibility
        return { ...node, hidden: true, data: { ...node.data, hidden: true } };
      }
      return node;
    });

    const newEdges = edges.map((edge) => {
      if (childIds.has(edge.target)) {
        return { ...edge, hidden: true };
      }
      return edge;
    });

    set({ nodes: newNodes, edges: newEdges });
  },

  expandNode: (id: string) => {
    const { nodes, edges } = get();

    const directChildIds = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === id) {
        directChildIds.add(edge.target);
      }
    });

    const newNodes = nodes.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, collapsed: false } };
      }
      if (directChildIds.has(node.id)) {
        return { ...node, hidden: false, data: { ...node.data, hidden: false } };
      }
      return node;
    });

    const newEdges = edges.map((edge) => {
      if (directChildIds.has(edge.target)) {
        return { ...edge, hidden: false };
      }
      return edge;
    });

    set({ nodes: newNodes, edges: newEdges });
  },

  autoCollapseBySize: () => {
    let { nodes, edges } = get();
    const totalNodes = nodes.length;
    
    // SIMPLE STRATEGY: Always collapse everything except root (level 0)
    // User requested: "comece sempre com tudo colapsado"
    
    console.log('[AutoCollapse] Collapsing all nodes except root', { totalNodes });
    
    // CRITICAL: Ensure nodes have hierarchy (level) calculated
    const hasLevels = nodes.some(n => n.data.level !== undefined);
    if (!hasLevels) {
      console.log('[AutoCollapse] Nodes missing level property - applying layout first');
      get().applyLayout();
      nodes = get().nodes;
      edges = get().edges;
    }
    
    // Find all nodes at level 1 (direct children of root) that have children
    const nodesToCollapse = nodes.filter(node => {
      const level = node.data.level ?? 0;
      const hasChildren = edges.some(edge => edge.source === node.id);
      return level >= 1 && hasChildren; // Collapse everything from level 1+
    });
    
    console.log('[AutoCollapse] Collapsing', {
      nodesToCollapseCount: nodesToCollapse.length,
      strategy: 'all-collapsed',
    });
    
    // BATCH OPERATION: Calculate all descendants to hide in one pass
    const allDescendantsToHide = new Set<string>();
    const nodesToMarkCollapsed = new Set<string>();
    
    nodesToCollapse.forEach(node => {
      nodesToMarkCollapsed.add(node.id);
      
      // Find all descendants recursively
      const findDescendants = (nodeId: string) => {
        edges.forEach((edge) => {
          if (edge.source === nodeId && !allDescendantsToHide.has(edge.target)) {
            allDescendantsToHide.add(edge.target);
            findDescendants(edge.target);
          }
        });
      };
      findDescendants(node.id);
    });
    
    console.log('[AutoCollapse] Batch calculation complete', {
      nodesToMarkCollapsed: nodesToMarkCollapsed.size,
      descendantsToHide: allDescendantsToHide.size,
    });
    
    // SINGLE SET OPERATION: Apply all changes at once
    const newNodes = nodes.map((node) => {
      if (nodesToMarkCollapsed.has(node.id)) {
        return { ...node, data: { ...node.data, collapsed: true } };
      }
      if (allDescendantsToHide.has(node.id)) {
        return { ...node, hidden: true, data: { ...node.data, hidden: true } };
      }
      return node;
    });
    
    const newEdges = edges.map((edge) => {
      if (allDescendantsToHide.has(edge.target)) {
        return { ...edge, hidden: true };
      }
      return edge;
    });
    
    set({ nodes: newNodes, edges: newEdges });
    
    console.log('[AutoCollapse] Finished - state updated', {
      totalHidden: newNodes.filter(n => n.hidden).length,
    });
  },

  toggleFreeFormMode: () => {
    const { mindMap } = get();
    if (!mindMap) return;
    
    const newFreeFormState = !mindMap.config?.freeForm;
    const updatedMindMap = {
      ...mindMap,
      config: {
        ...mindMap.config,
        freeForm: newFreeFormState,
      },
    };
    
    set({ mindMap: updatedMindMap });
    
    // If switching back to auto-layout, reapply layout immediately
    if (!newFreeFormState) {
      get().applyLayout();
    }
  },

  applyLayout: () => {
    const { nodes, edges, mindMap } = get();
    const config = mindMap?.config || DEFAULT_CONFIG;
    
    // CRITICAL: Save collapse/hidden state BEFORE layout
    const collapsedState = new Map<string, { hidden: boolean; collapsed: boolean }>();
    nodes.forEach(node => {
      collapsedState.set(node.id, {
        hidden: node.hidden || false,
        collapsed: node.data?.collapsed || false,
      });
    });
    
    // Skip auto-layout if in free-form mode (SimpleMind-style manual positioning)
    if (config.freeForm) {
      // Still enrich nodes with hierarchy info for styling purposes
      const enrichedNodes = enrichNodesWithHierarchy(nodes, edges);
      
      // Restore collapse state
      const restoredNodes = enrichedNodes.map(node => {
        const state = collapsedState.get(node.id);
        if (state) {
          return {
            ...node,
            hidden: state.hidden,
            data: { ...node.data, hidden: state.hidden, collapsed: state.collapsed },
          };
        }
        return node;
      });
      
      set({ nodes: restoredNodes });
      return;
    }
    
    // Enrich nodes with hierarchy information (level, branchId)
    const enrichedNodes = enrichNodesWithHierarchy(nodes, edges);
    
    const layoutedNodes = calculateLayout(enrichedNodes, edges, {
      algorithm: config.layout || 'dagre',
      direction: 'TB',
      nodeSpacing: config.nodeSpacing,
      levelSpacing: config.levelSpacing,
    });

    // CRITICAL: Restore collapse/hidden state AFTER layout
    const restoredNodes = layoutedNodes.map(node => {
      const state = collapsedState.get(node.id);
      if (state) {
        return {
          ...node,
          hidden: state.hidden,
          data: { ...node.data, hidden: state.hidden, collapsed: state.collapsed },
        };
      }
      return node;
    });

    set({ nodes: restoredNodes });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const { nodes, edges } = history[newIndex];
      set({ nodes, edges, historyIndex: newIndex });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const { nodes, edges } = history[newIndex];
      set({ nodes, edges, historyIndex: newIndex });
    }
  },

  exportData: () => {
    const { mindMap, nodes, edges } = get();
    
    return {
      ...mindMap!,
      nodes,
      edges,
      metadata: {
        ...mindMap!.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  },
}));

// ===== OPTIMIZED SELECTORS =====
// These selectors reduce unnecessary re-renders by only subscribing to specific state slices

/**
 * Hook to get only the nodes array
 * Re-renders only when nodes array reference changes
 */
export const useMindMapNodes = () => useMindMapEngine((state) => state.nodes);

/**
 * Hook to get only the edges array
 * Re-renders only when edges array reference changes
 */
export const useMindMapEdges = () => useMindMapEngine((state) => state.edges);

/**
 * Hook to get only selected node IDs
 * Re-renders only when selection changes
 */
export const useMindMapSelection = () => useMindMapEngine((state) => state.selectedNodes);

/**
 * Hook to get only history state (for undo/redo buttons)
 * Re-renders only when history changes
 */
export const useMindMapHistory = () => 
  useMindMapEngine(
    useShallow((state) => ({
      canUndo: state.historyIndex > 0,
      canRedo: state.historyIndex < state.history.length - 1,
    }))
  );

/**
 * Hook to get only mind map metadata (title, config, etc.)
 * Re-renders only when mindMap object changes
 */
export const useMindMapMetadata = () => useMindMapEngine((state) => state.mindMap);

/**
 * Hook to get only the action methods (never causes re-renders)
 * Use this when you only need methods, not state
 */
export const useMindMapActions = () =>
  useMindMapEngine(
    useShallow((state) => ({
      initializeMindMap: state.initializeMindMap,
      loadMindMap: state.loadMindMap,
      addNode: state.addNode,
      updateNode: state.updateNode,
      deleteNode: state.deleteNode,
      addEdge: state.addEdge,
      deleteEdge: state.deleteEdge,
      applyNodesChange: state.applyNodesChange,
      applyEdgesChange: state.applyEdgesChange,
      selectNode: state.selectNode,
      clearSelection: state.clearSelection,
      collapseNode: state.collapseNode,
      expandNode: state.expandNode,
      toggleFreeFormMode: state.toggleFreeFormMode,
      applyLayout: state.applyLayout,
      undo: state.undo,
      redo: state.redo,
      exportData: state.exportData,
    }))
  );

/**
 * Hook to get nodes and edges together (optimized with shallow comparison)
 * Use this when you need both nodes and edges
 */
export const useMindMapNodesAndEdges = () =>
  useMindMapEngine(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
    }))
  );

/**
 * Hook to get specific node by ID
 * Re-renders only when that specific node changes
 */
export const useMindMapNode = (nodeId: string) =>
  useMindMapEngine((state) => state.nodes.find((n) => n.id === nodeId));
