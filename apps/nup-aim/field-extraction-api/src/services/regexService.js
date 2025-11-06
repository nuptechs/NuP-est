import { logger } from '../utils/logger.js';

// Lista de palavras irrelevantes para ignorar (menus, botões, etc)
const termosIgnorados = [
  'cancelar', 'ações', 'ajuda', 'voltar', 'menu', 'visualizar', 'arquivo',
  'configuração', 'administração', 'painel', 'versão', 'sair', 'entrar',
  'salvar', 'editar', 'excluir', 'novo', 'pesquisar', 'filtrar', 'ordenar',
  'imprimir', 'exportar', 'importar', 'atualizar', 'fechar', 'abrir',
  'copyright', 'todos os direitos', 'desenvolvido por', 'powered by',
  'página', 'de', 'próximo', 'anterior', 'primeiro', 'último', 'topo',
  'rodapé', 'cabeçalho', 'sistema', 'aplicação', 'app', 'versão', 'v.',
  'login', 'logout', 'senha', 'usuário', 'esqueci', 'lembrar', 'manter',
  'conectado', 'registrar', 'cadastrar', 'criar conta', 'entrar com'
];

// Regex para capturar chave: valor e similares (versão aprimorada)
const regexes = [
  /^([\wÀ-ú()\/\s\.\-]{3,})[:：]\s*(.+)$/i,
  /^([\wÀ-ú()\/\s\.\-]{3,})\s*=\s*(.+)$/i,
  /^([\wÀ-ú()\/\s\.\-]{3,})\s*[-–—]\s*(.+)$/i,
  /^\[([\wÀ-ú\s]{3,})\]\s*(.+)$/i,
  /^["“”']([\wÀ-ú\s]{3,})["“”']\s+(.+)$/i,
  /^([\wÀ-ú\s]{3,})\s{2,}(.+)$/i,
  /^([\wÀ-ú\s]{3,})\n+(.+)$/i,
  /^(Nome|Email|Telefone|Endereço|CPF|CNPJ|Data|Código|Status|Valor|Preço|Quantidade|Total|Descrição|Observação)[\s:：\-–=]*\s*(.+)$/i
];

const cleanFieldName = (fieldName) => {
  let cleaned = fieldName.trim().replace(/[:*\s]+$/, '');
  cleaned = cleaned.toLowerCase()
    .replace(/[^\wÀ-ú]/g, ' ')
    .trim()
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase());
  return cleaned;
};

const cleanFieldValue = (value) => {
  return value.trim();
};

const extrairCampos = (textoOCR) => {
  const linhas = textoOCR.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const campos = {};

  for (const linha of linhas) {
    if (linha.length < 4) continue;
    const textoNormalizado = linha.toLowerCase();
    if (termosIgnorados.some(termo => textoNormalizado.includes(termo))) continue;

    for (const regex of regexes) {
      const match = linha.match(regex);
      if (match) {
        const chave = match[1].trim();
        const valor = match[2].trim();
        if (chave.length < 3 || valor.length < 1) continue;
        if (termosIgnorados.includes(chave.toLowerCase())) continue;

        const chaveNormalizada = cleanFieldName(chave);
        campos[chaveNormalizada] = valor;
        break;
      }
    }
  }

  return campos;
};

const extractKeyValuePair = (line) => {
  if (line.length < 3) return null;
  const textoNormalizado = line.toLowerCase();
  if (termosIgnorados.some(termo => textoNormalizado.includes(termo))) return null;

  for (const pattern of regexes) {
    const match = line.match(pattern);
    if (match && match[1] && match[2]) {
      const key = cleanFieldName(match[1]);
      const value = cleanFieldValue(match[2]);
      if (!key || !value) continue;
      if (termosIgnorados.includes(key.toLowerCase())) continue;
      return { key, value };
    }
  }

  return null;
};

const isLikelyFormField = (textBlock) => {
  const { text, boundingBox } = textBlock;
  if (text.length > 100) return false;
  const textoNormalizado = text.toLowerCase();
  if (termosIgnorados.some(termo => textoNormalizado.includes(termo))) return false;

  const fieldIndicators = [
    'nome', 'email', 'telefone', 'endereço', 'cpf', 'cnpj', 'data', 'código',
    'status', 'valor', 'preço', 'quantidade', 'total', 'observação', 'descrição',
    'name', 'phone', 'address', 'date', 'code', 'price', 'amount', 'description'
  ];

  if (fieldIndicators.some(indicator => textoNormalizado.includes(indicator))) {
    return true;
  }

  if (text.endsWith(':')) return true;
  if (extractKeyValuePair(text)) return true;

  return false;
};

export const extractFieldsWithRegex = (text, textBlocks = []) => {
  try {
    const camposExtraidos = extrairCampos(text);

    if (Object.keys(camposExtraidos).length < 3) {
      logger.info('Poucos campos encontrados com método refinado, tentando método alternativo');

      const lines = text.split('\n');
      const fields = {};

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const extracted = extractKeyValuePair(trimmedLine);
        if (extracted) {
          fields[extracted.key] = extracted.value;
        }
      });

      if (textBlocks.length > 0) {
        textBlocks.forEach(block => {
          if (!isLikelyFormField(block)) return;

          const extracted = extractKeyValuePair(block.text);
          if (extracted && !fields[extracted.key]) {
            fields[extracted.key] = extracted.value;
          } else if (!extracted) {
            const key = cleanFieldName(block.text);
            if (key.length > 2 && !fields[key]) {
              fields[key] = '';
            }
          }
        });
      }

      const combinedFields = { ...fields, ...camposExtraidos };
      logger.info(`Regex extraction found ${Object.keys(combinedFields).length} fields`);

      return {
        success: true,
        fields: combinedFields
      };
    }

    logger.info(`Regex extraction found ${Object.keys(camposExtraidos).length} fields`);

    return {
      success: true,
      fields: camposExtraidos
    };
  } catch (error) {
    logger.error('Error in regex extraction:', error);
    return {
      success: false,
      error: `Regex extraction failed: ${error.message}`,
      fields: {}
    };
  }
};