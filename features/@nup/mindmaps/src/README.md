# Mind Maps Feature Module

A fully encapsulated, production-ready mind mapping system with AI generation, advanced customization, and professional visual design.

## 🎯 Architecture

This is a **Feature Module** following modern application patterns:
- ✅ Complete isolation from main application
- ✅ Single entry point (`MindMapApp`)
- ✅ Self-contained dependencies
- ✅ Can be extracted/removed in minutes
- ✅ Production-ready with full TypeScript support

## 📁 Structure

```
features/mindmaps/
├── MindMapApp.tsx           # Entry point (replaces pages/mind-maps.tsx)
├── index.ts                 # Public exports
├── README.md                # This file
│
├── ai/                      # AI integration
│   └── MindMapAI.ts        # RAG-based mind map generation
│
├── components/              # React components
│   ├── MindMapEditor.tsx   # Main editor with React Flow
│   ├── StylePanel.tsx      # Customization panel
│   ├── Toolbar.tsx         # Editor toolbar
│   └── nodes/              # Custom node components
│       └── MindMapNode.tsx
│
├── core/                    # Core types & constants
│   ├── types.ts            # TypeScript definitions
│   ├── styles.ts           # Style system types
│   ├── builtInStyleSheets.ts  # 12 professional themes
│   └── constants.ts
│
├── engine/                  # Mind map engine (Zustand)
│   ├── MindMapEngine.ts    # State management
│   └── layout.ts           # Layout algorithms (Dagre, ELK)
│
├── hooks/                   # React hooks
│   └── useMindMap.ts       # Main hook for mind map operations
│
├── storage/                 # API client
│   └── MindMapStorage.ts   # Backend communication
│
├── store/                   # Zustand stores
│   └── useStyleStore.ts    # Style management
│
└── utils/                   # Utilities
    ├── hierarchyUtils.ts   # BFS hierarchy calculation
    └── id.ts               # ID generators
```

## 🚀 Usage

### In Main Application

```typescript
// client/src/App.tsx
import MindMapApp from '@/features/mindmaps';

function App() {
  return (
    <Route path="/mind-maps" component={MindMapApp} />
  );
}
```

### Advanced Usage

```typescript
// Import specific components
import { MindMapEditor, StylePanel } from '@/features/mindmaps';

// Import hooks
import { useMindMap } from '@/features/mindmaps';

// Import types
import type { MindMapNode, MindMapEdge } from '@/features/mindmaps';
```

## ✨ Features

### Core Features
- ✅ **Interactive Editor** - Drag & drop, real-time editing, undo/redo
- ✅ **AI Generation** - RAG-based mind map creation from study materials
- ✅ **Export** - SVG and PNG export with html-to-image
- ✅ **Adaptive Learning** - Color-coded by student performance

### Advanced Customization (SimpleMind-inspired)
- ✅ **12 Built-in Themes** - Professional color palettes
- ✅ **3-Level Style Hierarchy** - Global → Map → Element
- ✅ **4 Color Modes**:
  - Type-based (root/branch/leaf)
  - Level-based (hierarchy depth)
  - Branch-based (children inherit parent color)
  - Performance-based (student mastery)
- ✅ **Full Customization** - Shapes, colors, borders, typography

### User Experience
- ✅ **Keyboard Shortcuts** - Tab (child), Enter (sibling), Delete, Cmd/Ctrl+Z/Y
- ✅ **Inline Editing** - Double-click to edit
- ✅ **Handle Connections** - Drag to connect nodes
- ✅ **MiniMap** - Optional navigation panel
- ✅ **Subject Integration** - Filter by subject

## 🔧 Dependencies

### NPM Packages (External)
```json
{
  "@xyflow/react": "^12.3.4",      // React Flow - Mind map editor
  "dagre": "^0.8.5",               // Dagre - Layout algorithm
  "elkjs": "^0.9.3",               // ELK - Alternative layout
  "html-to-image": "^1.11.11"      // Export to PNG/SVG
}
```

### Shared Dependencies (Main App)
- `@tanstack/react-query` - API state management
- `zustand` - Local state management
- `shadcn/ui` - UI components
- `lucide-react` - Icons

## 🗄️ Database Schema

### Tables

