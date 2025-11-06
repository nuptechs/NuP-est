import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI client
let openai;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    logger.info('OpenAI client initialized');
  } else {
    logger.warn('No OpenAI API key provided');
  }
} catch (error) {
  logger.error('Error initializing OpenAI client:', error);
}

/**
 * Extract fields from text using OpenAI
 * @param {string} text - OCR extracted text
 * @param {Array} textBlocks - OCR text blocks with position information
 * @returns {Object} Extraction result with fields
 */
export const extractFieldsWithAI = async (text, textBlocks = []) => {
  try {
    // Check if OpenAI client is initialized
    if (!openai) {
      return {
        success: false,
        error: 'OpenAI client not initialized',
        fields: {}
      };
    }
    
    // Prepare spatial information if available
    let spatialInfo = '';
    if (textBlocks && textBlocks.length > 0) {
      // Create a simplified representation of text blocks with their positions
      const blockInfo = textBlocks.map((block, index) => {
        return `Block ${index + 1}: "${block.text}" at position (x:${block.boundingBox?.x || 0}, y:${block.boundingBox?.y || 0})`;
      }).join('\n');
      
      spatialInfo = `\n\nAdditional spatial information about text elements:\n${blockInfo}`;
    }
    
    // Prepare prompt for OpenAI with enhanced instructions for transactional fields
    const prompt = `Você é um especialista em extrair campos de formulários e telas de sistemas a partir de texto OCR. Analise o seguinte texto extraído de uma imagem:

${text}${spatialInfo}

TAREFA: Extraia APENAS os campos de entrada de dados ou exibição de registros (campos transacionais) no formato JSON.

REGRAS IMPORTANTES:
1. Foque EXCLUSIVAMENTE em campos de formulário e seus valores (pares chave-valor)
2. Use camelCase para os nomes dos campos (ex: nomeCompleto, dataNascimento)
3. Mantenha os valores exatamente como aparecem no texto
4. IGNORE completamente:
   - Títulos e cabeçalhos de página
   - Menus de navegação
   - Rodapés
   - Botões (a menos que sejam estados de campos)
   - Textos explicativos longos
   - Mensagens do sistema
   - Qualquer texto que não forme um par chave-valor de dados

EXEMPLOS DO QUE INCLUIR:
- "Nome: João Silva" → { "nome": "João Silva" }
- "Email: joao@exemplo.com" → { "email": "joao@exemplo.com" }
- "Data de Nascimento: 15/03/1985" → { "dataNascimento": "15/03/1985" }
- "Status: Ativo" → { "status": "Ativo" }

EXEMPLOS DO QUE IGNORAR:
- "Sistema de Cadastro v2.1" (título)
- "Menu Principal" (navegação)
- "Clique em Salvar para continuar" (instrução)
- "Copyright 2025" (rodapé)
- "Página 1 de 3" (navegação)

Retorne APENAS o JSON com os campos extraídos, sem explicações adicionais.`;

    // Call OpenAI API
    logger.info('Calling OpenAI API for field extraction');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using a more advanced model for better field detection
      messages: [
        { role: 'system', content: 'You are a specialized AI that extracts only transactional form fields from text, ignoring all non-field content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, // Lower temperature for more consistent results
      max_tokens: 1500
    });
    
    // Parse the response
    const aiResponse = response.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      return {
        success: false,
        error: 'No response from OpenAI',
        fields: {}
      };
    }
    
    // Extract JSON from response (in case there's any text before or after)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
    
    try {
      const fields = JSON.parse(jsonString);
      logger.info(`AI extraction found ${Object.keys(fields).length} fields`);
      
      return {
        success: true,
        fields
      };
    } catch (parseError) {
      logger.error('Error parsing OpenAI response as JSON:', parseError);
      return {
        success: false,
        error: 'Failed to parse AI response as JSON',
        fields: {}
      };
    }
  } catch (error) {
    logger.error('Error in AI extraction:', error);
    return {
      success: false,
      error: `AI extraction failed: ${error.message}`,
      fields: {}
    };
  }
};