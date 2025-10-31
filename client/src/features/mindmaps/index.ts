/**
 * Mind Maps Feature Module - Entry Point
 * 
 * This is a fully encapsulated feature module following modern
 * feature-based architecture patterns (Next.js 13+, Remix, Nuxt).
 * 
 * DESIGN PRINCIPLES:
 * - Complete isolation from main application
 * - Single entry point for easy integration/removal
 * - Self-contained with all dependencies
 * - Can be extracted to another app by copying this folder
 * 
 * USAGE:
 * ```typescript
 * import MindMapApp from '@/features/mindmaps';
 * 
 * // In router:
 * <Route path="/mind-maps" component={MindMapApp} />
 * ```
 * 
 * REMOVAL:
 * To remove this feature completely:
 * 1. Remove the route from App.tsx
 * 2. Remove navigation links (Sidebar, Dashboard)
 * 3. Delete this folder
 * 4. Remove backend routes (server/routes-mindmaps.ts)
 * 5. Remove schema tables (mind_maps, mind_map_style_sheets, mind_map_element_styles)
 * 6. Uninstall NPM packages: @xyflow/react, dagre, elkjs, html-to-image
 */

export { default } from './MindMapApp';
export { default as MindMapApp } from './MindMapApp';

// Optional: Export components for advanced usage
export { MindMapEditor } from './components/MindMapEditor';
export { StylePanel } from './components/StylePanel';

// Optional: Export hooks
export { useMindMap } from './hooks/useMindMap';

// Optional: Export types
export type * from './core/types';
