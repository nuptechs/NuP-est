// netlify/functions/extract-fields.js
const { extrairCampos, termosIgnorados, termosEspecificos, regexes, cleanFieldName, cleanFieldValue, classifyField, agruparLinhasRelacionadas } = require('./regexFieldExtractor');

exports.handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const texto = body.text || '';
    
    if (!texto) {
      console.error('❌ Erro: Texto OCR não fornecido');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          status: 'error',
          message: 'Texto OCR é obrigatório' 
        })
      };
    }
    
    console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Processando texto OCR com ${texto.length} caracteres`);
    console.log(`   Amostra do texto: "${texto.substring(0, 100)}${texto.length > 100 ? '...' : ''}"`);
    
    // Usar a função de extração
    const resultado = extrairCampos(texto);
    const { campos, estatisticas, categorias } = resultado;
    
    // Return success response with detailed information
    const responseObject = {
      status: 'success',
      fonte: 'regex',
      campos: campos,
      texto_completo: texto,
      estatisticas: {
        total_linhas: estatisticas.totalLinhas,
        campos_encontrados: estatisticas.camposEncontrados,
        categorias: categorias
      }
    };
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseObject)
    };
  } catch (err) {
    console.error('Erro na extração de campos:', err);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        status: 'error',
        message: 'Erro interno na extração', 
        detalhes: err.message 
      })
    };
  }
};