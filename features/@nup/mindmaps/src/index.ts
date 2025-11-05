/**
 * @nup/mindmaps - Sistema completo de Mind Maps
 * 
 * Features:
 * - SimpleMind-inspired professional design
 * - AI-powered generation and explanation
 * - RAG integration for material-based maps
 * - Advanced customization (12 built-in stylesheets)
 * - Export to SVG/PNG/PDF
 * - Outline view, presentation mode, focus mode
 * - Collapse/expand, crosslinks, free-form layout
 */

// Main App Component
export { default as MindMapApp } from './MindMapApp';

// Core Components
export { default as MindMapEditor } from './components/MindMapEditor';
export { default as MindMapViewer } from './components/MindMapViewer';
export { default as MindMapNode } from './components/nodes/MindMapNode';
export { default as Toolbar } from './components/Toolbar';
export { default as StylePanel } from './components/StylePanel';
export { default as OutlineView } from './components/OutlineView';
export { default as PresentationMode } from './components/PresentationMode';
export { default as SearchBar } from './components/SearchBar';
export { default as AIGenerationProgress } from './components/AIGenerationProgress';
export { default as AIExplanationDialog } from './components/AIExplanationDialog';
export { default as MindMapLoadingSkeleton } from './components/MindMapLoadingSkeleton';

// Hooks
export { useMindMap } from './hooks/useMindMap';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { useJobPolling } from './hooks/useJobPolling';

// Store
export { useStyleStore } from './store/useStyleStore';

// AI Services
export { MindMapAI } from './ai/MindMapAI';

// Engine
export { MindMapEngine } from './engine/MindMapEngine';
export * from './engine/layout';

// Storage
export { MindMapStorage } from './storage/MindMapStorage';

// Core Types & Constants
export * from './core/types';
export * from './core/constants';
export * from './core/styles';
export * from './core/builtInStyleSheets';

// Utils
export * from './utils/hierarchyUtils';
export * from './utils/id';
