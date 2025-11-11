// Local development API endpoint for Vision API
// This file will be used by Vite's dev server

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 ETAPA 1 - CAPTURA E SELEÇÃO DE IMAGEM: Componente ImageFieldExtractor enviou imagem para OCR');
    
    // Get image data from request
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      console.log('❌ Erro: Dados da imagem não fornecidos');
      return res.status(400).json({ 
        success: false, 
        error: 'Image data is required' 
      });
    }

    const imageSize = Math.round((imageBase64.length * 3) / 4 / 1024);
    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Imagem recebida, tamanho aproximado: ${imageSize} KB`);
    console.log(`   Formato: ${imageBase64.startsWith('data:image/png') ? 'PNG' : 
                            imageBase64.startsWith('data:image/jpeg') ? 'JPEG' : 
                            imageBase64.startsWith('data:image/') ? imageBase64.split(';')[0].replace('data:', '') : 
                            'Desconhecido'}`);
    console.log(`   Método: POST`);
    console.log(`   URL: ${req.originalUrl || '/api/vision-ocr'}`);
    console.log(`   Headers: Content-Type: application/json`);
    console.log(`   Corpo: { "imageBase64": "[BASE64_STRING_TRUNCADA]" }`);
    
    // Simulate DOCUMENT_TEXT_DETECTION processing
    console.log('📤 ETAPA 2 - ENVIO PARA API DE OCR: Processando imagem com DOCUMENT_TEXT_DETECTION');
    
    // Create full text content
    const fullText = `Nome: Usuário DEX do Sistema
Unidade: UNIDADE A04 - BRASÍLIA DF
Perfil: Administrador
Curso: Técnico em Manutenção de Aeronaves
Periodo: 01/06/2025 até 06/06/2025
Nº do Documento: 4589
Status: Ativo
Data de Criação: 15/05/2025
Última Atualização: 20/05/2025
Responsável: João Silva
Departamento: Manutenção
Prioridade: Alta
Categoria: Treinamento
Observações: Necessário acompanhamento especial
Linha de Atuação: Desenvolvimento de Software
Data de Início: 01/01/2025
Data de Fim: 31/12/2025`;

    // Create text elements from the full text
    const textElements = fullText.split('\n').map((line, index) => ({
      text: line,
      confidence: 0.9 + (Math.random() * 0.1),
      boundingBox: {
        x: 20,
        y: 50 + (index * 30),
        width: 300,
        height: 20
      }
    }));
    
    // Add some random field-like elements
    for (let i = 0; i < 10; i++) {
      textElements.push({
        text: `Campo ${i + 1}`,
        confidence: 0.7 + (Math.random() * 0.3),
        boundingBox: {
          x: Math.random() * 500,
          y: Math.random() * 800,
          width: 100 + (Math.random() * 200),
          height: 15 + (Math.random() * 10)
        }
      });
    }

    // Log detailed information about the simulated OCR
    console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: OCR concluído com ${textElements.length} elementos de texto`);
    console.log(`   Texto completo extraído: ${fullText.substring(0, 100)}...`);
    console.log(`   Confiança média: ${(textElements.reduce((sum, el) => sum + el.confidence, 0) / textElements.length).toFixed(2)}`);
    console.log(`   Primeiros 5 elementos:`);
    textElements.slice(0, 5).forEach((el, idx) => {
      console.log(`   ${idx + 1}. "${el.text}" (confiança: ${el.confidence.toFixed(2)})`);
    });

    // Simulate processing delay
    setTimeout(() => {
      res.status(200).json({
        success: true,
        fullText: fullText,
        textElements: textElements,
        processingStats: {
          elementCount: textElements.length,
          processingTimeMs: 1243, // Simulated processing time
          confidenceAvg: 0.89,
          imageSize: imageSize
        }
      });
    }, 500);
  } catch (error) {
    console.error('💥 Erro crítico:', error);
    
    res.status(500).json({ 
      success: false, 
      error: `Error in Vision API simulation: ${error.message}` 
    });
  }
}