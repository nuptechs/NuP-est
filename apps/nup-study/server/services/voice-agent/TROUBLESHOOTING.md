# Voice Agent - Troubleshooting

## Erro 401: Unauthorized

### Causa
O erro 401 indica que a API key do Deepgram não tem acesso ao **Voice Agent API**.

### Solução

O **Deepgram Voice Agent API** é um produto que requer acesso especial. Siga estas etapas:

#### 1. Verificar se Voice Agent está habilitado na conta

1. Acesse o [Deepgram Console](https://console.deepgram.com/)
2. Vá em **API Keys**
3. Verifique se a chave tem acesso a **Voice Agent API**

#### 2. Solicitar acesso ao Voice Agent API

Se não tiver acesso:

1. **Contate o suporte Deepgram**: https://deepgram.com/contact-us
2. **Solicite acesso ao Voice Agent API**
3. Ou **tente o playground**: https://playground.deepgram.com/?endpoint=agent

#### 3. Alternativa: Use API Playground

Enquanto aguarda acesso, você pode testar o Voice Agent no playground oficial:

🔗 https://playground.deepgram.com/?endpoint=agent

---

## Outras Soluções

### Erro 404: Not Found

**Causa**: URL do WebSocket incorreta

**Solução**: Verifique se a URL em `config.ts` é:
```typescript
export const DEEPGRAM_VOICE_AGENT_URL = 'wss://api.deepgram.com/v1/agent';
```

### Timeout ao Conectar

**Causa**: Firewall bloqueando WebSocket ou servidor Deepgram indisponível

**Soluções**:
1. Verifique conexão de internet
2. Teste a API key em outro endpoint Deepgram (ex: STT)
3. Verifique se não há firewall bloqueando WSS

### Microfone não funciona

**Causa**: Permissões do navegador ou HTTPS necessário

**Soluções**:
1. Use **HTTPS** ou **localhost**
2. Clique no ícone de cadeado na barra de endereço
3. Permita acesso ao microfone
4. Recarregue a página

### Sem áudio do assistente

**Causa**: Problema com decodificação de áudio ou volume

**Soluções**:
1. Verifique volume do sistema
2. Verifique console do browser para erros
3. Teste com navegador diferente (Chrome recomendado)

---

## Verificar Status da API

### Teste Rápido: STT API

Para verificar se sua API key funciona em geral:

```bash
curl -X POST https://api.deepgram.com/v1/listen \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @audio.wav
```

Se retornar 401 aqui também, a API key está inválida ou expirada.

Se funcionar aqui mas não no Voice Agent, você não tem acesso ao Voice Agent API.

---

## Documentação Oficial

- **Voice Agent Docs**: https://developers.deepgram.com/docs/voice-agent
- **API Reference**: https://developers.deepgram.com/reference/voice-agent/agent
- **Console**: https://console.deepgram.com/
- **Suporte**: https://deepgram.com/contact-us

---

## Próximos Passos

Enquanto aguarda acesso ao Voice Agent API:

1. ✅ **O código está correto** - A implementação segue a documentação oficial
2. ✅ **Teste o playground** - Valide o conceito no playground Deepgram
3. ✅ **Solicite acesso** - Entre em contato com Deepgram para habilitar Voice Agent
4. ✅ **Use alternativas** - Considere implementar STT + LLM + TTS separadamente

---

## Implementação Alternativa (Sem Voice Agent API)

Se não conseguir acesso ao Voice Agent API, você pode construir um sistema similar usando:

1. **Deepgram STT** (Streaming) - Para Speech-to-Text
2. **OpenAI GPT-4** - Para processamento de linguagem
3. **OpenAI TTS** ou **Deepgram Aura** - Para Text-to-Speech

Isso dá controle total sobre cada componente, mas requer mais código.

**Custo estimado**: Similar (~$4-6/hora)
