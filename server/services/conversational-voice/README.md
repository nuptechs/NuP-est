# Sistema de Voz Conversacional

Sistema inteligente de voz que combina **Deepgram STT + OpenAI GPT + Deepgram TTS** para criar uma experiência conversacional natural em português.

## 🎯 Funcionalidades

- ✅ **Transcrição em tempo real** (Deepgram Nova-2)
- ✅ **Processamento inteligente** (OpenAI GPT-4o-mini)
- ✅ **Síntese de voz natural** (Deepgram Aura PT)
- ✅ **Latência baixa** (~500ms total)
- ✅ **Interrupções suaves** do usuário
- ✅ **Contexto de conversa** mantido
- ✅ **Português nativo**

## 🏗️ Arquitetura

```
Usuário fala → Deepgram STT → OpenAI GPT-4 → Deepgram TTS → Usuário ouve
     ↑                                                              ↓
     └──────────────────── WebSocket Real-Time ─────────────────────┘
```

### Fluxo de Dados

1. **Captura**: Navegador captura áudio do microfone
2. **Transmissão**: Áudio enviado via WebSocket para servidor
3. **STT**: Deepgram transcreve para texto em tempo real
4. **LLM**: OpenAI processa e gera resposta
5. **TTS**: Deepgram sintetiza resposta em áudio
6. **Reprodução**: Navegador reproduz áudio da resposta

## 🚀 Como Usar

### Backend

```typescript
import { setupConversationalVoiceRoutes } from './routes/conversationalVoice';

// Configurar rotas WebSocket
setupConversationalVoiceRoutes(app, httpServer);
```

### Frontend

```typescript
import { ConversationalVoiceClient } from '@/services/conversational-voice';

// Criar cliente
const client = new ConversationalVoiceClient({
  onConnectionChange: (state) => console.log('Conexão:', state),
  onConversationStateChange: (state) => console.log('Conversa:', state),
  onTranscript: (text, isFinal) => console.log('Você disse:', text),
  onAssistantMessage: (text) => console.log('Assistente:', text),
  onError: (error) => console.error('Erro:', error),
});

// Conectar
await client.connect();

// Iniciar escuta
await client.startListening();

// Parar escuta
client.stopListening();

// Interromper assistente
client.interrupt();

// Resetar conversa
client.reset();

// Desconectar
client.disconnect();
```

## 📊 Performance

| Métrica | Valor |
|---------|-------|
| Latência STT | ~100-150ms |
| Processamento LLM | ~200-300ms |
| Latência TTS | ~150-200ms |
| **Total** | **~500ms** |

## 💰 Custos

### Por Hora de Uso

| Serviço | Custo/hora |
|---------|------------|
| Deepgram STT | ~$1.50 |
| OpenAI GPT-4o-mini | ~$0.50 |
| Deepgram TTS | ~$2.00 |
| **Total** | **~$4.00/hora** |

**Comparação**: Deepgram Voice Agent API = ~$4.50/hora

## 🔧 Configuração

### Variáveis de Ambiente

```bash
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
```

### Personalização

#### Alterar Prompt do Sistema

```typescript
const client = new ConversationalVoiceClient(callbacks, {
  assistantConfig: {
    systemPrompt: 'Você é um tutor de matemática especializado...',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  },
});
```

#### Configuração de Áudio

```typescript
const client = new ConversationalVoiceClient(callbacks, {
  audioConfig: {
    encoding: 'linear16',
    sampleRate: 16000,
    channels: 1,
  },
});
```

## 🧪 Testar

Acesse: **`/conversational-voice-test`**

Ou use o componente diretamente:

```tsx
import { ConversationalVoiceDemo } from '@/components/conversational-voice/ConversationalVoiceDemo';

function MyPage() {
  return <ConversationalVoiceDemo />;
}
```

## 🐛 Troubleshooting

### Microfone não funciona

- ✅ Verifique se está usando **HTTPS** ou **localhost**
- ✅ Permita acesso ao microfone no navegador
- ✅ Teste em navegador compatível (Chrome recomendado)

### Sem áudio do assistente

- ✅ Verifique volume do sistema
- ✅ Veja console do browser para erros
- ✅ Teste com navegador diferente

### Erro de conexão

- ✅ Verifique se variáveis de ambiente estão configuradas
- ✅ Confirme que servidor está rodando
- ✅ Veja logs do servidor para detalhes

## 📁 Estrutura de Arquivos

```
server/services/conversational-voice/
├── types.ts                           # Tipos TypeScript
├── ConversationalVoiceService.ts      # Serviço principal
└── index.ts                           # Exports

server/routes/
└── conversationalVoice.ts             # Rotas WebSocket

client/src/services/conversational-voice/
├── types.ts                           # Tipos do cliente
├── ConversationalVoiceClient.ts       # Cliente WebSocket
└── index.ts                           # Exports

client/src/components/conversational-voice/
└── ConversationalVoiceDemo.tsx        # Componente demo
```

## 🔄 Ciclo de Vida

```
1. IDLE → aguardando início
2. LISTENING → capturando áudio do usuário
3. THINKING → processando com OpenAI
4. SPEAKING → reproduzindo resposta
5. → volta para IDLE ou LISTENING
```

## 🎨 Estados

### ConnectionState
- `disconnected` - Não conectado
- `connecting` - Conectando...
- `connected` - Conectado
- `error` - Erro de conexão

### ConversationState
- `idle` - Aguardando
- `listening` - Escutando usuário
- `thinking` - Processando
- `speaking` - Falando resposta

## ✨ Vantagens vs Voice Agent API

| Feature | ConversationalVoice | Voice Agent API |
|---------|---------------------|-----------------|
| **Controle total** | ✅ Sim | ❌ Limitado |
| **Customização** | ✅ Total | ⚠️ Parcial |
| **Debug** | ✅ Fácil | ⚠️ Complexo |
| **Flexibilidade** | ✅ Alta | ⚠️ Média |
| **Custo** | 💰 ~$4/h | 💰 ~$4.50/h |
| **Setup** | ⚠️ Manual | ✅ Automático |

## 🚀 Melhorias Futuras

- [ ] Suporte a múltiplos idiomas
- [ ] Cache de respostas frequentes
- [ ] Integração com perfil do estudante
- [ ] Histórico de conversas persistente
- [ ] Análise de sentimento
- [ ] Detecção de intenção

## 📖 Documentação API

### Mensagens do Cliente → Servidor

```typescript
{ type: 'audio', data: string }           // Chunk de áudio base64
{ type: 'start_listening' }               // Iniciar escuta
{ type: 'stop_listening' }                // Parar escuta
{ type: 'interrupt' }                      // Interromper assistente
{ type: 'reset' }                          // Resetar conversa
```

### Mensagens do Servidor → Cliente

```typescript
{ type: 'ready' }                          // Sistema pronto
{ type: 'listening' }                      // Escutando
{ type: 'transcript', text, isFinal }      // Transcrição
{ type: 'thinking' }                       // Processando
{ type: 'speaking', text }                 // Falando (com texto)
{ type: 'audio', data }                    // Chunk de áudio
{ type: 'done' }                           // Concluído
{ type: 'error', error }                   // Erro
```

## 🤝 Contribuindo

Este sistema foi projetado para ser modular e extensível. Sinta-se livre para:

- Adicionar novos providers de STT/TTS
- Customizar comportamento do LLM
- Melhorar tratamento de erros
- Otimizar performance

## 📝 License

MIT
