/**
 * VOICE AGENT TEST PAGE
 * 
 * Página de teste para demonstração do Voice Agent.
 * Útil para desenvolvimento e testes.
 */

import { VoiceAgentDemo } from '@/components/voice-agent/VoiceAgentDemo';

export default function VoiceAgentTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Voice Agent Demo
          </h1>
          <p className="text-muted-foreground">
            Teste de conversação em tempo real usando Deepgram Voice Agent API
          </p>
        </div>

        <VoiceAgentDemo />

        <div className="text-center space-y-4 text-sm text-muted-foreground">
          <div className="p-4 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">ℹ️ Informações Técnicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div>
                <p className="font-medium">STT (Speech-to-Text)</p>
                <p className="text-xs">Deepgram Nova-3</p>
                <p className="text-xs text-green-600">~99% accuracy, &lt;300ms</p>
              </div>
              <div>
                <p className="font-medium">LLM (Reasoning)</p>
                <p className="text-xs">OpenAI GPT-4o-mini</p>
                <p className="text-xs text-green-600">Fast &amp; cost-effective</p>
              </div>
              <div>
                <p className="font-medium">Custo</p>
                <p className="text-xs">~$4.50/hora</p>
                <p className="text-xs text-green-600">75% cheaper than OpenAI Realtime</p>
              </div>
            </div>
          </div>

          <p className="text-xs">
            <strong>Nota:</strong> Deepgram Aura TTS não suporta português.
            Para produção, integre OpenAI TTS para respostas em português.
          </p>
        </div>
      </div>
    </div>
  );
}
