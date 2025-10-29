# Student Profile Engine

Sistema modular para manter perfis enriquecidos de alunos com dados pré-processados, otimizado para Professor IA.

## Arquitetura

```
StudentProfileService (Orquestrador Principal)
├── ProfileAnalyzer (Análise de métricas e evolução)
├── ConversationTracker (Rastreamento de conversas)
└── Database (Snapshots pré-processados)
```

## Design Pattern: Snapshot-Based

**Problema resolvido:** Evitar API calls caras durante sessões de voz em tempo real.

**Solução:** 
- Dados são processados em **background** e salvos como snapshots
- Leitura é **instantânea** (apenas SELECT no banco)
- Atualização é **assíncrona** (não bloqueia operações)

## Componentes

### 1. ProfileAnalyzer
Analisa métricas de performance e evolução temporal do aluno.

**Métodos:**
- `analyzeProfile(userId)` - Calcula métricas completas
- `analyzeBehavior(userId)` - Analisa padrões de comportamento
- `generateRecommendations(userId)` - Gera recomendações personalizadas

**Output:**
- Métricas: precisão, horas de estudo, progresso semanal/mensal
- Comportamento: streak, horário preferido, engajamento
- Recomendações: ações, próximos tópicos, mensagem motivacional

### 2. ConversationTracker
Rastreia e resume conversas usando IA (GPT-4o-mini).

**Métodos:**
- `trackConversation(userId, sessionId, messages, ...)` - Salva e analisa conversa
- `getRecentConversations(userId, limit)` - Busca conversas recentes

**Análise automática:**
- Resumo conciso da conversa
- Tópicos discutidos
- Conceitos explicados vs conceitos difíceis
- Nível de compreensão do aluno
- Sentimento e engajamento

### 3. StudentProfileService
**Interface pública** do sistema. Use este serviço para todas as operações.

**Métodos principais:**

#### `getEnrichedProfile(userId: string)` - Leitura rápida
Retorna perfil completo do aluno (snapshot já processado).

**Uso:** Chamado pelo Professor IA durante conversas de voz.

```typescript
const profile = await profileService.getEnrichedProfile(userId);

// Retorna:
{
  userId, name, age, studyObjective, learningDifficulties,
  metrics: {
    overallAccuracy, totalStudyHours, weeklyProgress, monthlyProgress,
    improvementTrend, strongSubjects, weakSubjects, currentFocus
  },
  behavior: {
    studyStreak, avgSessionDuration, preferredStudyTime, engagementLevel
  },
  recentConversations: [...],
  recommendedActions: [...],
  nextTopicsToStudy: [...]
}
```

#### `updateProfile(userId: string)` - Processamento background
Reprocessa todas as análises e atualiza snapshot.

**Uso:** Chamar após sessões de estudo, exercícios, ou conversas.

```typescript
// Não aguarda - roda em background
profileService.updateProfile(userId).catch(console.error);
```

#### `trackConversation(userId, sessionId, messages, startedAt, endedAt?)` 
Salva conversa e atualiza perfil automaticamente.

**Uso:** Chamar ao final de cada conversa com Professor IA.

```typescript
await profileService.trackConversation(
  userId,
  sessionId,
  messages, // Array de { role, content, timestamp }
  startedAt,
  endedAt
);
```

## Integração com Professor IA

### Function Calling: get_student_context

O Professor IA acessa o perfil através da função `get_student_context`:

```typescript
// server/services/realtime-voice/functions/getStudentContext.ts

const profileService = new StudentProfileService(process.env.OPENAI_API_KEY);

export const getStudentContextFunction = {
  name: 'get_student_context',
  handler: async (args, context) => {
    const enrichedProfile = await profileService.getEnrichedProfile(context.userId);
    // ... retorna dados formatados
  }
}
```

**Benefícios:**
- ✅ Leitura instantânea (sem processamento caro)
- ✅ Dados sempre atualizados (background processing)
- ✅ Contexto rico (métricas + conversas + recomendações)

## Quando chamar updateProfile?

