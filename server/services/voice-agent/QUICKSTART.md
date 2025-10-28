# Voice Agent - Guia Rápido

## 🚀 Como Usar em 5 Minutos

### 1. Testar no Browser

Acesse: **`http://localhost:5000/voice-agent-test`**

1. Clique em **"Conectar"**
2. Clique em **"Iniciar Conversa"**
3. Permita acesso ao microfone
4. **Fale naturalmente** - o assistente responderá em tempo real!

---

### 2. Usar em Seu Próprio Componente

```tsx
import { VoiceAgentClient } from '@/services/voice-agent';
import { useState, useEffect } from 'react';

function MyVoiceChat() {
  const [client] = useState(() => new VoiceAgentClient());

  useEffect(() => {
    client.on('transcription', (text, isFinal) => {
      console.log(`Você disse: ${text}`);
    });

    client.on('agentSpeaking', (isStart) => {
      console.log(isStart ? 'Assistente falando...' : 'Assistente parou');
    });

    return () => client.disconnect();
  }, [client]);

  const handleStart = async () => {
    await client.connect();
    await client.startListening();
  };

  return <button onClick={handleStart}>Iniciar Conversa</button>;
}
```

---

### 3. Customizar Instruções do Assistente

```typescript
// No servidor (server/routes/voiceAgent.ts)

import { DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS } from '../services/voice-agent';

// Customizar instruções:
const customInstructions = `
Você é um assistente de matemática especializado.
Ajude o aluno a entender equações e cálculos.
Use exemplos práticos sempre que possível.
`;

const sessionId = await agent.createSession(ws, {
  userId: req.user.id,
  instructions: customInstructions, // <-- Suas instruções aqui
});
```

---

### 4. Adicionar Function Calling

```typescript
const sessionId = await agent.createSession(ws, {
  userId: req.user.id,
  instructions: 'Você pode buscar informações na base de conhecimento.',
  functions: [
    {
      name: 'search_knowledge',
      description: 'Busca informações sobre um tópico',
      url: 'https://api.myapp.com/search',
      method: 'post',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Tópico a buscar',
          },
        },
        required: ['topic'],
      },
    },
  ],
});

// No frontend, escutar function calls:
client.on('functionCall', (name, args) => {
  console.log(`Função chamada: ${name}`, args);
  // Executar função e retornar resultado
});
```

---

### 5. Copiar para Outro Projeto

#### Passo 1: Copiar arquivos

```bash
# Copiar módulo do servidor
cp -r server/services/voice-agent/ /path/to/new-project/server/services/

# Copiar rotas WebSocket
cp server/routes/voiceAgent.ts /path/to/new-project/server/routes/

# Copiar cliente frontend
cp -r client/src/services/voice-agent/ /path/to/new-project/client/src/services/
```

#### Passo 2: Instalar dependências

```bash
npm install ws @types/ws express-ws @types/express-ws @deepgram/sdk
```

#### Passo 3: Configurar .env

```bash
DEEPGRAM_API_KEY=your_api_key_here
```

#### Passo 4: Registrar rotas

```typescript
// No seu server/routes.ts ou equivalente:

import { setupVoiceAgentRoutes } from './routes/voiceAgent';

export async function registerRoutes(app: Express): Promise<Server> {
  // ... suas outras rotas ...

  const httpServer = createServer(app);
  
  // Adicione esta linha:
  setupVoiceAgentRoutes(app, httpServer);
  
  return httpServer;
}
```

**Pronto!** 🎉 Você tem conversação em tempo real funcionando!

---

## 💡 Dicas Importantes

### Use Fones de Ouvido

Evita eco e feedback de áudio. **Essencial** para boa experiência.

### Fale Naturalmente

Não precisa pausar ou falar como robô. O sistema detecta automaticamente quando você para de falar.

### Português Ainda Não Suportado no TTS

Deepgram Aura só faz TTS em **inglês e espanhol**.

**Solução:** Para português, configure OpenAI TTS externamente ou aguarde suporte nativo.

### Custo

- **~$4.50/hora** de conversação
- 75% mais barato que OpenAI Realtime API
- STT + LLM incluídos no preço

### Limites

- **3 sessões simultâneas** por usuário (configurável)
- **64KB** por chunk de áudio
- **Keep-alive** a cada 5 segundos (automático)

---

## 🐛 Troubleshooting

### "DEEPGRAM_API_KEY não configurada"

```bash
export DEEPGRAM_API_KEY=your_key
```

### Microfone não funciona

1. Verifique permissões do browser
2. Use **HTTPS** (ou localhost)
3. Recarregue a página

### Sem som do assistente

1. Verifique volume do sistema
2. Teste com outra voz: `voice: 'aura-luna-en'`
3. Verifique console do browser para erros

### WebSocket não conecta

1. Firewall bloqueando?
2. Servidor rodando?
3. Porta correta (5000)?

---

## 📚 Documentação Completa

- [README.md](./README.md) - Documentação técnica completa
- [Deepgram Voice Agent API](https://developers.deepgram.com/docs/voice-agent)
- [OpenAI API](https://platform.openai.com/docs)

---

## 💬 Exemplo de Conversa

```
Usuário: "Olá, pode me ajudar com Matemática?"
Assistente: "Claro! Em que posso ajudar com Matemática?"

Usuário: "Como resolver equações do segundo grau?"
Assistente: "Equações do segundo grau são da forma ax² + bx + c = 0.
             Você pode usar a fórmula de Bhaskara: x = (-b ± √(b² - 4ac)) / 2a.
             Quer ver um exemplo?"

Usuário: "Sim, por favor"
Assistente: "Ok! Vamos resolver x² - 5x + 6 = 0..."
```

---

**Pronto para conversar em tempo real!** 🎤✨
