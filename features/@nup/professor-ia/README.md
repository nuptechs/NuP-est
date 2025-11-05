# @nup/professor-ia

Sistema de voz em tempo real para tutoria adaptativa com ultra-baixa latência (<500ms).

## 🎯 Features

- **Ultra-Low Latency**: Conversação em tempo real com <500ms de latência
- **OpenAI Realtime API**: Streaming bidirecional de áudio
- **Pedagogia Adaptativa**: Ajuste automático ao perfil do estudante
- **Function Calling**: Acesso ao contexto do estudante em tempo real
- **Auto-Interrupt**: Interrupção inteligente para conversas naturais
- **Transcrição em Tempo Real**: Visualização de fala do usuário e do professor
- **Controles Avançados**: Configuração de tempo de resposta e interrupções

## 📦 Instalação

```bash
pnpm add @nup/professor-ia @nup/ui @nup/api-client
```

## 🚀 Uso Básico

```tsx
import { ProfessorIA } from '@nup/professor-ia';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ProfessorIA />
    </div>
  );
}
```

## 🔧 Hook Personalizado

Para integração customizada, use o hook `useRealtimeVoice`:

```tsx
import { useRealtimeVoice } from '@nup/professor-ia';

function CustomVoiceUI() {
  const {
    state,
    error,
    transcripts,
    isConnected,
    connect,
    disconnect,
    interrupt
  } = useRealtimeVoice();

  return (
    <div>
      <p>Estado: {state}</p>
      <button onClick={connect}>Iniciar</button>
      <button onClick={disconnect}>Desconectar</button>
      <button onClick={interrupt}>Interromper</button>
      
      {transcripts.map((t, i) => (
        <div key={i}>
          <strong>{t.speaker}:</strong> {t.text}
        </div>
      ))}
    </div>
  );
}
```

## ⚙️ Backend Setup

O package requer um backend WebSocket configurado:

### Endpoint
```
WS /api/voice/realtime
```

### Implementação Exemplo

```typescript
// server/routes/voice.ts
import { createRealtimeSession } from './voice-service';

app.ws('/api/voice/realtime', async (ws, req) => {
  const session = await createRealtimeSession(req.user);
  
  ws.on('message', (msg) => {
    session.handleMessage(msg);
  });
  
  session.on('audio', (audio) => {
    ws.send(audio);
  });
});
```

## 🔐 Autenticação

O sistema usa a sessão autenticada do usuário para carregar perfil e contexto:

```typescript
// Dados carregados automaticamente:
- Perfil do estudante (dificuldades, TDAH, objetivos)
- Matérias em estudo
- Histórico de conversas
- Materiais de estudo
```

## 🎛️ Configurações

### Auto-Interrupt
```tsx
const { 
  autoInterruptEnabled, 
  toggleAutoInterrupt 
} = useRealtimeVoice();

<Switch 
  checked={autoInterruptEnabled}
  onCheckedChange={toggleAutoInterrupt}
/>
```

### Tempo Máximo de Resposta
```tsx
const { 
  maxResponseTime, 
  setMaxResponseTime 
} = useRealtimeVoice();

<Slider
  value={[maxResponseTime]}
  onValueChange={([v]) => setMaxResponseTime(v)}
  min={3000}
  max={30000}
  step={1000}
/>
```

## 📊 Estados da Conversa

| Estado | Descrição |
|--------|-----------|
| `idle` | Desconectado |
| `connecting` | Estabelecendo conexão |
| `listening` | Ouvindo o usuário |
| `thinking` | Processando pergunta |
| `speaking` | Professor respondendo |
| `error` | Erro na conexão |

## 🔑 Environment Variables

```env
OPENAI_API_KEY=sk-...
```

## 🎯 Vendável Independentemente

Este package pode ser vendido e instalado separadamente do ecossistema NuP. Requer:

1. Backend WebSocket com OpenAI Realtime API
2. Sistema de autenticação
3. Providers configurados (Theme, QueryClient)

## 🔊 Requisitos de Áudio

- Navegador com suporte a WebRTC
- Permissão de microfone
- Conexão estável (recomendado: >= 1Mbps)

## 📚 Mais Informações

- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
- Exemplos: Ver `apps/nup-study` no monorepo