Atualize o perfil após eventos significativos:

1. **Após sessões de estudo** (quando aluno completa material)
2. **Após exercícios/questões** (para atualizar métricas)
3. **Após conversas** (automaticamente via trackConversation)
4. **Periodicamente** (ex: a cada 24h para usuários ativos)

## Database Schema

### student_profiles_enriched
Snapshot do perfil enriquecido (atualizado em background).

**Campos principais:**
- Perfil básico: name, age, studyObjective, learningDifficulties
- Métricas: overallAccuracy, totalStudyHours, weeklyProgress, monthlyProgress
- Comportamento: studyStreak, avgSessionDuration, preferredStudyTime
- Recomendações: recommendedActions, nextTopicsToStudy, motivationalMessage

### conversation_summaries
Histórico de conversas com análise automática.

**Campos principais:**
- sessionId, startedAt, endedAt, duration
- subject, topics, summary, keyPoints
- conceptsExplained, difficultConcepts, masteredConcepts
- studentUnderstanding, studentSentiment, engagementScore

### profile_metrics
Métricas detalhadas por categoria/período (futuro - não implementado ainda).

## Exemplo de Uso Completo

```typescript
import { StudentProfileService } from './services/student-profile-engine';

const profileService = new StudentProfileService(process.env.OPENAI_API_KEY);

// 1. Aluno inicia conversa com Professor IA
const profile = await profileService.getEnrichedProfile(userId);
// → Professor IA usa perfil para personalizar ensino

// 2. Conversa acontece...
const messages = [
  { role: 'user', content: 'Explica logaritmo?', timestamp: new Date() },
  { role: 'assistant', content: 'Logaritmo é...', timestamp: new Date() },
  // ...
];

// 3. Conversa termina - rastrear e atualizar
await profileService.trackConversation(
  userId, 
  sessionId, 
  messages, 
  conversationStartedAt,
  conversationEndedAt
);
// → Perfil é atualizado automaticamente em background

// 4. Próxima conversa - dados já estão atualizados
const updatedProfile = await profileService.getEnrichedProfile(userId);
// → Professor IA vê evolução, tópicos discutidos, dificuldades identificadas
```

## Performance

- **Leitura (getEnrichedProfile):** ~10-50ms (apenas SELECT)
- **Escrita (updateProfile):** ~500-2000ms (processamento completo)
- **Análise de conversa:** ~1-3s (depende do tamanho, usa GPT-4o-mini)

**Estratégia:** Leituras rápidas durante voz, escrita em background.

## Próximos Passos

1. **Backfill:** Criar perfis enriquecidos para usuários existentes
2. **Triggers:** Chamar updateProfile automaticamente após eventos
3. **Monitoring:** Acompanhar taxa de fallback do ConversationTracker
4. **Metrics table:** Implementar profile_metrics para histórico detalhado
5. **Cache layer:** Adicionar Redis para perfis muito acessados

## Manutenção

### Adicionar nova métrica
1. Adicionar campo em `student_profiles_enriched` (schema.ts)
2. Atualizar `ProfileAnalysis` type (types.ts)
3. Calcular métrica em `ProfileAnalyzer.analyzeProfile()`
4. Mapear em `StudentProfileService.updateProfile()`

### Adicionar novo campo de conversa
1. Adicionar campo em `conversation_summaries` (schema.ts)
2. Atualizar `ConversationAnalysis` type (types.ts)
3. Extrair dados em `ConversationTracker.analyzeConversation()`

## Troubleshooting

**Perfil retorna null:**
- Usuário novo? Perfil é criado automaticamente na primeira chamada
- Verificar se usuário existe na tabela `users`

**Métricas zeradas:**
- Perfil foi criado mas ainda não atualizado? Chamar `updateProfile()`
- Usuário tem dados em `subjects`, `question_attempts`, `conversation_summaries`?

**Análise de conversa falhando:**
- API key configurada? `process.env.OPENAI_API_KEY`
- Quota da OpenAI? Sistema usa fallback automático
- Ver logs: `[ConversationTracker]`
