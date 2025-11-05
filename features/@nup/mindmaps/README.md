# @nup/mindmaps

Sistema completo de Mind Maps com IA integrada, layouts automáticos e exportação profissional.

## 🎯 Features

- **Mind Maps Interativos**: Editor visual com drag & drop, zoom, e pan
- **IA Generativa**: Criação automática de mind maps a partir de materiais de estudo
- **RAG Integration**: Sistema híbrido de busca (BM25 + Vector) para geração contextual
- **Layouts Automáticos**: Algoritmos inteligentes (Dagre, ELK) para organização visual
- **Estilos Profissionais**: 12 folhas de estilo pré-configuradas (SimpleMind, Colorful, etc.)
- **Exportação**: SVG, PNG, PDF de alta qualidade
- **Modo Apresentação**: Visualização otimizada para apresentações
- **Outline View**: Visão hierárquica em lista
- **Dark Mode**: Suporte completo a temas
- **Customização Avançada**: Cores, formas, bordas, tipografia por elemento

## 📦 Instalação

```bash
pnpm add @nup/mindmaps @nup/ui @nup/api-client @nup/shared-types
```

### Opcional: Integração com Flashcards
```bash
pnpm add @nup/flashcards
```

## 🚀 Uso Básico

```tsx
import { MindMapApp } from '@nup/mindmaps';
import { ReactFlowProvider } from '@xyflow/react';

function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <MindMapApp />
      </div>
    </ReactFlowProvider>
  );
}
```

## 🔧 Componentes Disponíveis

### MindMapApp
Aplicação completa com UI de seleção e criação de mind maps.

### MindMapEditor
Editor standalone para casos customizados.

```tsx
import { MindMapEditor } from '@nup/mindmaps';

<ReactFlowProvider>
  <MindMapEditor
    title="Meu Mind Map"
    initialData={mindMapData}
    onSave={(data) => console.log('Saved:', data)}
  />
</ReactFlowProvider>
```

## ⚙️ Providers Necessários

```tsx
import { ThemeContext } from '@nup/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from '@xyflow/react';

<QueryClientProvider client={queryClient}>
  <ThemeContext.Provider value={{ theme, setTheme }}>
    <ReactFlowProvider>
      <MindMapApp />
    </ReactFlowProvider>
  </ThemeContext.Provider>
</QueryClientProvider>
```

## 🛠️ Backend Setup Completo

### 1. API Endpoints REST

#### Mind Maps CRUD
```typescript
// Listar mind maps do usuário
GET /api/mindmaps
Response: MindMap[]

// Criar mind map
POST /api/mindmaps
Body: {
  title: string;
  subjectId?: string;
  materialId?: string;
  content: { nodes: [], edges: [] };
  generatedFromAI: boolean;
}
Response: MindMap

// Atualizar mind map
PATCH /api/mindmaps/:id
Body: Partial<MindMap>
Response: MindMap

// Deletar mind map
DELETE /api/mindmaps/:id
Response: { success: boolean }
```

#### Suporte (para filtros e categorização)
```typescript
// Listar matérias
GET /api/subjects
Response: Subject[]

// Listar materiais (para geração IA)
GET /api/materials
Query: ?subjectId=uuid
Response: Material[]
```

### 2. Sistema de IA/RAG para Geração

O package espera um endpoint de geração via IA com RAG:

```typescript
POST /api/ai/mindmap
Headers: {
  Authorization: Bearer <token>
}
Body: {
  materialId?: string;     // ID do material para extrair conteúdo
  subjectId: string;       // ID da matéria
  rawContent?: string;     // Ou conteúdo direto
  options?: {
    maxDepth?: number;     // Profundidade máxima do mapa (padrão: 3)
    maxNodes?: number;     // Número máximo de nós (padrão: 50)
    focusAreas?: string[]; // Áreas específicas de foco
  }
}

Response: {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  metadata?: {
    tokensUsed: number;
    processingTime: number;
    sources: string[];
  }
}
```

### 3. Implementação de Backend Recomendada

#### Pipeline de IA para Mind Maps

```typescript
// Exemplo de implementação Node.js/Express
import { OpenAI } from 'openai';

class MindMapAIService {
  private openai: OpenAI;
  private ragService: RAGService; // Sistema de busca híbrida
  
  async generateMindMap(params: {
    materialId?: string;
    subjectId: string;
    rawContent?: string;
    options?: GenerationOptions;
  }): Promise<MindMapData> {
    
    // 1. Buscar conteúdo do material (se materialId fornecido)
    let content = params.rawContent;
    if (params.materialId) {
      const material = await this.getMaterial(params.materialId);
      content = await this.extractTextFromMaterial(material);
    }
    
    // 2. Buscar contexto adicional via RAG (opcional mas recomendado)
    const relatedContent = await this.ragService.search({
      query: content.substring(0, 500), // Primeiros 500 chars
      subjectId: params.subjectId,
      limit: 3
    });
    
    // 3. Montar prompt com contexto
    const prompt = this.buildMindMapPrompt({
      mainContent: content,
      relatedContent,
      maxDepth: params.options?.maxDepth ?? 3,
      maxNodes: params.options?.maxNodes ?? 50
    });
    
    // 4. Chamar OpenAI com structured outputs
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em criar mind maps educacionais.' },
        { role: 'user', content: prompt }
      ],
      response_format: { 
        type: 'json_schema',
        json_schema: {
          name: 'mindmap',
          schema: {
            type: 'object',
            properties: {
              nodes: { type: 'array', items: { /* ... */ } },
              edges: { type: 'array', items: { /* ... */ } }
            }
          }
        }
      }
    });
    
    // 5. Processar e retornar
    const data = JSON.parse(response.choices[0].message.content);
    return this.processMindMapData(data);
  }
  
  private buildMindMapPrompt(params: {
    mainContent: string;
    relatedContent: any[];
    maxDepth: number;
    maxNodes: number;
  }): string {
    return `
