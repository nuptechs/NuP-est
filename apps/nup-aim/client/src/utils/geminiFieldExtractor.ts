// DON'T DELETE THIS COMMENT
// Using blueprint:javascript_gemini for Gemini AI integration
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { determineFieldType, determineComplexity, calculateFunctionPoints } from './fieldExtractor';

export interface GeminiExtractedField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  complexity: 'Low' | 'Average' | 'High';
  fpValue: number;
  source: string;
  fieldCategory: 'entrada' | 'saida' | 'neutro' | 'derivado';
  confidence: number;
  value?: string;
}

interface GeminiFieldResponse {
  fields: Array<{
    label: string;
    name: string;
    type: string;
    category: 'entrada' | 'saida' | 'neutro' | 'derivado';
    required: boolean;
    value?: string;
    description?: string;
  }>;
}

const OPTIMIZED_PROMPT = `Analise esta tela de sistema e extraia TODOS os campos de dados visíveis.

EXTRAIA:
- Campos onde usuário insere/edita dados (inputs, selects, checkboxes) → categoria "entrada"
- Campos que mostram dados do banco (IDs, códigos, nomes) → categoria "neutro"

IGNORE:
- Botões (Salvar, Cancelar, Adicionar)
- Títulos e cabeçalhos
- Menus
- Textos estáticos

Para cada campo:
- label: texto exato do campo
- name: versão snake_case
- type: text, number, date, select, currency, checkbox, textarea
- category: "entrada" ou "neutro"
- required: true/false
- value: valor visível ou null

JSON:
{
  "fields": [
    {
      "label": "Nome do campo",
      "name": "nome_campo",
      "type": "text",
      "category": "entrada",
      "required": false,
      "value": null,
      "description": "Descrição"
    }
  ]
}

Extraia TODOS os campos de dados que você vê.`;

// Função para identificar campos derivados (calculados/concatenados) após extração
function identifyDerivedFields(fields: GeminiExtractedField[]): GeminiExtractedField[] {
  const derivedKeywords = [
    'total', 'subtotal', 'soma', 'somatoria', 'somatório',
    'media', 'média', 'percentual', 'taxa', 'calculo', 'cálculo',
    'resultado', 'final', 'liquido', 'líquido', 'bruto',
    'desconto', 'acrescimo', 'acréscimo', 'juros',
    'quantidade_total', 'valor_total', 'preco_final', 'preço_final',
    'total_geral', 'grand_total', 'sum', 'avg', 'count'
  ];

  return fields.map(field => {
    const labelLower = field.label.toLowerCase();
    const nameLower = field.name.toLowerCase();
    
    // Verifica se o nome ou label contém palavras-chave de campos derivados
    const isDerived = derivedKeywords.some(keyword => 
      labelLower.includes(keyword) || nameLower.includes(keyword)
    );

    if (isDerived) {
      console.log(`🔄 Campo "${field.label}" reclassificado como DERIVADO`);
      return {
        ...field,
        fieldCategory: 'derivado' as const,
        description: `${field.description || 'Campo calculado/agregado'} (identificado automaticamente como derivado)`
      };
    }

    return field;
  });
}

export async function extractFieldsWithGemini(imageBase64: string): Promise<GeminiExtractedField[]> {
  try {
    console.log('🤖 Iniciando extração de campos com Gemini AI...');
    
    // Detecta se está no servidor (Node.js) ou no cliente (browser)
    const isServer = typeof process !== 'undefined' && process.env;
    const apiKey = isServer ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Remove o prefixo data:image se presente
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    console.log(`📤 Enviando imagem para Gemini 2.5 Flash (tamanho: ${Math.round(base64Image.length / 1024)} KB)`);

    const startTime = performance.now();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // Baixa temperatura para respostas mais consistentes
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
              },
            },
            {
              text: OPTIMIZED_PROMPT
            }
          ]
        }
      ],
    });

    const endTime = performance.now();
    console.log(`✅ Resposta recebida do Gemini em ${Math.round(endTime - startTime)}ms`);

    let responseText = response.text;
    
    if (!responseText) {
      throw new Error('Resposta vazia do Gemini');
    }

    console.log('📥 Processando resposta JSON do Gemini...');
    
    // Remover markdown code blocks se presentes (```json ... ```)
    responseText = responseText.trim();
    if (responseText.startsWith('```')) {
      // Remove primeira linha (```json ou ```)
      responseText = responseText.split('\n').slice(1).join('\n');
      // Remove última linha (```)
      if (responseText.endsWith('```')) {
        responseText = responseText.slice(0, -3);
      }
      responseText = responseText.trim();
    }
    
    const geminiResponse: GeminiFieldResponse = JSON.parse(responseText);
    
    if (!geminiResponse.fields || !Array.isArray(geminiResponse.fields)) {
      throw new Error('Formato de resposta inválido do Gemini');
    }

    console.log(`🎯 Gemini identificou ${geminiResponse.fields.length} campos relevantes`);

    // Converter para o formato interno
    let extractedFields: GeminiExtractedField[] = geminiResponse.fields.map(field => {
      const fieldType = field.type || determineFieldType('', field.name);
      const complexity = determineComplexity(fieldType, field.name);
      const fpValue = calculateFunctionPoints(fieldType, complexity);

      return {
        id: uuidv4(),
        name: field.name,
        label: field.label,
        type: fieldType,
        required: field.required || false,
        description: field.description || `Campo ${field.label} extraído via Gemini AI`,
        complexity,
        fpValue,
        source: 'Gemini AI',
        fieldCategory: field.category || 'neutro',
        confidence: 0.95, // Gemini tem alta confiança
        value: field.value
      };
    });

    // Pós-processamento: identificar campos derivados
    console.log('🔍 Analisando campos para identificar derivados...');
    extractedFields = identifyDerivedFields(extractedFields);

    // Log detalhado dos campos extraídos
    console.log('📋 CAMPOS EXTRAÍDOS DETALHADAMENTE:');
    extractedFields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.label} (${field.name}) - Tipo: ${field.type} - Categoria: ${field.fieldCategory}`);
    });

    // Estatísticas
    const stats = {
      entrada: extractedFields.filter(f => f.fieldCategory === 'entrada').length,
      neutro: extractedFields.filter(f => f.fieldCategory === 'neutro').length,
      derivado: extractedFields.filter(f => f.fieldCategory === 'derivado').length,
    };

    console.log(`📊 Distribuição dos campos:`);
    console.log(`   - Entrada: ${stats.entrada}`);
    console.log(`   - Neutro: ${stats.neutro}`);
    console.log(`   - Derivado: ${stats.derivado}`);

    return extractedFields;
  } catch (error: any) {
    console.error('❌ Erro na extração com Gemini:', error);
    throw new Error(`Falha na extração com Gemini: ${error.message}`);
  }
}
