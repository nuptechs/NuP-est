import { v4 as uuidv4 } from "uuid";
import { determineFieldType, determineComplexity, calculateFunctionPoints, deduplicateFields, classifyField } from './fieldExtractor';

export interface ExtractedField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
  complexity: 'Low' | 'Average' | 'High';
  fpValue: number;
  source: string;
  fieldCategory?: 'entrada' | 'saida' | 'neutro' | 'derivado';
  confidence?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FunctionPointAnalysis {
  totalFields: number;
  totalFunctionPoints: number;
  fields: ExtractedField[];
  detailedBreakdown: {
    EI: { low: number; average: number; high: number; total: number; fp: number };
    EO: { low: number; average: number; high: number; total: number; fp: number };
    EQ: { low: number; average: number; high: number; total: number; fp: number };
    ILF: { low: number; average: number; high: number; total: number; fp: number };
    EIF: { low: number; average: number; high: number; total: number; fp: number };
  };
}

interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('webcontainer');

const VISION_API_ENDPOINT = isProduction
  ? '/.netlify/functions/vision-ocr'
  : '/api/vision-ocr';

const FIELD_EXTRACTION_API_ENDPOINT = isProduction
  ? '/.netlify/functions/extract-fields'
  : '/api/extract-fields';

const GEMINI_EXTRACT_ENDPOINT = '/api/gemini-extract';

