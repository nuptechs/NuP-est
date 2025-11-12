import { v4 as uuidv4 } from "uuid";

export interface ExtractedField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
  complexity: 'Low' | 'Average' | 'High';
  fpValue: number;
  source: string;
  confidence?: number;
  fieldCategory?: 'entrada' | 'saida' | 'neutro';
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

// Patterns for field detection
const fieldPatterns = {
  // HTML form elements
  htmlInput: /<input[^>]*type=["']([^"']+)["'][^>]*>/gi,
  htmlLabel: /<label[^>]*>(.*?)<\/label>/gi,
  htmlSelect: /<select[^>]*>(.*?)<\/select>/gi,
  htmlTextarea: /<textarea[^>]*>(.*?)<\/textarea>/gi,
  htmlRequired: /required/i,
  
  // Common field names in Portuguese
  ptFieldNames: [
    'nome', 'email', 'telefone', 'endereço', 'cidade', 'estado', 'cep', 'cpf', 'rg',
    'data', 'nascimento', 'sexo', 'gênero', 'profissão', 'empresa', 'cargo',
    'salário', 'observações', 'senha', 'confirmar', 'código', 'descrição',
    'título', 'subtítulo', 'categoria', 'status', 'prioridade', 'anexo', 'url', 'site'
  ],
  
  // Common field names in English
  enFieldNames: [
    'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'ssn', 'id',
    'date', 'birth', 'gender', 'sex', 'occupation', 'company', 'position',
    'salary', 'notes', 'password', 'confirm', 'code', 'description',
    'title', 'subtitle', 'category', 'status', 'priority', 'attachment', 'url', 'website'
  ],
  
  // Field indicators
  fieldIndicators: [
    'campo', 'field', 'input', 'entrada', 'formulário', 'form', 'label', 'rotulo'
  ],
  
  // Required indicators
  requiredIndicators: [
    '*', 'obrigatório', 'required', 'mandatory'
  ],
  
  // Input field indicators
  inputIndicators: [
    'informe', 'digite', 'preencha', 'insira', 'forneça', 'entre com', 'informar', 
    'digitar', 'preencher', 'inserir', 'fornecer', 'entrar com', 'obrigatório',
    'enter', 'input', 'fill', 'provide', 'type', 'required', 'mandatory'
  ],
  
  // Output field indicators
  outputIndicators: [
    'calculado', 'retornado', 'resultado', 'total', 'valor final', 'subtotal',
    'gerado', 'processado', 'computed', 'calculated', 'returned', 'result',
    'generated', 'processed', 'output', 'display', 'shown', 'presented'
  ]
};

// Extract fields from data
export const extractFieldsFromData = (data: string): ExtractedField[] => {
  if (!data) return [];
  
  const extractedFields: ExtractedField[] = [];
  
  try {
    console.log('🔍 DEBUG - extractFieldsFromData - Dados recebidos:', data.substring(0, 100) + '...');
    
    // Check if data is JSON
    try {
      // If data starts with IMAGE_DATA, it might contain images
      if (data.includes('IMAGE_DATA:')) {
        // Extract text content
        const lines = data.split('\n');
        const textLines = lines.filter(line => !line.startsWith('IMAGE_DATA:'));
        data = textLines.join('\n');
      }
      
      // Try to parse as JSON
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        const jsonData = JSON.parse(data);
        console.log('🔍 DEBUG - extractFieldsFromData - Dados JSON parseados:', jsonData);
        
        // If it's an array of extracted fields, return it directly
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id && jsonData[0].name && jsonData[0].type) {
          console.log('🔍 DEBUG - extractFieldsFromData - Retornando array de campos diretamente:', jsonData.length);
          return jsonData;
        }
        
        // Otherwise, extract fields from JSON structure
        extractFieldsFromJSON(jsonData, '', extractedFields);
      }
    } catch (e) {
      console.log('🔍 DEBUG - extractFieldsFromData - Erro ao analisar JSON:', e);
      // Not valid JSON, continue with other extraction methods
    }
    
    // Extract from HTML
    extractFieldsFromHTML(data, extractedFields);
    
    // Extract from plain text
    extractFieldsFromText(data, extractedFields);
    
    // Deduplicate fields by name
    const uniqueFields = deduplicateFields(extractedFields);
    console.log('🔍 DEBUG - extractFieldsFromData - Campos após deduplicate:', uniqueFields.length);
    
    // Assign function point values and field categories
    const fieldsWithFP = uniqueFields.map(field => {
      const fieldCategory = classifyField(field.name, field.description || '');
      const fpValue = calculateFunctionPoints(field.type, field.complexity);
      
      return {
        ...field,
        fpValue,
        fieldCategory
      };
    });
    
    console.log('🔍 DEBUG - extractFieldsFromData - Campos finais com FP:', fieldsWithFP.length);
    return fieldsWithFP;
  } catch (error) {
    console.error('Error extracting fields:', error);
    return [];
  }
};

