/**
 * Parser de Texto Hierárquico → JSON para Mind Maps
 * 
 * Converte texto estruturado com caracteres de árvore (├─, └─, │) em estrutura JSON
 * compatível com MindMapVisual component.
 * 
 * Exemplo de entrada:
 * ```
 * Constitucionalização Simbólica
 * ├─ Características: Retórica, inefetividade
 * ├─ Exemplos: Direitos sociais
 * └─ Riscos: Descrédito
 * ```
 * 
 * Saída: { id, label, children: [...] }
 */

interface HierarchyNode {
  id: string;
  label: string;
  description?: string;
  children?: HierarchyNode[];
  level: number;
}

// EXPLICIT tree characters only (not generic bullets/dashes)
const TREE_CHARS = ['├─', '└─', '├──', '└──', '├', '└', '│', '|--', '+--'];
const INDENT_CHARS = ['│', '|', ' '];

/**
 * Detecta se o texto contém estrutura hierárquica EXPLÍCITA
 * Requer pelo menos 1 linha com caractere de árvore (├, └, │)
 * e descarta listas markdown normais (-, *, •)
 */
export function hasHierarchicalStructure(text: string): boolean {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Precisa ter pelo menos 2 linhas (raiz + filho)
  if (lines.length < 2) return false;
  
  // Conta linhas com caracteres EXPLÍCITOS de árvore (não genéricos)
  const explicitTreeLines = lines.filter(line => {
    // Verifica se a linha contém pelo menos um dos caracteres explícitos
    // E NÃO é apenas uma lista markdown normal
    const hasExplicitTreeChar = TREE_CHARS.some(char => line.includes(char));
    const isGenericList = /^\s*[-*•]\s+/.test(line); // Lista markdown normal
    
    return hasExplicitTreeChar && !isGenericList;
  });
  
  // Precisa ter pelo menos 1 linha com tree char
  return explicitTreeLines.length >= 1;
}

/**
 * Calcula o nível de indentação de uma linha
 */
function getIndentLevel(line: string): number {
  let level = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === ' ' || INDENT_CHARS.includes(char)) {
      level++;
    } else {
      break;
    }
  }
  return Math.floor(level / 2); // 2 espaços = 1 nível
}

/**
 * Remove caracteres de árvore e limpa a linha
 */
function cleanLine(line: string): string {
  let cleaned = line;
  
  // Remove caracteres de árvore
  for (const char of TREE_CHARS) {
    cleaned = cleaned.replace(char, '');
  }
  
  // Remove pipes verticais no início
  cleaned = cleaned.replace(/^[│|]+\s*/, '');
  
  return cleaned.trim();
}

/**
 * Extrai label e descrição de uma linha
 * Formatos suportados:
 * - "Label: Descrição"
 * - "Label - Descrição"
 * - "Label" (sem descrição)
 */
function extractLabelAndDescription(text: string): { label: string; description?: string } {
  // Formato "Label: Descrição"
  const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    return {
      label: colonMatch[1].trim(),
      description: colonMatch[2].trim()
    };
  }
  
  // Formato "Label - Descrição"
  const dashMatch = text.match(/^([^-]+)\s*-\s*(.+)$/);
  if (dashMatch && dashMatch[1].length < 50) { // Label não deve ser muito longo
    return {
      label: dashMatch[1].trim(),
      description: dashMatch[2].trim()
    };
  }
  
  // Sem descrição
  return { label: text };
}

/**
 * Constrói árvore hierárquica a partir de linhas processadas
 * Suporta múltiplas raízes criando um container virtual
 */
function buildTree(lines: Array<{ level: number; text: string; original: string }>): HierarchyNode | null {
  if (lines.length === 0) return null;
  
  // Conta quantas raízes (level 0) existem
  const rootCount = lines.filter(l => l.level === 0).length;
  
  // Se há múltiplas raízes, cria um container virtual
  if (rootCount > 1) {
    const virtualRoot: HierarchyNode = {
      id: 'virtual-root',
      label: 'Mapa Mental',
      level: -1,
      children: []
    };
    
    const stack: HierarchyNode[] = [virtualRoot];
    let nodeCounter = 1;
    
    for (const { level, text } of lines) {
      const { label, description } = extractLabelAndDescription(text);
      
      const node: HierarchyNode = {
        id: `node-${nodeCounter++}`,
        label,
        description,
        level,
        children: []
      };
      
      // Encontra o pai correto baseado no nível
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
      stack.push(node);
    }
    
    return virtualRoot;
  }
  
  // Caso de raiz única (comportamento original)
  const root: HierarchyNode = {
    id: 'root',
    label: lines[0].text,
    level: 0,
    children: []
  };
  
  const stack: HierarchyNode[] = [root];
  let nodeCounter = 1;
  
  for (let i = 1; i < lines.length; i++) {
    const { level, text } = lines[i];
    const { label, description } = extractLabelAndDescription(text);
    
    const node: HierarchyNode = {
      id: `node-${nodeCounter++}`,
      label,
      description,
      level,
      children: []
    };
    
    // Encontra o pai correto baseado no nível
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    }
    
    stack.push(node);
  }
  
  return root;
}