const callVisionAPI = async (imageData: string): Promise<OCRResult[]> => {
  try {
    // Calcular tamanho aproximado da imagem
    const imageSize = imageData.length * 0.75; // base64 to binary approximation
    
    console.log('📤 ETAPA 2 - ENVIO PARA API DE OCR: Iniciando envio da imagem para API de OCR');
    console.log(`   Método: POST`);
    console.log(`   URL: ${VISION_API_ENDPOINT}`);
    console.log(`   Headers: Content-Type: application/json`);
    console.log(`   Corpo: { "imageBase64": "[BASE64_STRING_TRUNCADA]" }`);
    console.log(`   Tamanho da imagem: ${Math.round(imageSize / 1024)} KB`);

    const startTime = performance.now();
    const response = await fetch(VISION_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: imageData }),
    });
    const endTime = performance.now();

    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Resposta recebida em ${Math.round(endTime - startTime)}ms: status ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Erro na API de OCR (${response.status})`, { error: errorText });
      throw new Error(`Erro ao conectar a API de OCR: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: API retornou erro`, { error: data.error || 'Erro desconhecido' });
      throw new Error(data.error || 'Erro ao conectar a API de OCR');
    }

    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: OCR concluído com sucesso`); 
    console.log(`   Elementos de texto: ${data.textElements?.length || 0}`);
    console.log(`   Texto completo: ${data.fullText?.substring(0, 100)}${data.fullText?.length > 100 ? '...' : ''}`);
    
    return data.textElements || [];
  } catch (error) {
    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Erro crítico na chamada da API de OCR`, error);
    throw new Error('Erro ao conectar a API de OCR');
  }
};

const callFieldExtractionAPI = async (imageData: string): Promise<any> => {
  try {
    // Primeiro, faz OCR para obter o texto da imagem
    const ocrResults = await callVisionAPI(imageData);
    const textoExtraido = ocrResults.map(t => t.text).join('\n');

    if (!textoExtraido || textoExtraido.length < 10) {
      throw new Error('Texto extraído é insuficiente para extração de campos');
    }

    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Texto extraído com ${textoExtraido.length} caracteres. Enviando para API de Extração...`);
    console.log(`   Amostra do texto extraído: "${textoExtraido.substring(0, 100)}${textoExtraido.length > 100 ? '...' : ''}"`);

    // Agora envia o texto para a API de extração de campos
    const startTime = performance.now();
    const response = await fetch(FIELD_EXTRACTION_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: textoExtraido }),
    });
    const endTime = performance.now();

    console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Resposta da API de Extração recebida em ${Math.round(endTime - startTime)}ms: status ${response.status}`);

    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      console.log(`📤 ETAPA 2 - ENVIO PARA API DE OCR: Erro na API de Extração`, data);
      throw new Error(data.message || 'Erro na extração');
    }

    console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Extração de campos concluída com sucesso`);
    
    if (data.campos) {
      const camposCount = Object.keys(data.campos).filter(k => !k.endsWith('_categoria')).length;
      console.log(`   Total de campos extraídos: ${camposCount}`);
      console.log(`   Fonte de extração: ${data.fonte || 'Desconhecida'}`);
      
      // Mostrar distribuição por categoria
      const categorias = {
        entrada: 0,
        saida: 0,
        neutro: 0
      };
      
      Object.keys(data.campos).forEach(key => {
        if (key.endsWith('_categoria')) {
          const categoria = data.campos[key] as 'entrada' | 'saida' | 'neutro';
          if (categoria === 'entrada' || categoria === 'saida' || categoria === 'neutro') {
            categorias[categoria] = (categorias[categoria] || 0) + 1;
          }
        }
      });
      
      console.log(`   Distribuição por categoria:`);
      console.log(`   - Entrada: ${categorias.entrada || 0}`);
      console.log(`   - Saída: ${categorias.saida || 0}`);
      console.log(`   - Neutro: ${categorias.neutro || 0}`);
      
      // Mostrar primeiros 5 campos como exemplo
      const camposKeys = Object.keys(data.campos).filter(k => !k.endsWith('_categoria')).slice(0, 5);
      if (camposKeys.length > 0) {
        console.log(`   Exemplos de campos extraídos:`);
        camposKeys.forEach(key => {
          const categoria = data.campos[`${key}_categoria`] || 'neutro';
          console.log(`   - ${key}: "${data.campos[key]}" (${categoria})`);
        });
        
        if (Object.keys(data.campos).filter(k => !k.endsWith('_categoria')).length > 5) {
          console.log(`   - ... e mais ${Object.keys(data.campos).filter(k => !k.endsWith('_categoria')).length - 5} campos`);
        }
      }
    }
    
    return data;
  } catch (error) {
    console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Erro crítico na chamada da API de Extração`, error);
    return null;
  }
};

export const extractFieldsFromImage = async (imageData: string): Promise<ExtractedField[]> => {
  try {
    // Etapa 1: Captura e seleção da imagem
    // Calcular tamanho aproximado da imagem
    const imageSize = imageData.length * 0.75; // base64 to binary approximation
    const format = imageData.startsWith('data:image/png') ? 'image/png' : 
                  imageData.startsWith('data:image/jpeg') ? 'image/jpeg' : 
                  imageData.startsWith('data:image/') ? imageData.split(';')[0].replace('data:', '') : 
                  'image/unknown';
    
    console.log('📸 ETAPA 1 - CAPTURA E SELEÇÃO DE IMAGEM: Componente ImageFieldExtractor capturou imagem');
    console.log(`   Formato: ${format}`);
    console.log(`   Tamanho aproximado: ${Math.round(imageSize / 1024)} KB`);

    let fields: ExtractedField[] = [];

    // Etapa 2: Tentativa de extração com Gemini AI (método primário)
    try {
      console.log('🤖 ETAPA 2 - TENTANDO EXTRAÇÃO COM GEMINI AI (método preferencial)...');
      
      const startTime = performance.now();
      const response = await fetch(GEMINI_EXTRACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64: imageData })
      });
      
      const endTime = performance.now();
      console.log(`📤 Gemini API respondeu em ${Math.round(endTime - startTime)}ms: status ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.fields && data.fields.length > 0) {
          console.log(`✅ Gemini extraiu ${data.fields.length} campos com sucesso!`);
          
          // Converter GeminiExtractedField para ExtractedField
          fields = data.fields.map((gf: any) => {
            const field = {
              id: gf.id,
              name: gf.name,
              type: gf.type,
              required: gf.required,
              description: gf.description,
              complexity: gf.complexity,
              fpValue: gf.fpValue,
              source: 'Gemini AI',
              fieldCategory: gf.fieldCategory,
              confidence: gf.confidence,
              position: undefined
            };
            
            // Log cada campo com sua categoria
            console.log(`   📌 Campo: ${gf.name} → Categoria: ${gf.fieldCategory || 'undefined'}`);
            
            return field;
          });
          
          // Estatísticas dos campos extraídos
          const categorias = {
            entrada: fields.filter(f => f.fieldCategory === 'entrada').length,
            neutro: fields.filter(f => f.fieldCategory === 'neutro').length,
            derivado: fields.filter(f => f.fieldCategory === 'derivado').length,
            outros: fields.filter(f => !f.fieldCategory || (f.fieldCategory !== 'entrada' && f.fieldCategory !== 'neutro' && f.fieldCategory !== 'derivado')).length
          };
          
          console.log(`📊 ETAPA 3 - CAMPOS EXTRAÍDOS COM GEMINI:`);
          console.log(`   Total de campos: ${fields.length}`);
          console.log(`   Distribuição por categoria:`);
          console.log(`   - Entrada: ${categorias.entrada}`);
          console.log(`   - Neutro: ${categorias.neutro}`);
          console.log(`   - Derivado: ${categorias.derivado}`);
          
          return fields;
        } else {
          console.log(`⚠️ Gemini retornou resposta vazia ou sem campos`);
        }
      } else {
        const errorText = await response.text();
        console.log(`⚠️ Gemini API retornou erro ${response.status}: ${errorText}`);
      }
    } catch (geminiError: any) {
      console.log(`⚠️ Gemini falhou: ${geminiError.message}. Tentando fallback com OCR+Regex...`);
    }

    // Fallback: Método OCR+Regex (se Gemini falhar)
    console.log('📤 ETAPA 2 - FALLBACK: Usando método OCR+Regex...');
    const apiResult = await callFieldExtractionAPI(imageData);

    // Etapa 3: Processamento dos campos retornados
    if (apiResult && apiResult.status === 'success' && apiResult.campos && Object.keys(apiResult.campos).length > 0) {
      console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Processando ${Object.keys(apiResult.campos).filter(k => !k.endsWith('_categoria')).length} campos extraídos`);
      
      fields = Object.entries(apiResult.campos)
        .filter(([key]) => !key.endsWith('_categoria'))
        .map(([key, value]) => {
          const fieldType = determineFieldType('', key);
          const complexity = determineComplexity(fieldType, key);
          const fpValue = calculateFunctionPoints(fieldType, complexity);
          const fieldCategory = apiResult.campos[`${key}_categoria`] || classifyField(key, value as string);

          return {
            id: uuidv4(),
            name: key,
            type: fieldType,
            required: false,
            description: `Campo extraído via ${apiResult.fonte} (valor: ${value})`,
            complexity,
            fpValue,
            source: apiResult.fonte,
            fieldCategory,
            confidence: 0.9,
            position: undefined
          };
        });
    } else {
      console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Extração via API falhou. Realizando OCR local`);
      const ocrResults = await callVisionAPI(imageData);
      
      console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: OCR local concluído com ${ocrResults.length} elementos de texto`);

      fields = ocrResults.map(result => {
        const fieldType = determineFieldType('', result.text);
        const complexity = determineComplexity(fieldType, result.text);
        const fpValue = calculateFunctionPoints(fieldType, complexity);
        const fieldCategory = classifyField(result.text, '');

        return {
          id: uuidv4(),
          name: result.text,
          type: fieldType,
          required: false,
          description: `Campo identificado por OCR com ${Math.round((result.confidence || 0.8) * 100)}% de confiança`,
          complexity,
          fpValue,
          source: 'Google Cloud Vision',
          confidence: result.confidence,
          fieldCategory,
          position: result.boundingBox
        };
      });
    }

    const deduplicatedFields = deduplicateFields(fields);
    
    // Filtrar campos que são termos ignorados
    const filteredFields = deduplicatedFields.filter(field => !isIgnoredTerm(field.name));
    
    // Calcular estatísticas finais
    const categorias = {
      entrada: filteredFields.filter(f => f.fieldCategory === 'entrada').length,
      saida: filteredFields.filter(f => f.fieldCategory === 'saida').length,
      neutro: filteredFields.filter(f => f.fieldCategory === 'neutro' || !f.fieldCategory).length,
      derivado: filteredFields.filter(f => f.fieldCategory === 'derivado').length
    };
    
    console.log(`📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Processamento final concluído`);
    console.log(`   Total de campos: ${filteredFields.length}`);
    console.log(`   Distribuição por categoria:`);
    console.log(`   - Entrada: ${categorias.entrada}`);
    console.log(`   - Saída: ${categorias.saida}`);
    console.log(`   - Neutro: ${categorias.neutro}`);
    console.log(`   - Derivado: ${categorias.derivado}`);

    return filteredFields;
  } catch (error) {
    console.log('📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Erro durante extração de campos', error);
    return [];
  }
};

// Check if a term should be ignored (menus, buttons, etc.)
const isIgnoredTerm = (text: string): boolean => {
  const ignoredTerms = [
    'cancelar', 'ações', 'ajuda', 'voltar', 'menu', 'visualizar', 'arquivo',
    'configuração', 'administração', 'painel', 'versão', 'sair', 'entrar',
    'salvar', 'editar', 'excluir', 'novo', 'pesquisar', 'filtrar', 'ordenar',
    'imprimir', 'exportar', 'importar', 'atualizar', 'fechar', 'abrir',
    'copyright', 'todos os direitos', 'desenvolvido por', 'powered by',
    'página', 'de', 'próximo', 'anterior', 'primeiro', 'último', 'topo',
    'rodapé', 'cabeçalho', 'sistema', 'aplicação', 'app', 'versão', 'v.',
    'login', 'logout', 'senha', 'usuário', 'esqueci', 'lembrar', 'manter',
    'conectado', 'registrar', 'cadastrar', 'criar conta', 'entrar com',
    'cancel', 'actions', 'help', 'back', 'menu', 'view', 'file',
    'configuration', 'administration', 'dashboard', 'version', 'exit', 'enter',
    'save', 'edit', 'delete', 'new', 'search', 'filter', 'sort',
    'print', 'export', 'import', 'update', 'close', 'open',
    'copyright', 'all rights', 'developed by', 'powered by',
    'page', 'of', 'next', 'previous', 'first', 'last', 'top',
    'footer', 'header', 'system', 'application', 'app', 'version', 'v.',
    'login', 'logout', 'password', 'username', 'forgot', 'remember', 'keep',
    'connected', 'register', 'sign up', 'create account', 'sign in with'
  ];
  
  const lowerText = text.toLowerCase();
  return ignoredTerms.some(term => lowerText.includes(term));
};