// Extract fields from JSON structure
const extractFieldsFromJSON = (
  json: any, 
  parentPath: string, 
  results: ExtractedField[]
) => {
  if (!json) return;
  
  if (typeof json === 'object') {
    // Process object properties
    Object.entries(json).forEach(([key, value]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      
      // Skip if key looks like a system property
      if (key.startsWith('_') || key === 'id' || key === 'key') return;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if this looks like a field definition
        if (value.type || value.label || value.name) {
          const fieldName = value.label || value.name || key;
          const fieldType = determineFieldType(value.type, fieldName);
          const required = !!value.required;
          const fieldCategory = classifyField(fieldName, value.description || value.placeholder || '');
          
          results.push({
            id: uuidv4(),
            name: fieldName,
            type: fieldType,
            required,
            description: value.description || value.placeholder || `Campo ${fieldName}`,
            complexity: determineComplexity(fieldType, fieldName),
            fpValue: 0, // Will be calculated later
            source: 'JSON',
            fieldCategory
          });
        } else {
          // Recurse into nested objects
          extractFieldsFromJSON(value, path, results);
        }
      } else if (Array.isArray(value)) {
        // Check if array contains field definitions
        if (value.length > 0 && typeof value[0] === 'object' && (value[0].type || value[0].label || value[0].name)) {
          value.forEach(item => {
            const fieldName = item.label || item.name || key;
            const fieldType = determineFieldType(item.type, fieldName);
            const required = !!item.required;
            const fieldCategory = classifyField(fieldName, item.description || item.placeholder || '');
            
            results.push({
              id: uuidv4(),
              name: fieldName,
              type: fieldType,
              required,
              description: item.description || item.placeholder || `Campo ${fieldName}`,
              complexity: determineComplexity(fieldType, fieldName),
              fpValue: 0, // Will be calculated later
              source: 'JSON Array',
              fieldCategory
            });
          });
        } else {
          // Recurse into array items
          value.forEach((item, index) => {
            extractFieldsFromJSON(item, `${path}[${index}]`, results);
          });
        }
      } else if (typeof value === 'string' && isFieldName(key)) {
        // This looks like a field name
        const fieldType = determineFieldType('', key);
        const fieldCategory = classifyField(key, value);
        
        results.push({
          id: uuidv4(),
          name: formatFieldName(key),
          type: fieldType,
          required: false,
          complexity: determineComplexity(fieldType, key),
          fpValue: 0, // Will be calculated later
          source: 'JSON Property',
          fieldCategory
        });
      }
    });
  }
};

