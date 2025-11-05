# @nup/mindmaps

Sistema completo de Mind Maps com IA integrada, layouts automáticos e exportação profissional.

## 🎯 Features

- **Mind Maps Interativos**: Editor visual com drag & drop, zoom, e pan
- **IA Generativa**: Criação automática de mind maps a partir de materiais de estudo
- **Layouts Automáticos**: Algoritmos inteligentes para organização visual
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

## 🎯 Vendável Independentemente

Este package pode ser vendido e instalado separadamente do ecossistema NuP.
