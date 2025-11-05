# @nup/flashcards

Sistema completo de flashcards com geração via IA e técnicas de repetição espaçada.

## 🎯 Features

- **Geração via IA**: Crie flashcards automaticamente a partir de mind maps e materiais
- **Repetição Espaçada**: Sistema otimizado para memorização de longo prazo
- **Estatísticas Detalhadas**: Acompanhe seu progresso e performance
- **Flip Animation**: Animações suaves e profissionais
- **Dark Mode**: Suporte completo a temas
- **Quiz Mode**: Modo de estudo focado e sem distrações

## 📦 Instalação

```bash
pnpm add @nup/flashcards @nup/ui @nup/api-client @nup/shared-types
```

## 🚀 Uso Básico

```tsx
import { FlashcardStudy } from '@nup/flashcards';

function App() {
  return <FlashcardStudy />;
}
```

## 🔧 Componentes Disponíveis

### FlashcardStudy
Interface completa de estudo com estatísticas.

```tsx
import { FlashcardStudy } from '@nup/flashcards';

<FlashcardStudy />
```

### GenerateFlashcardsDialog
Dialog para geração de flashcards via IA.

```tsx
import { GenerateFlashcardsDialog } from '@nup/flashcards';

<GenerateFlashcardsDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  sourceType="mindmap"
  sourceId="uuid-do-mindmap"
  subjectId="uuid-da-materia"
/>
```

### FlashcardReview
Componente standalone para revisão.

```tsx
import { FlashcardReview } from '@nup/flashcards';

<FlashcardReview
  cards={flashcards}
  onComplete={(stats) => console.log('Completed:', stats)}
/>
```

## ⚙️ Providers Necessários

```tsx
import { ThemeContext } from '@nup/ui';
import { QueryClientProvider } from '@tanstack/react-query';

<QueryClientProvider client={queryClient}>
  <ThemeContext.Provider value={{ theme, setTheme }}>
    <FlashcardStudy />
  </ThemeContext.Provider>
</QueryClientProvider>
```

## 📊 API Endpoints

O package espera os seguintes endpoints:

- `GET /api/flashcards` - Listar flashcards
- `POST /api/flashcards` - Criar flashcard
- `PATCH /api/flashcards/:id` - Atualizar flashcard
- `DELETE /api/flashcards/:id` - Deletar flashcard
- `POST /api/ai/flashcards/generate` - Gerar via IA

### Geração via IA

```typescript
POST /api/ai/flashcards/generate
{
  "sourceType": "mindmap" | "material",
  "sourceId": "uuid",
  "subjectId": "uuid",
  "quantity": 10
}

Response: Flashcard[]
```

## 📝 Estrutura de Dados

```typescript
interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  nextReview?: Date;
  lastReviewed?: Date;
  reviewCount: number;
}
```

## 🎯 Vendável Independentemente

Este package pode ser vendido e instalado separadamente do ecossistema NuP. Requer:

1. Backend REST API compatível
2. Providers configurados (Theme, QueryClient)
3. Sistema de autenticação (opcional)

## 🔑 Keyboard Shortcuts

- `Space` - Revelar resposta
- `1` - Fácil
- `2` - Médio
- `3` - Difícil
- `Esc` - Sair do quiz mode

## 📦 Dependencies

Peer dependencies necessárias:

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0
- `lucide-react` >= 0.400.0

## 📚 Mais Informações

- Documentação completa: [Em desenvolvimento]
- Exemplos: Ver `apps/nup-study` no monorepo
- Suporte: contato@nup.com.br