// Extract fields from HTML
const extractFieldsFromHTML = (html: string, results: ExtractedField[]) => {
  // Extract input fields
  const inputRegex = /<input[^>]*>/gi;
  let match;
  
  while ((match = inputRegex.exec(html)) !== null) {
    const inputTag = match[0];
    
    // Get type
    const typeMatch = inputTag.match(/type=["']([^"']+)["']/i);
    const type = typeMatch ? typeMatch[1] : 'text';
    
    // Get name/id
    const nameMatch = inputTag.match(/(?:name|id)=["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : `campo_${results.length + 1}`;
    
    // Check if required
    const required = inputTag.includes('required');
    
    // Get placeholder
    const placeholderMatch = inputTag.match(/placeholder=["']([^"']+)["']/i);
    const placeholder = placeholderMatch ? placeholderMatch[1] : '';
    
    // Classify field
    const fieldCategory = classifyField(name, placeholder);
    
    results.push({
      id: uuidv4(),
      name: formatFieldName(name),
      type: mapHTMLInputTypeToFieldType(type),
      required,
      description: placeholder,
      complexity: determineComplexity(type, name),
      fpValue: 0, // Will be calculated later
      source: 'HTML',
      fieldCategory
    });
  }
  
  // Extract select fields
  const selectRegex = /<select[^>]*>[\s\S]*?<\/select>/gi;
  
  while ((match = selectRegex.exec(html)) !== null) {
    const selectTag = match[0];
    
    // Get name/id
    const nameMatch = selectTag.match(/(?:name|id)=["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : `select_${results.length + 1}`;
    
    // Check if required
    const required = selectTag.includes('required');
    
    // Count options
    const optionCount = (selectTag.match(/<option[^>]*>/gi) || []).length;
    
    // Classify field
    const fieldCategory = classifyField(name, '');
    
    results.push({
      id: uuidv4(),
      name: formatFieldName(name),
      type: 'select',
      required,
      description: `Select com ${optionCount} opções`,
      complexity: optionCount > 10 ? 'High' : optionCount > 5 ? 'Average' : 'Low',
      fpValue: 0, // Will be calculated later
      source: 'HTML',
      fieldCategory
    });
  }
  
  // Extract textarea fields
  const textareaRegex = /<textarea[^>]*>[\s\S]*?<\/textarea>/gi;
  
  while ((match = textareaRegex.exec(html)) !== null) {
    const textareaTag = match[0];
    
    // Get name/id
    const nameMatch = textareaTag.match(/(?:name|id)=["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : `textarea_${results.length + 1}`;
    
    // Check if required
    const required = textareaTag.includes('required');
    
    // Get placeholder
    const placeholderMatch = textareaTag.match(/placeholder=["']([^"']+)["']/i);
    const placeholder = placeholderMatch ? placeholderMatch[1] : '';
    
    // Classify field
    const fieldCategory = classifyField(name, placeholder);
    
    results.push({
      id: uuidv4(),
      name: formatFieldName(name),
      type: 'textarea',
      required,
      description: placeholder,
      complexity: 'High',
      fpValue: 0, // Will be calculated later
      source: 'HTML',
      fieldCategory
    });
  }
  
  // Extract labels and associate with fields
  const labelRegex = /<label[^>]*>[\s\S]*?<\/label>/gi;
  
  while ((match = labelRegex.exec(html)) !== null) {
    const labelTag = match[0];
    
    // Get for attribute
    const forMatch = labelTag.match(/for=["']([^"']+)["']/i);
    const forAttr = forMatch ? forMatch[1] : null;
    
    // Get label text
    const textMatch = labelTag.match(/>([^<]+)</);
    const labelText = textMatch ? textMatch[1].trim() : '';
    
    if (labelText) {
      // Check if this label is for an existing field
      if (forAttr) {
        const existingField = results.find(f => f.name.toLowerCase() === forAttr.toLowerCase());
        if (existingField) {
          existingField.name = labelText;
          // Update field category based on the label text
          existingField.fieldCategory = classifyField(labelText, existingField.description || '');
        }
      } else {
        // This might be a standalone label, check if it looks like a field name
        if (isFieldName(labelText)) {
          const fieldType = determineFieldType('', labelText);
          const fieldCategory = classifyField(labelText, '');
          
          results.push({
            id: uuidv4(),
            name: labelText,
            type: fieldType,
            required: labelText.includes('*'),
            complexity: determineComplexity(fieldType, labelText),
            fpValue: 0, // Will be calculated later
            source: 'HTML Label',
            fieldCategory
          });
        }
      }
    }
  }
};

// Extract fields from plain text
const extractFieldsFromText = (text: string, results: ExtractedField[]) => {
  const lines = text.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    // Skip lines that are too short
    if (line.length < 3) return;
    
    // Check if line contains field indicators
    const containsFieldIndicator = fieldPatterns.fieldIndicators.some(indicator => 
      line.toLowerCase().includes(indicator)
    );
    
    // Check if line matches common field names
    const matchesFieldName = isFieldName(line);
    
    if (containsFieldIndicator || matchesFieldName) {
      // Clean up the line
      let fieldName = line;
      
      // Remove common prefixes
      fieldName = fieldName.replace(/^(campo|field|input|label|rotulo)[\s:]+/i, '');
      
      // Check if required
      const isRequired = fieldPatterns.requiredIndicators.some(indicator => 
        fieldName.includes(indicator)
      );
      
      // Remove required indicators
      fieldPatterns.requiredIndicators.forEach(indicator => {
        fieldName = fieldName.replace(indicator, '');
      });
      
      // Clean up remaining punctuation and whitespace
      fieldName = fieldName.replace(/[:*]$/, '').trim();
      
      if (fieldName) {
        const fieldType = determineFieldType('', fieldName);
        const fieldCategory = classifyField(fieldName, '');
        
        results.push({
          id: uuidv4(),
          name: fieldName,
          type: fieldType,
          required: isRequired,
          complexity: determineComplexity(fieldType, fieldName),
          fpValue: 0, // Will be calculated later
          source: 'Text',
          fieldCategory
        });
      }
    }
    
    // Check for key-value pairs (field: value)
    const keyValueMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();
      
      if (isFieldName(key) && !isIgnoredTerm(key)) {
        const fieldType = determineFieldType('', key);
        const fieldCategory = classifyField(key, value);
        
        results.push({
          id: uuidv4(),
          name: key,
          type: fieldType,
          required: key.includes('*'),
          description: value,
          complexity: determineComplexity(fieldType, key),
          fpValue: 0, // Will be calculated later
          source: 'Text KeyValue',
          fieldCategory
        });
      }
    }
  });
};

// Check if a string looks like a field name
const isFieldName = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Check against common field names
  if (fieldPatterns.ptFieldNames.some(name => lowerText.includes(name)) ||
      fieldPatterns.enFieldNames.some(name => lowerText.includes(name))) {
    return true;
  }
  
  // Check for "campo de" pattern
  if (lowerText.includes('campo de') || lowerText.includes('field for')) {
    return true;
  }
  
  // Check for label-like patterns
  if (lowerText.includes(':') && lowerText.length < 50) {
    return true;
  }
  
  // Check for camelCase or snake_case identifiers
  if (/^[a-z][a-zA-Z0-9]*([A-Z][a-zA-Z0-9]*)*$/.test(text) || 
      /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(text)) {
    return true;
  }
  
  return false;
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

// Format field name for better readability
const formatFieldName = (name: string): string => {
  // Convert camelCase to spaces
  let formatted = name.replace(/([A-Z])/g, ' $1');
  
  // Convert snake_case to spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  return formatted.trim();
};

// Map HTML input type to field type
const mapHTMLInputTypeToFieldType = (htmlType: string): string => {
  const mapping: Record<string, string> = {
    'text': 'text',
    'password': 'text',
    'email': 'email',
    'tel': 'text',
    'number': 'number',
    'date': 'date',
    'datetime-local': 'date',
    'time': 'text',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'file': 'file',
    'url': 'url',
    'search': 'text',
    'color': 'text',
    'range': 'number',
    'hidden': 'text'
  };
  
  return mapping[htmlType.toLowerCase()] || 'text';
};

// Determine field type based on name and context
export const determineFieldType = (explicitType: string, name: string): string => {
  if (explicitType) {
    return mapHTMLInputTypeToFieldType(explicitType);
  }
  
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('senha') || lowerName.includes('password')) return 'text';
  if (lowerName.includes('data') || lowerName.includes('date') || lowerName.includes('nascimento')) return 'date';
  if (lowerName.includes('número') || lowerName.includes('number') || 
      lowerName.includes('quantidade') || lowerName.includes('quantity') || 
      lowerName.includes('valor') || lowerName.includes('amount') || 
      lowerName.includes('preço') || lowerName.includes('price')) return 'number';
  if (lowerName.includes('descrição') || lowerName.includes('description') || 
      lowerName.includes('observação') || lowerName.includes('observation') || 
      lowerName.includes('comentário') || lowerName.includes('comment') || 
      lowerName.includes('mensagem') || lowerName.includes('message')) return 'textarea';
  if (lowerName.includes('aceito') || lowerName.includes('accept') || 
      lowerName.includes('concordo') || lowerName.includes('agree') || 
      lowerName.includes('lembrar') || lowerName.includes('remember')) return 'checkbox';
  if (lowerName.includes('sexo') || lowerName.includes('gender') || 
      lowerName.includes('opção') || lowerName.includes('option')) return 'radio';
  if (lowerName.includes('estado') || lowerName.includes('state') || 
      lowerName.includes('país') || lowerName.includes('country') || 
      lowerName.includes('categoria') || lowerName.includes('category') || 
      lowerName.includes('tipo') || lowerName.includes('type') || 
      lowerName.includes('status')) return 'select';
  if (lowerName.includes('arquivo') || lowerName.includes('file') || 
      lowerName.includes('anexo') || lowerName.includes('attachment') || 
      lowerName.includes('upload')) return 'file';
  if (lowerName.includes('url') || lowerName.includes('site') || 
      lowerName.includes('website') || lowerName.includes('link')) return 'url';
  
  // Default to text
  return 'text';
};

// Determine field complexity
export const determineComplexity = (fieldType: string, name: string): 'Low' | 'Average' | 'High' => {
  // Complex field types
  if (['file', 'textarea'].includes(fieldType)) {
    return 'High';
  }
  
  // Medium complexity field types
  if (['date', 'select', 'email', 'url', 'number'].includes(fieldType)) {
    return 'Average';
  }
  
  // Name-based complexity
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cpf') || lowerName.includes('cnpj') || 
      lowerName.includes('password') || lowerName.includes('senha') ||
      lowerName.includes('completo') || lowerName.includes('complete')) {
    return 'High';
  }
  
  if (lowerName.length > 20 || lowerName.includes(' ')) {
    return 'Average';
  }
  
  // Default to low complexity
  return 'Low';
};

// Calculate function points based on field type and complexity
export const calculateFunctionPoints = (fieldType: string, complexity: 'Low' | 'Average' | 'High'): number => {
  // External Input (EI)
  if (['text', 'email', 'number', 'date', 'checkbox', 'radio', 'file', 'url'].includes(fieldType)) {
    if (complexity === 'Low') return 3;
    if (complexity === 'Average') return 4;
    return 6;
  }
  
  // External Output (EO)
  if (['textarea', 'select'].includes(fieldType)) {
    if (complexity === 'Low') return 4;
    if (complexity === 'Average') return 5;
    return 7;
  }
  
  // Default
  return 4;
};

// Classify field as entrada (input), saida (output), or neutro (neutral)
export const classifyField = (fieldName: string, fieldValue: string): 'entrada' | 'saida' | 'neutro' => {
  const lowerName = fieldName.toLowerCase();
  const lowerValue = fieldValue.toLowerCase();
  
  // Check for input indicators
  const isInput = fieldPatterns.inputIndicators.some(indicator => 
    lowerName.includes(indicator) || lowerValue.includes(indicator)
  );
  
  if (isInput) return 'entrada';
  
  // Check for output indicators
  const isOutput = fieldPatterns.outputIndicators.some(indicator => 
    lowerName.includes(indicator) || lowerValue.includes(indicator)
  );
  
  if (isOutput) return 'saida';
  
  // Check field type-based classification
  if (lowerName.includes('total') || lowerName.includes('subtotal') || 
      lowerName.includes('resultado') || lowerName.includes('result') ||
      lowerName.includes('calculado') || lowerName.includes('calculated') ||
      lowerName.includes('gerado') || lowerName.includes('generated') ||
      lowerName.includes('status') || lowerName.includes('situação')) {
    return 'saida';
  }
  
  // Check for form input patterns
  if (lowerName.includes('digite') || lowerName.includes('informe') || 
      lowerName.includes('preencha') || lowerName.includes('enter') || 
      lowerName.includes('input') || lowerName.includes('fill') ||
      lowerName.endsWith('?') || lowerName.includes('obrigatório') || 
      lowerName.includes('required')) {
    return 'entrada';
  }
  
  // Check for common input fields
  if (lowerName.includes('nome') || lowerName.includes('name') ||
      lowerName.includes('email') || lowerName.includes('telefone') || 
      lowerName.includes('phone') || lowerName.includes('endereço') || 
      lowerName.includes('address') || lowerName.includes('cpf') || 
      lowerName.includes('cnpj') || lowerName.includes('rg') ||
      lowerName.includes('data') && !lowerName.includes('atualização') ||
      lowerName.includes('date') && !lowerName.includes('update')) {
    return 'entrada';
  }
  
  // Check for common output fields
  if (lowerName.includes('código') || lowerName.includes('code') ||
      lowerName.includes('id') || lowerName.includes('número') && lowerName.includes('pedido') ||
      lowerName.includes('number') && lowerName.includes('order') ||
      lowerName.includes('criado em') || lowerName.includes('created at') ||
      lowerName.includes('atualizado em') || lowerName.includes('updated at') ||
      lowerName.includes('versão') || lowerName.includes('version')) {
    return 'saida';
  }
  
  // Default to neutral
  return 'neutro';
};

// Deduplicate fields by name
export const deduplicateFields = (fields: ExtractedField[]): ExtractedField[] => {
  const uniqueFields: ExtractedField[] = [];
  const seenNames = new Set<string>();
  
  fields.forEach(field => {
    const lowerName = field.name.toLowerCase();
    if (!seenNames.has(lowerName)) {
      seenNames.add(lowerName);
      uniqueFields.push(field);
    }
  });
  
  return uniqueFields;
};

// Analyze function points
export const analyzeFunctionPoints = (fields: ExtractedField[]): FunctionPointAnalysis => {
  // Initialize breakdown
  const breakdown = {
    EI: { low: 0, average: 0, high: 0, total: 0, fp: 0 },
    EO: { low: 0, average: 0, high: 0, total: 0, fp: 0 },
    EQ: { low: 0, average: 0, high: 0, total: 0, fp: 0 },
    ILF: { low: 0, average: 0, high: 0, total: 0, fp: 0 },
    EIF: { low: 0, average: 0, high: 0, total: 0, fp: 0 }
  };
  
  // Categorize fields
  fields.forEach(field => {
    let category: 'EI' | 'EO' | 'EQ' | 'ILF' | 'EIF';
    
    // Determine category based on field type and fieldCategory
    if (field.fieldCategory === 'entrada' || 
        ['text', 'email', 'number', 'date', 'checkbox', 'radio', 'file', 'url'].includes(field.type)) {
      category = 'EI'; // External Input
    } else if (field.fieldCategory === 'saida' || ['textarea'].includes(field.type)) {
      category = 'EO'; // External Output
    } else {
      category = 'EQ'; // External Query (default for select and others)
    }
    
    // Increment appropriate counter
    if (field.complexity === 'Low') {
      breakdown[category].low++;
    } else if (field.complexity === 'Average') {
      breakdown[category].average++;
    } else {
      breakdown[category].high++;
    }
    
    breakdown[category].total++;
  });
  
  // Calculate function points
  breakdown.EI.fp = (breakdown.EI.low * 3) + (breakdown.EI.average * 4) + (breakdown.EI.high * 6);
  breakdown.EO.fp = (breakdown.EO.low * 4) + (breakdown.EO.average * 5) + (breakdown.EO.high * 7);
  breakdown.EQ.fp = (breakdown.EQ.low * 3) + (breakdown.EQ.average * 4) + (breakdown.EQ.high * 6);
  breakdown.ILF.fp = (breakdown.ILF.low * 7) + (breakdown.ILF.average * 10) + (breakdown.ILF.high * 15);
  breakdown.EIF.fp = (breakdown.EIF.low * 5) + (breakdown.EIF.average * 7) + (breakdown.EIF.high * 10);
  
  const totalFP = breakdown.EI.fp + breakdown.EO.fp + breakdown.EQ.fp + breakdown.ILF.fp + breakdown.EIF.fp;
  
  return {
    totalFields: fields.length,
    totalFunctionPoints: totalFP,
    fields,
    detailedBreakdown: breakdown
  };
};