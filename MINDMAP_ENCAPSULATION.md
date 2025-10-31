# Mind Maps - Encapsulation Analysis & Removal Checklist

## Status: ⚠️ PARCIALMENTE ENCAPSULADO

O sistema de Mapas Mentais está **85% encapsulado**, mas ainda possui alguns pontos de acoplamento com a aplicação principal.

---

## 📁 Estrutura Atual

### ✅ CÓDIGO TOTALMENTE ENCAPSULADO

#### Frontend - Módulo Principal
```
client/src/lib/mindmap/
├── ai/                      # AI integration (MindMapAI)
├── components/              # React components
│   ├── nodes/              # Custom nodes
│   ├── MindMapEditor.tsx   # Main editor
│   └── StylePanel.tsx      # Customization panel
├── core/                    # Core types & constants
│   ├── types.ts
│   ├── styles.ts
│   ├── builtInStyleSheets.ts
│   └── constants.ts
├── engine/                  # Mind map engine (Zustand)
│   ├── MindMapEngine.ts
│   └── layout.ts
├── hooks/                   # React hooks
│   └── useMindMap.ts
├── storage/                 # API client
│   └── MindMapStorage.ts
├── store/                   # Zustand stores
│   └── useStyleStore.ts
└── utils/                   # Utilities
    ├── hierarchyUtils.ts
    └── id.ts
```

#### Backend - Serviços
```
server/services/mindmap/
└── MindMapGenerator.ts      # RAG-based mind map generation
```

#### Backend - Router Isolado
```
server/routes-mindmaps.ts    # ✅ Todas as rotas de API isoladas
```

---

### ⚠️ CÓDIGO COM ACOPLAMENTO (Precisa ser Removido/Modificado)

#### 1. Frontend - Pontos de Integração

**`client/src/App.tsx`** (2 referências)
```typescript
Line 12: import MindMaps from "@/pages/mind-maps";
Line 73: <Route path="/mind-maps" component={MindMaps} />
```

**`client/src/lib/design-system.ts`** (1 referência)
```typescript
Lines 174-175:
{
  name: "Mapas Mentais",
  href: "/mind-maps",
  ...
}
```

**`client/src/pages/dashboard-simple.tsx`** (1 referência)
```typescript
Lines 97-100:
{
  title: "Mapas Mentais",
  icon: Network,
  href: "/mind-maps",
  ...
}
```

**`client/src/pages/mind-maps.tsx`** (página completa)
- Usa componentes compartilhados (`@/components/ui/*`)
- Usa React Query hooks
- Usa subject filters da aplicação principal

**`client/src/index.css`** (estilos React Flow)
```css
Lines 302-306:
/* === REACT FLOW MIND MAP OVERRIDES === */
.react-flow__node {
  background: transparent !important;
  ...
}
```

#### 2. Backend - Pontos de Integração

**`server/routes.ts`** (1 referência)
```typescript
Lines 3899-3900:
const { registerMindMapRoutes } = await import("./routes-mindmaps");
registerMindMapRoutes(app, storage);
```

**`server/storage.ts`** (6 métodos CRUD)
```typescript
Lines 157-161: Interface IStorage
- getMindMaps(userId: string, subjectId?: string): Promise<MindMap[]>
- getMindMap(id: string): Promise<MindMap | undefined>
- createMindMap(mindMap: InsertMindMap): Promise<MindMap>
- updateMindMap(id: string, userId: string, updates: Partial<InsertMindMap>): Promise<MindMap>
- deleteMindMap(id: string, userId: string): Promise<void>

Lines 637-684: Implementação DbStorage
```

#### 3. Schema de Banco de Dados

**`shared/schema.ts`** (3 tabelas)
```typescript
Lines 259-289: mind_maps
- userId FK → users.id
- subjectId FK → subjects.id
- materialId FK → materials.id
- styleSheetId FK → mind_map_style_sheets.id

Lines 293-322: mind_map_style_sheets
- userId FK → users.id

Lines 326-342: mind_map_element_styles
- mindMapId FK → mind_maps.id
```

**Exports:**
```typescript
Line 7: mindMaps
Line 31: type MindMap
Line 32: type InsertMindMap
```

---

## 🔧 Dependências NPM Específicas

```json
{
  "@xyflow/react": "^12.3.4",      // Mind map editor (React Flow)
  "dagre": "^0.8.5",               // Layout algorithm
  "elkjs": "^0.9.3",               // Alternative layout algorithm
  "html-to-image": "^1.11.11"      // Export to PNG/SVG
}
```

---

## ✅ CHECKLIST DE REMOÇÃO COMPLETA

### Fase 1: Frontend - Remover Integrações UI

- [ ] **App.tsx** - Remover import e route de MindMaps
  ```diff
  - import MindMaps from "@/pages/mind-maps";
  - <Route path="/mind-maps" component={MindMaps} />
  ```

