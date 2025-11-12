// Local development API endpoint for Field Extraction
// This file will be used by Vite's dev server

import { extrairCampos } from '../utils/regexFieldExtractor';

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 ETAPA 1 - CAPTURA E SELEÇÃO DE IMAGEM: Componente ImageFieldExtractor enviou solicitação de extração');
    
    // Get text data from request
    const { text } = req.body;
    
    if (!text) {
      console.log('❌ Erro: Texto OCR não fornecido');
      return res.status(400).json({ 
        status: 'error',
        message: 'Texto OCR é obrigatório' 
      });
    }
    
    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Texto recebido com ${text.length} caracteres`);
    console.log(`   Amostra do texto: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`   Método: POST`);
    console.log(`   URL: ${req.originalUrl || '/api/extract-fields'}`);
    console.log(`   Headers: Content-Type: application/json`);
    console.log(`   Corpo: { "text": "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" }`);
    
    // Usar a função de extração do módulo regexFieldExtractor
    const resultado = extrairCampos(text);
    const { campos, estatisticas, categorias } = resultado;
    
    // Return success response with detailed information
    return res.status(200).json({
      status: 'success',
      fonte: 'regex',
      campos: campos,
      texto_completo: text,
      estatisticas: {
        total_linhas: estatisticas.totalLinhas,
        campos_encontrados: estatisticas.camposEncontrados,
        categorias: categorias
      }
    });
  } catch (error) {
    console.error('💥 Erro crítico:', error);
    
    return res.status(500).json({ 
      status: 'error',
      message: `Erro ao processar texto: ${error.message}` 
    });
  }
}