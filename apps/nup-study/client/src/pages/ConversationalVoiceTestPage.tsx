/**
 * Página de Teste - Sistema de Voz Conversacional
 */

import { ConversationalVoiceDemo } from '@/components/conversational-voice/ConversationalVoiceDemo';

export default function ConversationalVoiceTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="py-8">
        <ConversationalVoiceDemo />
      </div>
    </div>
  );
}