Crie um mind map estruturado a partir do seguinte conteúdo:

=== CONTEÚDO PRINCIPAL ===
${params.mainContent}

=== CONTEXTO ADICIONAL ===
${params.relatedContent.map(c => c.text).join('\n\n')}

INSTRUÇÕES:
- Profundidade máxima: ${params.maxDepth} níveis
- Máximo de ${params.maxNodes} nós
- Estrutura hierárquica clara (root -> branches -> leaves)
- Cada nó deve ter: id único, label descritivo, type (root/branch/leaf)
- Conexões lógicas entre conceitos

Retorne JSON no formato:
{
  "nodes": [{ "id": "1", "data": { "label": "Conceito Central", "type": "root" }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "e1-2", "source": "1", "target": "2" }]
}
    `.trim();
  }
}
```

#### Sistema RAG Híbrido (Opcional mas Recomendado)

```typescript
// Implementação com Pinecone + BM25
class RAGService {
  private pinecone: PineconeClient;
  private bm25Index: BM25Index;
  
  async search(params: {
    query: string;
    subjectId: string;
    limit: number;
  }): Promise<SearchResult[]> {
    
    // 1. Busca por palavra-chave (BM25)
    const keywordResults = await this.bm25Index.search({
      query: params.query,
      filters: { subjectId: params.subjectId },
      limit: params.limit * 2
    });
    
    // 2. Busca vetorial (Pinecone)
    const embedding = await this.getEmbedding(params.query);
    const vectorResults = await this.pinecone.query({
      vector: embedding,
      filter: { subjectId: params.subjectId },
      topK: params.limit * 2
    });
    
    // 3. Re-ranking híbrido
    const combined = this.hybridRanking(keywordResults, vectorResults);
    
    return combined.slice(0, params.limit);
  }
}
```

### 4. Storage Requirements

```sql
-- Mind Maps table
CREATE TABLE mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  material_id UUID REFERENCES materials(id),
  title VARCHAR NOT NULL,
  description TEXT,
  content JSONB NOT NULL,  -- { nodes: [], edges: [], config: {} }
  generated_from_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes recomendados
CREATE INDEX idx_mindmaps_user ON mindmaps(user_id);
CREATE INDEX idx_mindmaps_subject ON mindmaps(subject_id);
CREATE INDEX idx_mindmaps_material ON mindmaps(material_id);
```

### 5. Environment Variables

```env
# OpenAI para geração
OPENAI_API_KEY=sk-...

# RAG (opcional)
PINECONE_API_KEY=...
PINECONE_INDEX=nup-knowledge

# Database
DATABASE_URL=postgresql://...
```

## 📊 Estrutura de Dados

```typescript
interface MindMap {
  id: string;
  userId: string;
  subjectId?: string;
  materialId?: string;
  title: string;
  description?: string;
  content: MindMapContent;
  generatedFromAI: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MindMapContent {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  config?: MindMapConfig;
}

interface MindMapNode {
  id: string;
  data: {
    label: string;
    type?: 'root' | 'branch' | 'leaf';
    level?: number;
  };
  position: { x: number; y: number };
}

interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}
```

## 🎯 Vendável Independentemente

Este package pode ser vendido e instalado separadamente do ecossistema NuP. Requer:

1. **Backend REST API** com endpoints documentados acima
2. **Sistema de IA** (OpenAI GPT-4o-mini recomendado)
3. **RAG opcional** (Pinecone + BM25 para melhor qualidade)
4. **Providers** configurados (Theme, QueryClient, ReactFlow)
5. **Database** PostgreSQL com tabelas necessárias

## 🔌 Integração Opcional com @nup/flashcards

Se instalado, permite gerar flashcards a partir de mind maps:

```tsx
import { MindMapApp } from '@nup/mindmaps';
// @nup/flashcards instalado automaticamente habilita o botão

<MindMapApp /> // Botão "Gerar Flashcards" aparece automaticamente
```

## 🎨 Customização de Estilos

12 estilos pré-configurados disponíveis:
- `default`, `simplemind`, `colorful`, `professional`
- `minimal`, `vibrant`, `organic`, `modern`
- `pastel`, `monochrome`, `nature`, `ocean`

## 🔑 Keyboard Shortcuts

- `Ctrl/Cmd + Z` - Desfazer
- `Ctrl/Cmd + Y` - Refazer
- `Delete` - Deletar nó
- `Tab` - Adicionar nó filho
- `Enter` - Adicionar nó irmão
- `Ctrl/Cmd + F` - Buscar
- `F11` - Modo apresentação

## 📦 Dependencies

Peer dependencies necessárias:

- `react` >= 18.0.0
- `@xyflow/react` >= 12.0.0
- `@tanstack/react-query` >= 5.0.0
- `lucide-react` >= 0.400.0
- `@nup/flashcards` (opcional)

## 📚 Mais Informações

- Exemplos completos: Ver `apps/nup-study` no monorepo
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- React Flow: https://reactflow.dev/
