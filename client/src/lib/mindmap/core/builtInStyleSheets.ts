/**
 * Built-in Style Sheets for Mind Maps
 * SimpleMind-inspired professional themes
 */

import type { StyleSheet, NodeStyle, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from './styles';

// ===== HELPER TO CREATE NODE STYLES =====
function createNodeStyle(overrides: Partial<NodeStyle>): NodeStyle {
  return {
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
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    ...overrides,
  };
}

// ===== BUILT-IN STYLE SHEETS =====

export const BUILT_IN_STYLE_SHEETS: StyleSheet[] = [
  {
    id: 'default-light',
    name: 'Clean & Minimal (Light)',
    description: 'Simple, clean design with subtle colors - perfect for professional presentations',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'type-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        textColor: '#1e293b',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textColor: '#475569',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#94a3b8',
      width: 2,
      animated: false,
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 80, vertical: 60 },
      alignment: 'center',
    },
  },

  {
    id: 'default-dark',
    name: 'Clean & Minimal (Dark)',
    description: 'Clean design optimized for dark mode',
    isBuiltIn: true,
    isDarkMode: true,
    colorMode: 'type-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        textColor: '#f1f5f9',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textColor: '#cbd5e1',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#64748b',
      width: 2,
      animated: false,
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 80, vertical: 60 },
      alignment: 'center',
    },
  },

  {
    id: 'bright-colors',
    name: 'Bright Colors',
    description: 'Vibrant, energetic colors - great for creative brainstorming',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'level-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#ec4899',
        borderColor: '#db2777',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
        borderWidth: 2,
      }),
      branch: createNodeStyle({
        backgroundColor: '#8b5cf6',
        borderColor: '#7c3aed',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#06b6d4',
        borderColor: '#0891b2',
        textColor: '#ffffff',
      }),
    },
    edgeStyles: {
      type: 'bezier',
      color: '#a855f7',
      width: 3,
      animated: false,
    },
    colorPalette: {
      name: 'Bright Colors',
      colors: ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
    },
    layoutConfig: {
      direction: 'TB',
      spacing: { horizontal: 100, vertical: 80 },
      alignment: 'center',
    },
  },

  {
    id: 'natural-colors',
    name: 'Natural Colors',
    description: 'Earthy, calming tones - ideal for long reading sessions',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'branch-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#059669',
        borderColor: '#047857',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#10b981',
        borderColor: '#059669',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#34d399',
        borderColor: '#10b981',
        textColor: '#064e3b',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#6ee7b7',
      width: 2,
      animated: false,
    },
    colorPalette: {
      name: 'Natural Colors',
      colors: ['#059669', '#0891b2', '#0284c7', '#7c3aed', '#ea580c', '#dc2626'],
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 70, vertical: 50 },
      alignment: 'center',
    },
  },

  {
    id: 'pastel-dreams',
    name: 'Pastel Dreams',
    description: 'Soft, gentle colors - easy on the eyes for extended study sessions',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'level-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#fbbf24',
        borderColor: '#f59e0b',
        textColor: '#78350f',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#fde047',
        borderColor: '#facc15',
        textColor: '#713f12',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#fef08a',
        borderColor: '#fde047',
        textColor: '#854d0e',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#fde68a',
      width: 2,
      animated: false,
    },
    colorPalette: {
      name: 'Pastel Dreams',
      colors: ['#fbbf24', '#fb923c', '#f472b6', '#c084fc', '#818cf8', '#60a5fa'],
    },
    layoutConfig: {
      direction: 'TB',
      spacing: { horizontal: 90, vertical: 70 },
      alignment: 'center',
    },
  },

  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Cool, focused blue tones - promotes concentration',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'level-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#0ea5e9',
        borderColor: '#0284c7',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#38bdf8',
        borderColor: '#0ea5e9',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#7dd3fc',
        borderColor: '#38bdf8',
        textColor: '#075985',
      }),
    },
    edgeStyles: {
      type: 'bezier',
      color: '#0ea5e9',
      width: 2,
      animated: false,
    },
    colorPalette: {
      name: 'Ocean Blue',
      colors: ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 80, vertical: 60 },
      alignment: 'center',
    },
  },

  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Warm, energizing gradients - inspires creativity',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'branch-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#f97316',
        borderColor: '#ea580c',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#fbbf24',
        borderColor: '#f59e0b',
        textColor: '#78350f',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#fb923c',
      width: 2,
      animated: false,
    },
    colorPalette: {
      name: 'Sunset Warm',
      colors: ['#dc2626', '#f97316', '#fbbf24', '#eab308', '#84cc16', '#22c55e'],
    },
    layoutConfig: {
      direction: 'TB',
      spacing: { horizontal: 85, vertical: 65 },
      alignment: 'center',
    },
  },

  {
    id: 'monochrome-elegant',
    name: 'Monochrome Elegant',
    description: 'Sophisticated grayscale - professional and timeless',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'type-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#0f172a',
        borderColor: '#020617',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#475569',
        borderColor: '#334155',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#cbd5e1',
        borderColor: '#94a3b8',
        textColor: '#1e293b',
      }),
    },
    edgeStyles: {
      type: 'straight',
      color: '#64748b',
      width: 2,
      animated: false,
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 75, vertical: 55 },
      alignment: 'center',
    },
  },

  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Nature-inspired greens - calming and refreshing',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'level-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#16a34a',
        borderColor: '#15803d',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#86efac',
        borderColor: '#4ade80',
        textColor: '#14532d',
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#4ade80',
      width: 2,
      animated: false,
    },
    colorPalette: {
      name: 'Forest Green',
      colors: ['#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7', '#2563eb'],
    },
    layoutConfig: {
      direction: 'TB',
      spacing: { horizontal: 90, vertical: 70 },
      alignment: 'center',
    },
  },

  {
    id: 'purple-majesty',
    name: 'Purple Majesty',
    description: 'Royal purple tones - elegant and inspiring',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'branch-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#7c3aed',
        borderColor: '#6d28d9',
        textColor: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
      }),
      branch: createNodeStyle({
        backgroundColor: '#a78bfa',
        borderColor: '#8b5cf6',
        textColor: '#ffffff',
        fontWeight: 'semibold',
      }),
      leaf: createNodeStyle({
        backgroundColor: '#c4b5fd',
        borderColor: '#a78bfa',
        textColor: '#4c1d95',
      }),
    },
    edgeStyles: {
      type: 'bezier',
      color: '#a855f7',
      width: 3,
      animated: false,
    },
    colorPalette: {
      name: 'Purple Majesty',
      colors: ['#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#e879f9'],
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 80, vertical: 60 },
      alignment: 'center',
    },
  },

  {
    id: 'minimal-wireframe',
    name: 'Minimal Wireframe',
    description: 'Ultra-minimal design - focus on content, not decoration',
    isBuiltIn: true,
    isDarkMode: false,
    colorMode: 'type-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: 'transparent',
        borderColor: '#0f172a',
        textColor: '#0f172a',
        fontWeight: 'bold',
        fontSize: 16,
        borderWidth: 2,
      }),
      branch: createNodeStyle({
        backgroundColor: 'transparent',
        borderColor: '#475569',
        textColor: '#1e293b',
        fontWeight: 'semibold',
        borderWidth: 2,
      }),
      leaf: createNodeStyle({
        backgroundColor: 'transparent',
        borderColor: '#94a3b8',
        textColor: '#475569',
        borderWidth: 1,
      }),
    },
    edgeStyles: {
      type: 'straight',
      color: '#cbd5e1',
      width: 1,
      animated: false,
    },
    layoutConfig: {
      direction: 'LR',
      spacing: { horizontal: 70, vertical: 50 },
      alignment: 'center',
    },
  },

  {
    id: 'neon-cyberpunk',
    name: 'Neon Cyberpunk',
    description: 'Electric neon colors on dark background - futuristic and bold',
    isBuiltIn: true,
    isDarkMode: true,
    colorMode: 'level-based',
    nodeStyles: {
      root: createNodeStyle({
        backgroundColor: '#0f172a',
        borderColor: '#06b6d4',
        textColor: '#06b6d4',
        fontWeight: 'bold',
        fontSize: 16,
        borderWidth: 3,
      }),
      branch: createNodeStyle({
        backgroundColor: '#1e293b',
        borderColor: '#8b5cf6',
        textColor: '#c084fc',
        fontWeight: 'semibold',
        borderWidth: 2,
      }),
      leaf: createNodeStyle({
        backgroundColor: '#0f172a',
        borderColor: '#ec4899',
        textColor: '#f472b6',
        borderWidth: 2,
      }),
    },
    edgeStyles: {
      type: 'smoothstep',
      color: '#06b6d4',
      width: 2,
      animated: true,
    },
    colorPalette: {
      name: 'Neon Cyberpunk',
      colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'],
    },
    layoutConfig: {
      direction: 'TB',
      spacing: { horizontal: 100, vertical: 80 },
      alignment: 'center',
    },
  },
];

// ===== HELPER FUNCTIONS =====

/**
 * Get all built-in style sheets
 */
export function getBuiltInStyleSheets(): StyleSheet[] {
  return BUILT_IN_STYLE_SHEETS;
}

/**
 * Get style sheets for current theme (light/dark)
 */
export function getStyleSheetsForTheme(isDarkMode: boolean): StyleSheet[] {
  return BUILT_IN_STYLE_SHEETS.filter(
    sheet => sheet.isDarkMode === isDarkMode || sheet.id.includes('bright') || sheet.id.includes('natural')
  );
}

/**
 * Get a specific style sheet by ID
 */
export function getStyleSheetById(id: string): StyleSheet | undefined {
  return BUILT_IN_STYLE_SHEETS.find(sheet => sheet.id === id);
}

/**
 * Get default style sheet for theme
 */
export function getDefaultStyleSheet(isDarkMode: boolean): StyleSheet {
  return isDarkMode 
    ? getStyleSheetById('default-dark')! 
    : getStyleSheetById('default-light')!;
}
