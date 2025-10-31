import type { MindMapTheme, MindMapConfig } from './types';

export const DEFAULT_THEMES: Record<string, MindMapTheme> = {
  default: {
    name: 'Default',
    root: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderColor: 'hsl(var(--primary))',
    },
    branch: {
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
      borderColor: 'hsl(var(--border))',
    },
    leaf: {
      backgroundColor: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      borderColor: 'hsl(var(--border))',
    },
    edge: {
      stroke: 'hsl(var(--border))',
      strokeWidth: 2,
    },
  },
  
  ocean: {
    name: 'Ocean',
    root: {
      backgroundColor: '#1e40af',
      color: '#ffffff',
      borderColor: '#1e40af',
    },
    branch: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderColor: '#2563eb',
    },
    leaf: {
      backgroundColor: '#93c5fd',
      color: '#1e3a8a',
      borderColor: '#60a5fa',
    },
    edge: {
      stroke: '#3b82f6',
      strokeWidth: 2,
    },
  },
  
  forest: {
    name: 'Forest',
    root: {
      backgroundColor: '#15803d',
      color: '#ffffff',
      borderColor: '#15803d',
    },
    branch: {
      backgroundColor: '#22c55e',
      color: '#ffffff',
      borderColor: '#16a34a',
    },
    leaf: {
      backgroundColor: '#86efac',
      color: '#14532d',
      borderColor: '#4ade80',
    },
    edge: {
      stroke: '#22c55e',
      strokeWidth: 2,
    },
  },
  
  adaptive: {
    name: 'Adaptive Learning',
    root: {
      backgroundColor: '#6366f1',
      color: '#ffffff',
      borderColor: '#6366f1',
    },
    branch: {
      backgroundColor: '#a5b4fc',
      color: '#312e81',
      borderColor: '#818cf8',
    },
    leaf: {
      backgroundColor: '#ddd6fe',
      color: '#4c1d95',
      borderColor: '#c4b5fd',
    },
    edge: {
      stroke: '#818cf8',
      strokeWidth: 2,
    },
  },
};

export const DEFAULT_CONFIG: MindMapConfig = {
  theme: DEFAULT_THEMES.default,
  layout: 'dagre',
  nodeSpacing: 100,
  levelSpacing: 150,
  editable: true,
  showMinimap: true,
  showControls: true,
  enableUndo: true,
  autoSave: true,
  maxUndoSteps: 50,
};

export const NODE_DIMENSIONS = {
  root: { width: 200, height: 80 },
  branch: { width: 160, height: 60 },
  leaf: { width: 140, height: 50 },
};

export const KEYBOARD_SHORTCUTS = {
  UNDO: 'mod+z',
  REDO: 'mod+shift+z',
  DELETE: ['Delete', 'Backspace'],
  SAVE: 'mod+s',
  EXPORT: 'mod+e',
  ADD_NODE: 'Enter',
  EDIT_NODE: 'F2',
  COLLAPSE_NODE: 'Space',
  SEARCH: 'mod+f',
  FIT_VIEW: 'mod+0',
};

export const AI_GENERATION_DEFAULTS = {
  maxDepth: 4,
  maxNodes: 50,
  model: 'gpt-4o-mini' as const,
  useRAG: true,
};

export const EXPORT_DEFAULTS = {
  imageQuality: 1,
  backgroundColor: '#ffffff',
  includeMetadata: true,
};
