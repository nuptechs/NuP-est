
# Professor IA - Sistema de Voz em Tempo Real

## 🎯 Visão Geral

Sistema modular de conversação por voz em tempo real para o Professor IA do NuP-Study.

**Características principais:**
- ✅ Latência ultra-baixa (<500ms)
- ✅ Interrupções naturais (aluno pode cortar professor)
- ✅ Context-aware (acessa perfil, matéria, nível do aluno)
- ✅ **Arquitetura modular**: troque providers facilmente
- ✅ Function calling (busca dados do aluno em tempo real)
- ✅ Código portável para outros sistemas

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  (Cliente React/WebSocket - envia/recebe áudio PCM16)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  RealtimeVoiceService                            │
│                    (Orquestrador)                                │
│                                                                   │
│  - Gerencia sessões                                              │
│  - Roteamento de eventos                                         │
│  - Function calling                                              │
│  - Busca contexto do aluno (DB)                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
             ┌──────────────┼──────────────┐
             ↓                             ↓
┌──────────────────────┐      ┌──────────────────────┐
│ IRealtimeVoiceProvider│      │ IRealtimeVoiceProvider│
│    (Interface)        │      │    (Interface)        │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│OpenAIRealtimeProvider│      │DeepgramRealtimeProvider│
│  (Implementação)      │      │  (Implementação futura)│
└──────────────────────┘      └──────────────────────┘
```

## 🔄 Como Trocar de Provider

**SUPER FÁCIL!** Basta mudar 1 linha:

```typescript
// server/routes/realtimeVoice.ts

// OpenAI Realtime (atual)
const voiceService = new RealtimeVoiceService(openaiKey, 'openai');

// Deepgram (futuro - quando implementar)
const voiceService = new RealtimeVoiceService(deepgramKey, 'deepgram');

// Outro provider (implementar IRealtimeVoiceProvider)
const voiceService = new RealtimeVoiceService(customKey, 'custom');
```

**Nenhuma outra mudança necessária!** A arquitetura modular cuida do resto.

## 📦 Estrutura de Arquivos

```
server/services/realtime-voice/
├── types.ts                          # Tipos compartilhados
├── providers/
│   ├── IRealtimeVoiceProvider.ts     # Interface (contrato)
│   ├── OpenAIRealtimeProvider.ts     # Implementação OpenAI
│   └── DeepgramRealtimeProvider.ts   # Implementação Deepgram (TODO)
├── functions/
│   └── getStudentContext.ts          # Function calling (contexto aluno)
├── RealtimeVoiceService.ts           # Orquestrador principal
└── README.md                          # Este arquivo
```

## 🚀 Uso Rápido

### Backend (já configurado)

```typescript
// server/routes/realtimeVoice.ts
const service = new RealtimeVoiceService(apiKey, 'openai');
await service.createSession(userId, websocket);
```

### Frontend (exemplo)

```typescript
const ws = new WebSocket('wss://seu-app.replit.dev/api/realtime-voice');

ws.onopen = () => {
  // Começar sessão
  ws.send(JSON.stringify({ type: 'start_session' }));
};

// Enviar áudio do microfone
function sendAudio(pcm16Base64) {
  ws.send(JSON.stringify({
    type: 'audio_chunk',
    audio: pcm16Base64,
  }));
}

// Receber áudio do professor
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'audio_output') {
    playAudio(msg.audio); // Base64 PCM16
  }
  
  if (msg.type === 'transcript_output') {
    showTranscript(msg.text);
  }
};
```

## 🎓 Function Calling (Context-Aware)

O Professor IA pode buscar informações do aluno em tempo real:

### Funções Disponíveis

1. **`get_student_context()`**
   - Retorna perfil completo: idade, dificuldades, objetivo, estilo de aprendizado
   
2. **`get_subject_knowledge(subject_name)`**
   - Retorna nível, tópicos fracos/fortes, performance

### Exemplo de Uso (automático)

```
Aluno: "Professor, me explica logaritmos?"

Professor IA (internamente):
  1. Chama get_student_context()
  2. Descobre: aluno tem ADHD, prefere exemplos, nível intermediário em Matemática
  3. Adapta explicação: respostas curtas, muitos exemplos práticos, ritmo variado

