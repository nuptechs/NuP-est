# Deepgram Voice Agent Module

Módulo completo e encapsulado para conversação em tempo real usando Deepgram Voice Agent API.

## 📦 Características

- ✅ **Conversação bidirecional em tempo real** (WebSocket)
- ✅ **STT (Speech-to-Text)** com Deepgram Nova-3 (~99% accuracy, <300ms latency)
- ✅ **LLM orchestration** com OpenAI GPT-4o-mini
- ✅ **TTS (Text-to-Speech)** configurável
- ✅ **Function calling** support
- ✅ **Gerenciamento automático de sessões**
- ✅ **Keep-alive automático**
- ✅ **Totalmente tipado** (TypeScript)
- ✅ **Modular e reutilizável**

## 💰 Custo

**~$4.50/hora** (75% mais barato que OpenAI Realtime API)

## 📁 Estrutura

```
server/services/voice-agent/
├── types.ts                 # Tipos TypeScript
├── config.ts                # Configurações centralizadas
├── DeepgramVoiceAgent.ts    # Classe principal do agent
├── index.ts                 # Exports públicos
└── README.md                # Esta documentação

server/routes/
└── voiceAgent.ts            # Rotas WebSocket

client/src/services/voice-agent/
├── VoiceAgentClient.ts      # Cliente frontend
└── index.ts                 # Exports públicos
```

## 🚀 Instalação

### 1. Instalar dependências

```bash
npm install ws @types/ws express-ws @types/express-ws @deepgram/sdk
```

### 2. Configurar variável de ambiente

```bash
# .env
DEEPGRAM_API_KEY=your_api_key_here
```

## 💻 Uso no Servidor

### Exemplo básico

```typescript
import { DeepgramVoiceAgent, DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS } from './services/voice-agent';

const apiKey = process.env.DEEPGRAM_API_KEY!;
const agent = new DeepgramVoiceAgent(apiKey);

// Em uma rota WebSocket:
app.ws('/voice-agent', async (ws, req) => {
  const sessionId = await agent.createSession(ws, {
    userId: req.user.id,
    instructions: DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (message.type === 'audio') {
      agent.sendAudio(sessionId, Buffer.from(message.audio, 'base64'));
    }
  });

  ws.on('close', () => {
    agent.endSession(sessionId);
  });
});
```

### Com function calling

```typescript
const sessionId = await agent.createSession(ws, {
  userId: req.user.id,
  instructions: 'Você é um assistente que pode buscar informações.',
  functions: [
    {
      name: 'search_knowledge',
      description: 'Busca informações na base de conhecimento',
      url: 'https://api.example.com/search',
      method: 'post',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Termo de busca',
          },
        },
        required: ['query'],
      },
    },
  ],
});
```

## 💻 Uso no Cliente (Frontend)

### Exemplo React

```typescript
import { useState, useEffect } from 'react';
import { VoiceAgentClient } from '@/services/voice-agent';

export function VoiceChat() {
  const [client] = useState(() => new VoiceAgentClient());
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    // Registrar listeners
    client.on('connected', () => {
      console.log('Conectado!');
      setIsConnected(true);
    });

    client.on('transcription', (text, isFinal) => {
      setTranscript(text);
    });

    client.on('agentSpeaking', (isStart) => {
      console.log(isStart ? 'Assistente falando...' : 'Assistente parou');
    });

    client.on('error', (error) => {
      console.error('Erro:', error);
    });

    // Cleanup
    return () => {
      client.disconnect();
    };
  }, [client]);

  const handleConnect = async () => {
    try {
      await client.connect();
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  const handleStartListening = async () => {
    try {
      await client.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Erro ao iniciar microfone:', error);
    }
  };

  const handleStopListening = () => {
    client.stopListening();
    setIsListening(false);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Conectar</button>
      ) : (
        <>
          {!isListening ? (
            <button onClick={handleStartListening}>Iniciar Conversa</button>
          ) : (
            <button onClick={handleStopListening}>Parar</button>
          )}
          
          <div>
            <p>Você disse: {transcript}</p>
          </div>
        </>
      )}
    </div>
  );
}
```

## 🔧 Configuração Avançada

### Personalizar configuração de áudio