#### `mind_maps`
```sql
- id (varchar, UUID)
- user_id (FK → users.id)
- subject_id (FK → subjects.id, nullable)
- material_id (FK → materials.id, nullable)
- style_sheet_id (FK → mind_map_style_sheets.id, nullable)
- title
- description
- content (JSONB - nodes, edges, config)
- generated_from_ai (boolean)
- created_at, updated_at
```

#### `mind_map_style_sheets`
```sql
- id (varchar, UUID)
- user_id (FK → users.id, nullable - null = built-in)
- name
- description
- is_built_in (boolean)
- is_dark_mode (boolean)
- color_mode (type-based | level-based | branch-based | performance-based)
- node_styles (JSONB)
- edge_styles (JSONB)
- layout_config (JSONB)
- color_palette (JSONB)
- created_at, updated_at
```

#### `mind_map_element_styles`
```sql
- id (varchar, UUID)
- mind_map_id (FK → mind_maps.id)
- element_id (varchar - node/edge ID)
- element_type (node | edge)
- node_style (JSONB, nullable)
- edge_style (JSONB, nullable)
- created_at, updated_at
```

## 🔌 Backend Integration

### API Endpoints (server/routes-mindmaps.ts)

```typescript
GET    /api/mindmaps              // List user's mind maps
GET    /api/mindmaps/:id          // Get single mind map
POST   /api/mindmaps              // Create new mind map
PATCH  /api/mindmaps/:id          // Update mind map
DELETE /api/mindmaps/:id          // Delete mind map
POST   /api/mindmaps/generate     // AI generate from material
```

### Backend Services

```
server/
├── routes-mindmaps.ts                  // API routes
└── services/mindmap/
    └── MindMapGenerator.ts             // RAG-based generation
```

## 📤 Extraction to Another Application

To use this in another app:

1. **Copy the module**
   ```bash
   cp -r features/mindmaps/ ../other-app/features/
   ```

2. **Install dependencies**
   ```bash
   npm install @xyflow/react dagre elkjs html-to-image
   ```

3. **Add route**
   ```typescript
   import MindMapApp from '@/features/mindmaps';
   <Route path="/mind-maps" component={MindMapApp} />
   ```

4. **Copy backend**
   ```bash
   cp server/routes-mindmaps.ts ../other-app/server/
   cp -r server/services/mindmap/ ../other-app/server/services/
   ```

5. **Add schema**
   ```typescript
   // Copy 3 table definitions:
   // - mind_maps
   // - mind_map_style_sheets  
   // - mind_map_element_styles
   ```

6. **Register backend routes**
   ```typescript
   // server/routes.ts
   const { registerMindMapRoutes } = await import("./routes-mindmaps");
   registerMindMapRoutes(app, storage);
   ```

## 🗑️ Complete Removal Checklist

To remove this feature completely:

### Frontend
- [ ] Remove route from `App.tsx`
- [ ] Remove navigation link from `design-system.ts`
- [ ] Remove quick tool from `dashboard-simple.tsx`
- [ ] Remove React Flow styles from `index.css`
- [ ] Delete `features/mindmaps/` folder

### Backend
- [ ] Remove route registration from `routes.ts`
- [ ] Delete `server/routes-mindmaps.ts`
- [ ] Delete `server/services/mindmap/`
- [ ] Remove CRUD methods from `storage.ts` (optional)

### Database
- [ ] Remove table definitions from `schema.ts`
- [ ] Run `npm run db:push --force` to drop tables

### Dependencies
- [ ] `npm uninstall @xyflow/react dagre elkjs html-to-image`

## 🎨 Customization

### Adding New Themes

```typescript
// core/builtInStyleSheets.ts
export const MY_THEME: StyleSheet = {
  id: 'my-theme',
  name: 'My Custom Theme',
  colorMode: 'level-based',
  nodeStyles: { /* ... */ },
  edgeStyles: { /* ... */ },
  colorPalette: {
    name: 'My Palette',
    colors: ['#color1', '#color2', '#color3']
  }
};
```

### Extending with New Features

The module is designed for extension:
- Add new components in `components/`
- Add new hooks in `hooks/`
- Extend types in `core/types.ts`
- Add new utilities in `utils/`

## 📝 License

Part of NuP-Study application.
