# Sistema de Voz Conversacional - Implementação Completa

## 🎯 Objetivo

Sistema de conversação por voz em tempo real para o Professor IA, com transcrição, processamento inteligente e síntese de voz, otimizado para conversações naturais em português.

## 🔧 Arquitetura

```
Usuário (voz) 
    ↓ [Microfone → AudioCapture PCM]
    ↓ [WebSocket]
Servidor
    ↓ [Deepgram STT Nova-2]
Transcrição (texto)
    ↓ [OpenAI GPT-4]
Resposta (texto)
    ↓ [Deepgram TTS Aura]
Servidor
    ↓ [WebSocket → AudioContext]
Usuário (voz)
```

## ✨ Melhorias Implementadas (Oct 29, 2025)

### 🎤 **Captura de Áudio PCM Linear16**

**Problema**: MediaRecorder enviava WebM/Opus (com headers) mas Deepgram esperava Opus RAW ou PCM.

**Solução**: 
- Criado `AudioCapture.ts` que usa `ScriptProcessorNode` 
- Captura PCM linear16 diretamente do microfone
- Conversão Float32 → Int16 otimizada
- Buffer: 4096 samples (~256ms @ 16kHz)

**Benefícios**:
- ✅ Formato correto para Deepgram STT
- ✅ Baixa latência (~256ms por chunk)
- ✅ Compatibilidade universal (todos browsers)

### 📊 **Feedback Visual Transparente**

**Problema**: Usuário não via o que estava acontecendo (processo opaco).

**Solução**:
- **Medidor de Volume**: Barra visual animada mostra nível de áudio em tempo real
- **Transcrições Parciais**: Texto em itálico mostra transcrição enquanto usuário fala
- **Transcrições Finais**: Texto em negrito mostra resultado confirmado
- **Estados de Conexão**: Indicadores visuais de conectado/desconectado/processando
- **Mensagens de Erro**: Feedback claro quando algo falha

**Benefícios**:
- ✅ Usuário sabe que está sendo ouvido
- ✅ Feedback imediato (confiança no sistema)
- ✅ Debug facilitado (ver exatamente onde falha)

### 🔍 **Logs Detalhados de Debug**

**Problema**: Deepgram desconectava silenciosamente sem explicação.

**Solução**:
- Logs de todos eventos Deepgram (Open, Close, Error, Transcript)
- Informações de Close Event (code, reason)
- Confidence score em cada transcrição
- Tamanho de chunks de áudio (para debug)

**Exemplo de Log**:
```
[ConversationalVoice] Deepgram STT configurado: linear16, 16kHz, pt-BR
[ConversationalVoice] STT conectado (cv_xxx)
[ConversationalVoice] Transcrição (cv_xxx): "olá professor" [final:true, conf:0.95]
[ConversationalVoice] STT desconectado (cv_xxx) { code: 1000, reason: 'Normal closure' }
```

**Benefícios**:
- ✅ Debug eficiente
- ✅ Monitoramento em produção
- ✅ Identificação rápida de problemas

### ⚡ **Otimizações para Professor IA**

**Objetivo**: Conversação natural como pessoa real.

**Implementações**:
- **Chunks Otimizados**: 256ms (4096 samples @ 16kHz) - balanceando latência e qualidade
- **Sample Rate Fixo**: 16kHz (ideal para voz humana)
- **VAD Events**: Deepgram detecta quando usuário parou de falar
- **Utterance End**: 1500ms de silêncio para confirmar fim da frase
- **Interim Results**: Transcrições parciais para feedback imediato
- **Smart Format**: Pontuação automática para respostas naturais

**Benefícios**:
- ✅ Latência baixa (~500ms total)
- ✅ Conversação fluida
- ✅ Detecta pausas naturais
- ✅ Pronto para Professor IA

## 🔐 Configuração

### Variáveis de Ambiente

```bash
DEEPGRAM_API_KEY=xxx  # Para STT e TTS
OPENAI_API_KEY=xxx    # Para GPT-4
```

### Configuração do Cliente

```typescript
const client = new ConversationalVoiceClient({
  onVolumeChange: (volume) => {
    // Atualizar medidor visual
  },
  onTranscript: (text, isFinal) => {
    if (isFinal) {
      // Transcrição confirmada
    } else {
      // Transcrição parcial (feedback imediato)
    }
  },
}, {
  sampleRate: 16000,  // IMPORTANTE: Fixo em 16kHz
  debug: true,
});
```

## 📈 Performance

| Métrica | Valor | Nota |
|---------|-------|------|
| Latência STT | ~200ms | Deepgram Nova-2 |
| Latência LLM | ~500ms | GPT-4 streaming |
| Latência TTS | ~150ms | Deepgram Aura |
| **Total** | **~850ms** | Conversação natural |
| Chunk Size | 256ms | Otimizado para voz |
| Sample Rate | 16kHz | Ideal para humanos |

## 🚀 Próximos Passos

### Para Professor IA

1. **Contexto Conversacional**: Manter histórico de mensagens
2. **Interrupções**: Permitir usuário interromper Professor IA
3. **Emoção**: Variar tom de voz baseado em contexto
4. **Personalização**: Adaptar velocidade e estilo ao perfil do aluno

### Melhorias Futuras

- [ ] AudioWorklet (substituir ScriptProcessor para latência menor)
- [ ] Connection Keepalive (manter STT ativo entre turnos)
- [ ] Response Debouncing (aguardar transcrição final antes de processar)
- [ ] WebRTC (streaming direto sem base64)
- [ ] Fallback Gracioso (degradar para nativo se Deepgram falhar)

## 🐛 Troubleshooting

### Transcrição não aparece

1. Verificar logs do servidor para eventos Deepgram
2. Confirmar encoding: `linear16` + sample_rate: `16000`
3. Testar medidor de volume (se não move, problema no microfone)

### Deepgram desconecta

- Ver logs `Close` para reason code
- Verificar API key tem permissão STT
- Confirmar formato PCM Int16 LE

### Latência alta

- Verificar chunk size (4096 samples = ~256ms)
- Confirmar sample rate 16kHz (não 48kHz)
- Checar conexão internet

## 📚 Referências

- [Deepgram STT Docs](https://developers.deepgram.com/docs/streaming)
- [Deepgram TTS Docs](https://developers.deepgram.com/docs/tts-streaming)
- [OpenAI Chat API](https://platform.openai.com/docs/guides/chat)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