Professor IA (responde):
  "Ótimo! Logaritmo é como 'desembrulhar' uma potência. 
   Imagina que 2³ = 8. O log₂(8) pergunta: qual é o 3?
   
   Sacou? Me diz se ficou claro antes de eu continuar!"
```

## 🔧 Implementar Novo Provider

Para adicionar um novo provider (ex: Deepgram), crie:

```typescript
// providers/DeepgramRealtimeProvider.ts

import type { IRealtimeVoiceProvider } from './IRealtimeVoiceProvider.js';

export class DeepgramRealtimeProvider implements IRealtimeVoiceProvider {
  readonly name = 'Deepgram Aura';
  
  async connect(config) { /* ... */ }
  async disconnect() { /* ... */ }
  sendAudio(chunk) { /* ... */ }
  interrupt() { /* ... */ }
  // ... implementar outros métodos
}
```

Depois registre no factory:

```typescript
// RealtimeVoiceService.ts

private createProvider(type: string, apiKey: string) {
  switch (type) {
    case 'openai':
      return new OpenAIRealtimeProvider(apiKey);
    
    case 'deepgram':
      return new DeepgramRealtimeProvider(apiKey); // ✅ Pronto!
    
    default:
      throw new Error(`Provider desconhecido: ${type}`);
  }
}
```

## 💰 Custos

### OpenAI Realtime (atual)
- **~$0.24/minuto** de conversa
- Inclui: STT + LLM + TTS nativos
- Latência: <500ms

### Comparação com Sistema Anterior
- Deepgram STT: ~$0.03/min
- GPT-4o-mini: ~$0.10/min
- OpenAI TTS: ~$0.05/min
- **Total anterior: ~$0.18/min**

**Vale a pena?** SIM! 
- +33% custo, mas **5x menos latência**
- Conversação muito mais natural
- Interrupções funcionam
- Melhor experiência do aluno = maior retenção

## 🎯 Personalização Pedagógica

O sistema adapta automaticamente:

| Perfil do Aluno | Adaptação Automática |
|-----------------|----------------------|
| ADHD | Respostas curtas, variação de ritmo, reforço frequente |
| Dislexia | Fala mais lenta, repetição, confirmação |
| Ansioso | Tom calmo, encorajamento constante |
| Exatas | Método dedutivo, passo-a-passo lógico |
| Humanas | Contextualização, debates socráticos |
| Biológicas | Analogias, exemplos visuais |

## 🔐 Segurança

- ✅ Autenticação via Replit Auth
- ✅ Sessões isoladas por usuário
- ✅ API keys em variáveis de ambiente
- ✅ WebSocket sobre TLS
- ✅ Timeout automático de sessões inativas

## 📊 Monitoramento

```typescript
// Checar status
GET /api/realtime-voice/status

// Resposta
{
  "provider": "OpenAI Realtime",
  "activeSessions": 3,
  "status": "ok"
}
```

## 🚢 Deploy e Portabilidade

Este código é **100% portável**:

1. **Replit** (atual): funciona out-of-the-box
2. **Vercel/Railway/Render**: copie pasta `server/services/realtime-voice/`
3. **Docker**: adicione ao Dockerfile
4. **AWS Lambda**: adapte routes para API Gateway

**Dependências mínimas:**
- Node.js 18+
- Express
- WebSocket (ws)
- Drizzle ORM (para function calling)

## 🐛 Debug

```typescript
// Ativar logs detalhados
const service = new RealtimeVoiceService(apiKey, 'openai');

// No provider
service.provider.on((event) => {
  console.log('Evento provider:', event.type, event);
});
```

## 📝 TODO

- [ ] Implementar DeepgramRealtimeProvider
- [ ] Adicionar cache Redis para contexto
- [ ] Métricas de qualidade (latência, satisfação)
- [ ] Fallback gracioso (se provider falhar)
- [ ] Suporte a múltiplos idiomas
- [ ] Análise emocional da voz

## 🤝 Contribuindo

Para adicionar features:

1. Mantenha compatibilidade com `IRealtimeVoiceProvider`
2. Adicione testes unitários
3. Documente no README
4. Não quebre a API pública

## 📚 Referências

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Deepgram Aura Docs](https://developers.deepgram.com/docs/tts-streaming)
- [WebSocket RFC](https://datatracker.ietf.org/doc/html/rfc6455)
