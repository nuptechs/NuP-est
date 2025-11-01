/**
 * Mind Map Style Store
 * Manages hierarchical styling (StyleSheet > Map > Element)
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import type { 
  StyleSheet, 
  MindMapCustomStyles, 
  ElementCustomStyles,
  NodeStyle,
  EdgeStyle,
  NodeStylesByType,
} from '../core/styles';
import { DEFAULT_EDGE_STYLE } from '../core/styles';
import { getDefaultStyleSheet, getStyleSheetById } from '../core/builtInStyleSheets';

interface StyleStore {
  // Current applied styles
  currentStyleSheet: StyleSheet | null;
  mindMapCustomStyles: MindMapCustomStyles | null;
  elementCustomStyles: Map<string, ElementCustomStyles>; // elementId -> styles
  
  // Theme
  isDarkMode: boolean;
  
  // Actions
  setStyleSheet: (styleSheet: StyleSheet) => void;
  setStyleSheetById: (id: string) => void;
  setMindMapCustomStyles: (styles: MindMapCustomStyles | null) => void;
  setElementCustomStyle: (elementId: string, styles: ElementCustomStyles) => void;
  removeElementCustomStyle: (elementId: string) => void;
  clearAllElementStyles: () => void;
  setTheme: (isDarkMode: boolean) => void;
  reset: () => void;
  
  // Computed getters
  getNodeStyle: (nodeType: 'root' | 'branch' | 'leaf', elementId?: string) => NodeStyle;
  getEdgeStyle: (elementId?: string) => EdgeStyle;
}

export const useStyleStore = create<StyleStore>((set, get) => ({
  // Initial state
  currentStyleSheet: getDefaultStyleSheet(false),
  mindMapCustomStyles: null,
  elementCustomStyles: new Map(),
  isDarkMode: false,
  
  // Set a complete style sheet
  setStyleSheet: (styleSheet) => set({ currentStyleSheet: styleSheet }),
  
  // Set style sheet by ID
  setStyleSheetById: (id) => {
    const sheet = getStyleSheetById(id);
    if (sheet) {
      set({ currentStyleSheet: sheet });
    }
  },
  
  // Set mind map custom styles (level 2 override)
  setMindMapCustomStyles: (styles) => set({ mindMapCustomStyles: styles }),
  
  // Set custom style for a specific element (level 3 override)
  setElementCustomStyle: (elementId, styles) => {
    const { elementCustomStyles } = get();
    const newMap = new Map(elementCustomStyles);
    newMap.set(elementId, styles);
    set({ elementCustomStyles: newMap });
  },
  
  // Remove custom style for element
  removeElementCustomStyle: (elementId) => {
    const { elementCustomStyles } = get();
    const newMap = new Map(elementCustomStyles);
    newMap.delete(elementId);
    set({ elementCustomStyles: newMap });
  },
  
  // Clear all element-level customizations
  clearAllElementStyles: () => set({ elementCustomStyles: new Map() }),
  
  // Set theme and auto-switch default sheet if needed
  setTheme: (isDarkMode) => {
    const { currentStyleSheet } = get();
    set({ isDarkMode });
    
    // Auto-switch default sheets
    if (currentStyleSheet?.id === 'default-light' && isDarkMode) {
      set({ currentStyleSheet: getDefaultStyleSheet(true) });
    } else if (currentStyleSheet?.id === 'default-dark' && !isDarkMode) {
      set({ currentStyleSheet: getDefaultStyleSheet(false) });
    }
  },
  
  // Reset to default
  reset: () => {
    const { isDarkMode } = get();
    set({
      currentStyleSheet: getDefaultStyleSheet(isDarkMode),
      mindMapCustomStyles: null,
      elementCustomStyles: new Map(),
    });
  },
  
  // Get computed node style with 3-level hierarchy
  getNodeStyle: (nodeType, elementId) => {
    const { currentStyleSheet, mindMapCustomStyles, elementCustomStyles } = get();
    
    // Level 1: Base style from style sheet
    let style = currentStyleSheet?.nodeStyles[nodeType] || {} as NodeStyle;
    
    // Level 2: Apply mind map custom overrides
    if (mindMapCustomStyles?.nodeStyles?.[nodeType]) {
      style = { ...style, ...mindMapCustomStyles.nodeStyles[nodeType] };
    }
    
    // Level 3: Apply element-specific overrides
    if (elementId) {
      const elementStyle = elementCustomStyles.get(elementId);
      if (elementStyle?.node) {
        style = { ...style, ...elementStyle.node };
      }
    }
    
    return style;
  },
  
  // Get computed edge style with 3-level hierarchy
  getEdgeStyle: (elementId) => {
    const { currentStyleSheet, mindMapCustomStyles, elementCustomStyles } = get();
    
    // Level 1: Base style from style sheet (with DEFAULT fallback)
    let style: EdgeStyle = {
      ...DEFAULT_EDGE_STYLE,
      ...(currentStyleSheet?.edgeStyles || {}),
    };
    
    // Level 2: Apply mind map custom overrides
    if (mindMapCustomStyles?.edgeStyles) {
      style = { ...style, ...mindMapCustomStyles.edgeStyles };
    }
    
    // Level 3: Apply element-specific overrides
    if (elementId) {
      const elementStyle = elementCustomStyles.get(elementId);
      if (elementStyle?.edge) {
        style = { ...style, ...elementStyle.edge };
      }
    }
    
    return style;
  },
}));

// ===== HOOKS FOR CONVENIENCE =====

/**
 * Get the current active style sheet
 */
export function useCurrentStyleSheet() {
  return useStyleStore((state) => state.currentStyleSheet);
}

/**
 * Get node style with full hierarchy applied
 */
export function useNodeStyle(nodeType: 'root' | 'branch' | 'leaf', elementId?: string) {
  const style = useStyleStore((state) => state.getNodeStyle(nodeType, elementId));
  return useMemo(() => style, [JSON.stringify(style)]);
}

/**
 * Get edge style with full hierarchy applied
 */
export function useEdgeStyle(elementId?: string) {
  const style = useStyleStore((state) => state.getEdgeStyle(elementId));
  return useMemo(() => style, [JSON.stringify(style)]);
}

/**
 * Get all available actions
 */
export function useStyleActions() {
  const setStyleSheet = useStyleStore((state) => state.setStyleSheet);
  const setStyleSheetById = useStyleStore((state) => state.setStyleSheetById);
  const setMindMapCustomStyles = useStyleStore((state) => state.setMindMapCustomStyles);
  const setElementCustomStyle = useStyleStore((state) => state.setElementCustomStyle);
  const removeElementCustomStyle = useStyleStore((state) => state.removeElementCustomStyle);
  const clearAllElementStyles = useStyleStore((state) => state.clearAllElementStyles);
  const setTheme = useStyleStore((state) => state.setTheme);
  const reset = useStyleStore((state) => state.reset);
  
  return useMemo(
    () => ({
      setStyleSheet,
      setStyleSheetById,
      setMindMapCustomStyles,
      setElementCustomStyle,
      removeElementCustomStyle,
      clearAllElementStyles,
      setTheme,
      reset,
    }),
    [
      setStyleSheet,
      setStyleSheetById,
      setMindMapCustomStyles,
      setElementCustomStyle,
      removeElementCustomStyle,
      clearAllElementStyles,
      setTheme,
      reset,
    ]
  );
}
