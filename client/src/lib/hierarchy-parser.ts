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

const TREE_CHARS = ['├─', '└─', '├──', '└──', '├', '└', '|--', '+--', '•', '-', '*'];
const INDENT_CHARS = ['│', '|', ' '];

/**
 * Detecta se o texto contém estrutura hierárquica
 */
export function hasHierarchicalStructure(text: string): boolean {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length < 3) return false;
  
  // Verifica se há pelo menos 2 linhas com caracteres de árvore
  const treeLines = lines.filter(line => 
    TREE_CHARS.some(char => line.includes(char))
  );
  
  return treeLines.length >= 2;
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
 */
function buildTree(lines: Array<{ level: number; text: string; original: string }>): HierarchyNode | null {
  if (lines.length === 0) return null;
  
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
 * Parser principal: converte texto hierárquico em estrutura JSON
 */
export function parseHierarchicalText(text: string): HierarchyNode | null {
  const lines = text.split('\n');
  const processedLines: Array<{ level: number; text: string; original: string }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detecta se é linha com caractere de árvore
    const hasTreeChar = TREE_CHARS.some(char => line.includes(char));
    
    if (hasTreeChar || processedLines.length === 0) {
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
