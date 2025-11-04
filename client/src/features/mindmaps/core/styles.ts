/**
 * Mind Map Styling System
 * SimpleMind-inspired hierarchical styling with 3 levels:
 * 1. Style Sheets (global, reusable)
 * 2. Mind Map Styles (per-map overrides)
 * 3. Element Styles (individual node/edge customization)
 */

// ===== NODE SHAPES =====
export type NodeShape = 
  | 'rectangle'
  | 'rounded'
  | 'circle'
  | 'ellipse'
  | 'hexagon'
  | 'diamond'
  | 'pill'
  | 'parallelogram'
  | 'trapezoid'
  | 'octagon'
  | 'star';

// ===== BORDER STYLES =====
export type BorderStyle = 
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'none';

// ===== EDGE TYPES =====
export type EdgeType = 
  | 'smoothstep'  // Smooth curved connections (default)
  | 'straight'    // Direct lines
  | 'step'        // Right-angled connections
  | 'bezier';     // Smooth bezier curves

// ===== COLOR MODES =====
export type ColorMode = 
  | 'type-based'        // Color by node type (root, branch, leaf)
  | 'level-based'       // Color by hierarchy level (0, 1, 2, ...)
  | 'branch-based'      // Color entire branches (children inherit parent color)
  | 'performance-based'; // Color by student performance (adaptive learning)

// ===== TEXT ALIGNMENT =====
export type TextAlignment = 'left' | 'center' | 'right';

// ===== FONT WEIGHT =====
export type FontWeight = 
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold';

// ===== NODE STYLE DEFINITION =====
export interface NodeStyle {
  // Colors
  backgroundColor: string;      // Fill color (e.g., "#ffffff", "rgb(255,255,255)", "transparent")
  borderColor: string;          // Border color
  textColor: string;            // Text color
  
  // Border
  borderWidth: number;          // Border thickness in pixels (0-10)
  borderStyle: BorderStyle;     // Border line style
  borderRadius: number;         // Corner radius in pixels (0-50)
  
  // Shape
  shape: NodeShape;             // Node shape
  
  // Typography
  fontSize: number;             // Font size in pixels (10-32)
  fontWeight: FontWeight;       // Font weight
  textAlignment: TextAlignment; // Text alignment
  
  // Spacing
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Size constraints
  minWidth?: number;            // Minimum width in pixels
  minHeight?: number;           // Minimum height in pixels
  maxWidth?: number;            // Maximum width (for word wrap)
}

// ===== EDGE STYLE DEFINITION =====
export interface EdgeStyle {
  type: EdgeType;               // Connection line type
  color: string;                // Line color
  width: number;                // Line thickness in pixels (1-10)
  animated: boolean;            // Animated flowing effect
  markerEnd?: string;           // Arrow at end ('arrow' | 'arrowclosed' | undefined)
  markerStart?: string;         // Arrow at start
}

// ===== LAYOUT CONFIGURATION =====
export interface LayoutConfig {
  direction: 'LR' | 'RL' | 'TB' | 'BT'; // Layout direction (Left-Right, Top-Bottom, etc.)
  spacing: {
    horizontal: number;         // Horizontal spacing between nodes
    vertical: number;           // Vertical spacing between levels
  };
  alignment: 'start' | 'center' | 'end'; // Node alignment within levels
}

// ===== NODE STYLES BY TYPE =====
export interface NodeStylesByType {
  root: NodeStyle;              // Root node style
  branch: NodeStyle;            // Branch node style
  leaf: NodeStyle;              // Leaf node style
}

// ===== COLOR PALETTE =====
export interface ColorPalette {
  colors: string[];             // Array of colors for level/branch-based coloring
  name: string;                 // Palette name (e.g., "Bright Colors", "Natural Tones")
}

// ===== STYLE SHEET (Level 1: Global) =====
export interface StyleSheet {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;           // System-provided or user-created
  isDarkMode: boolean;          // Auto-switch with dark mode
  
  nodeStyles: NodeStylesByType; // Styles for each node type
  edgeStyles: EdgeStyle;        // Default edge styles
  colorPalette?: ColorPalette;  // Color palette for level/branch-based coloring
  colorMode: ColorMode;         // How colors are applied
  layoutConfig?: LayoutConfig;  // Layout configuration
}

// ===== MIND MAP CUSTOM STYLES (Level 2: Per-Map) =====
export interface MindMapCustomStyles {
  nodeStyles?: Partial<NodeStylesByType>;  // Override node styles
  edgeStyles?: Partial<EdgeStyle>;         // Override edge styles
  colorPalette?: ColorPalette;             // Override color palette
  colorMode?: ColorMode;                   // Override color mode
  layoutConfig?: Partial<LayoutConfig>;    // Override layout
}

// ===== ELEMENT CUSTOM STYLES (Level 3: Individual) =====
export interface ElementCustomStyles {
  // For nodes
  node?: Partial<NodeStyle>;
  
  // For edges
  edge?: Partial<EdgeStyle>;
}

// ===== STYLE PRESET (Quick Apply) =====
export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  nodeStyle?: Partial<NodeStyle>;  // Node properties to apply
  edgeStyle?: Partial<EdgeStyle>;  // Edge properties to apply
}

// ===== DEFAULT STYLES =====
export const DEFAULT_NODE_STYLE: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#cbd5e1',
  textColor: '#0f172a',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 12,
  shape: 'rounded',
  fontSize: 14,
  fontWeight: 'normal',
  textAlignment: 'center',
  padding: {
    top: 8,
    right: 12,
    bottom: 8,
    left: 12,
  },
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  type: 'bezier',  // Changed from smoothstep to bezier for smoother curves without corners
  color: '#94a3b8',
  width: 2,
  animated: false,
  markerEnd: undefined,
};

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'LR',
  spacing: {
    horizontal: 80,
    vertical: 60,
  },
  alignment: 'center',
};