- [ ] **design-system.ts** - Remover link do menu lateral
  ```diff
  - {
  -   name: "Mapas Mentais",
  -   href: "/mind-maps",
  -   ...
  - }
  ```

- [ ] **dashboard-simple.tsx** - Remover quick tool
  ```diff
  - {
  -   title: "Mapas Mentais",
  -   icon: Network,
  -   href: "/mind-maps",
  -   ...
  - }
  ```

- [ ] **index.css** - Remover estilos do React Flow
  ```diff
  - /* === REACT FLOW MIND MAP OVERRIDES === */
  - .react-flow__node {
  -   background: transparent !important;
  -   ...
  - }
  ```

### Fase 2: Frontend - Deletar Arquivos

- [ ] Deletar `client/src/pages/mind-maps.tsx`
- [ ] Deletar toda pasta `client/src/lib/mindmap/`

### Fase 3: Backend - Remover Integrações

- [ ] **routes.ts** - Remover registro de rotas
  ```diff
  - const { registerMindMapRoutes } = await import("./routes-mindmaps");
  - registerMindMapRoutes(app, storage);
  ```

- [ ] **storage.ts** - Remover métodos CRUD
  ```diff
  - // Interface IStorage
  - getMindMaps(userId: string, subjectId?: string): Promise<MindMap[]>;
  - getMindMap(id: string): Promise<MindMap | undefined>;
  - createMindMap(mindMap: InsertMindMap): Promise<MindMap>;
  - updateMindMap(id: string, userId: string, updates: Partial<InsertMindMap>): Promise<MindMap>;
  - deleteMindMap(id: string, userId: string): Promise<void>;
  
  - // Implementação DbStorage (linhas 637-684)
  ```

### Fase 4: Backend - Deletar Arquivos

- [ ] Deletar `server/routes-mindmaps.ts`
- [ ] Deletar pasta `server/services/mindmap/`

### Fase 5: Schema - Remover Tabelas e Tipos

- [ ] **schema.ts** - Remover tabelas e exports
  ```diff
  - export const mindMaps = pgTable("mind_maps", { ... });
  - export const mindMapStyleSheets = pgTable("mind_map_style_sheets", { ... });
  - export const mindMapElementStyles = pgTable("mind_map_element_styles", { ... });
  
  - export type MindMap = typeof mindMaps.$inferSelect;
  - export type InsertMindMap = z.infer<typeof insertMindMapSchema>;
  
  - export const insertMindMapSchema = createInsertSchema(mindMaps).omit({ ... });
  ```

- [ ] Executar `npm run db:push --force` para dropar tabelas no banco

### Fase 6: Dependências - Limpar package.json

- [ ] Desinstalar pacotes NPM:
  ```bash
  npm uninstall @xyflow/react dagre elkjs html-to-image
  ```

- [ ] Desinstalar types (se houver):
  ```bash
  npm uninstall @types/dagre
  ```

---

## 🎯 PLANO DE ENCAPSULAMENTO TOTAL (Para Facilitar Extração Futura)

### Melhorias Sugeridas:

#### 1. Criar um Feature Module Isolado
```
client/src/features/mindmaps/
├── MindMapApp.tsx           # Entry point (substitui mind-maps.tsx)
├── lib/                     # Todo código de client/src/lib/mindmap/
├── hooks/
└── utils/
```

**App.tsx** ficaria:
```typescript
import { MindMapApp } from "@/features/mindmaps";
<Route path="/mind-maps" component={MindMapApp} />
```

#### 2. Storage Isolado
Criar `server/features/mindmaps/storage.ts` com sua própria interface, removendo métodos de `server/storage.ts`

#### 3. Schema Isolado
Criar `shared/schemas/mindmaps.ts` separado do schema principal

---

## 📊 Análise de Impacto

### Sem Mind Maps:
- ✅ Resto da aplicação funciona 100%
- ✅ Nenhuma feature depende de mapas mentais
- ✅ Banco de dados não será corrompido (CASCADE DELETE cuida das FKs)

### Com Remoção Completa:
- 📦 Package.json reduz ~4 dependências
- 🗄️ Banco de dados perde 3 tabelas
- 📁 Código reduz ~40 arquivos
- 🎯 Zero resquícios na aplicação

---

## 🚀 CONCLUSÃO

**Status Atual:** Sistema está 85% encapsulado com alguns pontos de acoplamento superficiais.

**Esforço de Remoção:** ~30 minutos seguindo o checklist acima.

**Recomendação:** 
- Se for remover, siga o checklist em ordem (UI → Backend → Schema → NPM)
- Se for manter e melhorar encapsulamento, implemente o "Feature Module Isolado"

**Exportação para Outra Aplicação:**
1. Copiar pasta `client/src/lib/mindmap/` completa
2. Copiar `server/services/mindmap/` e `server/routes-mindmaps.ts`
3. Copiar schema das 3 tabelas
4. Instalar 4 dependências NPM
5. Integrar routing conforme acima
