# @nup/mindmaps

Mind Maps feature package - vendível separadamente.

## Status

⏳ **A extrair** do apps/nup-study/client/src/features/mindmaps/

## Features

- 🧠 Geração de mind maps com IA
- 🎨 Editor visual interativo
- 📊 Outline view
- 🔍 Busca em tempo real
- 🎨 12 estilos visuais
- 📤 Export SVG/PNG
- 🔗 Crosslinks
- ✅ Checkboxes
- 🎭 Custom icons

## Architecture (Planejado)

```
@nup/mindmaps/
├── components/
│   ├── MindMapEditor.tsx
│   ├── OutlineView.tsx
│   └── nodes/
├── services/
│   ├── MindMapGenerator.ts
│   └── RAGIntegration.ts
├── hooks/
│   ├── useMindMap.ts
│   └── useMindMapExport.ts
└── types/
    └── index.ts
```

## Dependências

- `@nup/ui` - Componentes UI
- `@nup/api-client` - HTTP client
- `@nup/shared-types` - Types
- `@xyflow/react` - Flow editor
- `dagre` - Layout algorithm

## Uso (Futuro)

```typescript
import { MindMapEditor } from '@nup/mindmaps';

<MindMapEditor 
  mindMapId={id}
  onSave={handleSave}
/>
```

## Migração

Será extraído de `apps/nup-study/client/src/features/mindmaps/` em uma próxima fase.