```typescript
import { DEFAULT_AUDIO_CONFIG } from './services/voice-agent';

const customConfig = {
  ...DEFAULT_AUDIO_CONFIG,
  input: {
    encoding: 'linear16' as const,
    sample_rate: 16000, // 16kHz para telefonia
  },
};
```

### Usar modelo LLM diferente

```typescript
const sessionId = await agent.createSession(ws, {
  userId: req.user.id,
  instructions: 'Você é um assistente.',
  // Customizar LLM
  config: {
    agent: {
      think: {
        provider: { type: 'open_ai' },
        model: 'gpt-4o', // Usar GPT-4o em vez de mini
      },
    },
  },
});
```

## 📋 Protocolo de Mensagens

### Cliente → Servidor

```typescript
// Enviar áudio
{ type: 'audio', audio: 'base64_encoded_audio' }

// Encerrar sessão
{ type: 'end' }
```

### Servidor → Cliente

```typescript
// Sessão conectada
{ type: 'connected', sessionId: 'va_123...' }

// Áudio do assistente
{ type: 'audio', audio: 'base64_encoded_audio' }

// Transcrição
{ type: 'transcription', text: 'Hello', isFinal: true }

// Eventos de fala
{ type: 'userStartedSpeaking' }
{ type: 'userStoppedSpeaking' }
{ type: 'agentStartedSpeaking' }
{ type: 'agentStoppedSpeaking' }

// Chamada de função
{ type: 'functionCall', name: 'search', args: { query: 'test' } }

// Erro
{ type: 'error', error: 'Mensagem de erro' }
```

## 🔒 Segurança

### Autenticação

O exemplo básico não inclui autenticação. Para produção, adicione middleware:

```typescript
import { isAuthenticated } from './replitAuth';

app.ws('/voice-agent', isAuthenticated, async (ws, req) => {
  const userId = req.user.claims.sub;
  // ...
});
```

### Limites

Por padrão, o módulo impõe os seguintes limites:

- **3 sessões simultâneas por usuário**
- **64KB por chunk de áudio**
- **1MB por mensagem WebSocket**

Personalize em `config.ts`:

```typescript
export const LIMITS = {
  MAX_SESSIONS_PER_USER: 5,
  MAX_AUDIO_CHUNK_SIZE: 1024 * 128,
  MAX_MESSAGE_SIZE: 1024 * 1024 * 2,
};
```

## 📦 Copiar para Outro Projeto

1. Copie a pasta `server/services/voice-agent/` completa
2. Copie `server/routes/voiceAgent.ts`
3. Copie `client/src/services/voice-agent/` completa
4. Instale dependências: `npm install ws @types/ws express-ws @types/express-ws @deepgram/sdk`
5. Configure `DEEPGRAM_API_KEY` no `.env`
6. Registre as rotas no seu servidor:

```typescript
import { setupVoiceAgentRoutes } from './routes/voiceAgent';

// Após criar o servidor HTTP:
setupVoiceAgentRoutes(app, server);
```

## 🐛 Troubleshooting

### Erro: "DEEPGRAM_API_KEY não configurada"

Certifique-se de ter a variável de ambiente:

```bash
export DEEPGRAM_API_KEY=your_key
```

### Erro: "Timeout ao conectar"

Verifique:
1. Firewall não está bloqueando WebSocket
2. DEEPGRAM_API_KEY é válida
3. Deepgram Voice Agent API está disponível

### Áudio não toca

1. Verifique permissão do navegador para áudio
2. Verifique console do navegador para erros
3. Teste com modelo TTS diferente

## 📝 Notas

- **Português**: Deepgram Aura TTS não suporta português nativamente. Para TTS em português, use OpenAI TTS separadamente ou configure `usesExternalTTS: true`.
- **Latência**: Esperada ~300-500ms para conversação fluida.
- **Custo**: ~$4.50/hora incluindo STT + LLM. TTS adicional pode variar.

## 📚 Referências

- [Deepgram Voice Agent API Docs](https://developers.deepgram.com/docs/voice-agent)
- [Deepgram Voice Agent Examples](https://github.com/deepgram/voice-agent-python-client)
- [OpenAI API Docs](https://platform.openai.com/docs)

## 📄 Licença

Este módulo é parte do projeto NuP-Study e pode ser copiado/reutilizado livremente.
