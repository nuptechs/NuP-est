#!/usr/bin/env node

import WebSocket from 'ws';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('=== Testando acesso ao Deepgram Voice Agent API ===\n');
console.log('API Key configurada:', DEEPGRAM_API_KEY ? `✅ Sim (${DEEPGRAM_API_KEY.length} caracteres)` : '❌ Não');
console.log('API Key (primeiros 8 chars):', DEEPGRAM_API_KEY?.substring(0, 8) + '...\n');

console.log('Tentando conectar ao Voice Agent API V1...');
console.log('URL: wss://agent.deepgram.com/v1/agent/converse\n');

const ws = new WebSocket(`wss://agent.deepgram.com/v1/agent/converse?apikey=${DEEPGRAM_API_KEY}`);

let connected = false;

ws.on('open', () => {
  connected = true;
  console.log('✅ SUCESSO! Conectado ao Voice Agent API');
  console.log('Sua API key TEM acesso ao Voice Agent API');
  ws.close();
  process.exit(0);
});

ws.on('error', (error) => {
  if (!connected) {
    console.log('❌ ERRO ao conectar:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n📋 DIAGNÓSTICO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Sua API key é VÁLIDA para Deepgram em geral,');
      console.log('MAS não tem permissão para usar o Voice Agent API.');
      console.log('\nO Voice Agent é um produto SEPARADO que requer');
      console.log('acesso especial do Deepgram.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 SOLUÇÕES:');
      console.log('1. Solicitar acesso ao Voice Agent em: https://deepgram.com/contact-us');
      console.log('2. Testar no playground: https://playground.deepgram.com/?endpoint=agent');
      console.log('3. Usar alternativa: Deepgram STT + OpenAI + TTS separadamente');
    }
  }
  ws.close();
  process.exit(1);
});

ws.on('close', () => {
  if (!connected) {
    setTimeout(() => process.exit(1), 100);
  }
});

// Timeout de 10 segundos
setTimeout(() => {
  if (!connected) {
    console.log('❌ Timeout - não foi possível conectar em 10 segundos');
    ws.close();
    process.exit(1);
  }
}, 10000);