/**
 * Verifica se uma linha é uma raiz (seguida eventualmente por tree chars OU após hierarquia)
 */
function isRootLine(lines: string[], currentIndex: number): boolean {
  const current = lines[currentIndex].trim();
  if (!current) return false;
  
  // Se tem tree char, não é raiz
  const currentHasTreeChar = TREE_CHARS.some(char => lines[currentIndex].includes(char));
  if (currentHasTreeChar) {
    return false;
  }
  
  // Se é a primeira linha, é raiz
  if (currentIndex === 0) return true;
  
  // Verifica se a linha anterior tinha tree char (nova raiz após hierarquia)
  let prevLineHadTreeChar = false;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevLine = lines[i].trim();
    if (!prevLine) continue;
    
    if (TREE_CHARS.some(char => lines[i].includes(char))) {
      prevLineHadTreeChar = true;
      break;
    }
    break; // Para se encontrar linha não-vazia sem tree char
  }
  
  // Se linha anterior tinha tree char e esta não está indentada, é nova raiz
  if (prevLineHadTreeChar && getIndentLevel(lines[currentIndex]) === 0) {
    return true;
  }
  
  // Lookahead: verifica se alguma das próximas linhas tem tree char
  // (indica que esta linha é raiz de uma hierarquia)
  for (let i = currentIndex + 1; i < lines.length && i < currentIndex + 10; i++) {
    const nextLine = lines[i].trim();
    if (!nextLine) continue; // Pula linhas vazias
    
    const hasTreeChar = TREE_CHARS.some(char => lines[i].includes(char));
    if (hasTreeChar) {
      // Próxima linha tem tree char, então esta é uma raiz
      return true;
    }
    
    // Se encontrou outra linha sem tree char, para o lookahead
    // (pode ser outra raiz ou texto não-hierárquico)
    return false;
  }
  
  return false;
}

/**
 * Parser principal: converte texto hierárquico em estrutura JSON
 * Suporta múltiplas raízes no mesmo bloco de texto
 */
export function parseHierarchicalText(text: string): HierarchyNode | null {
  const lines = text.split('\n');
  const processedLines: Array<{ level: number; text: string; original: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detecta se é linha com caractere de árvore
    const hasTreeChar = TREE_CHARS.some(char => line.includes(char));
    
    // Aceita linha se:
    // 1. Tem caractere de árvore
    // 2. É uma raiz (primeira linha ou seguida por tree chars)
    if (hasTreeChar || isRootLine(lines, i)) {
      const level = hasTreeChar ? getIndentLevel(line) + 1 : 0;
      const cleaned = cleanLine(trimmed);
      
      if (cleaned) {
        processedLines.push({
          level,
          text: cleaned,
          original: line
        });
      }
    }
  }
  
  if (processedLines.length === 0) return null;
  
  // Ajusta níveis se o primeiro não for 0
  const minLevel = Math.min(...processedLines.map(l => l.level));
  if (minLevel > 0) {
    processedLines.forEach(l => l.level -= minLevel);
  }
  
  return buildTree(processedLines);
}

/**
 * Detecta e converte texto hierárquico em múltiplos blocos
 * Suporta múltiplos mapas em uma mesma mensagem
 */
export function parseMultipleHierarchies(text: string): HierarchyNode[] {
  const results: HierarchyNode[] = [];
  const blocks = text.split(/\n\n+/); // Divide por parágrafos vazios
  
  for (const block of blocks) {
    if (hasHierarchicalStructure(block)) {
      const tree = parseHierarchicalText(block);
      if (tree) {
        results.push(tree);
      }
    }
  }
  
  return results;
}
