export type ContentType = 
  | { kind: "markdown"; content: string }
  | { kind: "mindmap"; data: any; fallback: string; visual: boolean }
  | { kind: "chart"; data: ChartData; fallback: string }
  | { kind: "table"; headers: string[]; rows: string[][]; interactive: boolean }
  | { kind: "mixed"; segments: ContentSegment[] };

export type ContentSegment = 
  | { type: "markdown"; content: string }
  | { type: "mindmap"; data: any; visual: boolean }
  | { type: "chart"; data: ChartData }
  | { type: "table"; headers: string[]; rows: string[][]; interactive: boolean };

export interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  data: Array<Record<string, any>>;
  dataKeys: string[];
  labelKey: string;
  title?: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

const MINDMAP_MARKERS = [
  /```json\s*{[^`]*"nodes"\s*:/s,
  /```mindmap/i,
  /\bmindmap\s*data\s*:/i,
];

const CHART_MARKERS = [
  /```chart/i,
  /```json\s*{[^`]*"data"\s*:\s*\[/s,
  /\bchart\s*data\s*:/i,
];

function countMindMapNodes(node: any): number {
  if (!node) return 0;
  let count = 1;
  if (node.children && Array.isArray(node.children)) {
    count += node.children.reduce((sum: number, child: any) => sum + countMindMapNodes(child), 0);
  }
  return count;
}

function getMindMapDepth(node: any): number {
  if (!node) return 0;
  if (!node.children || !Array.isArray(node.children) || node.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...node.children.map(getMindMapDepth));
}

export function detectContentType(content: string): ContentType {
  const trimmed = content.trim();
  
  const hasMindMap = MINDMAP_MARKERS.some(pattern => pattern.test(trimmed));
  const hasChart = CHART_MARKERS.some(pattern => pattern.test(trimmed));
  const hasTable = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/.test(trimmed);
  
  if (!hasMindMap && !hasChart && !hasTable) {
    return { kind: "markdown", content };
  }
  
  if (hasMindMap && !hasChart && !hasTable) {
    const extracted = extractMindMapPayload(content);
    if (extracted) {
      const nodeCount = countMindMapNodes(extracted);
      const depth = getMindMapDepth(extracted);
      const useVisual = nodeCount > 5 || depth > 2;
      return { kind: "mindmap", data: extracted, fallback: content, visual: useVisual };
    }
  }
  
  if (hasChart && !hasMindMap && !hasTable) {
    const extracted = extractChartPayload(content);
    if (extracted) {
      return { kind: "chart", data: extracted, fallback: content };
    }
  }
  
  if (hasTable && !hasMindMap && !hasChart) {
    const extracted = extractTableData(content);
    if (extracted) {
      const useInteractive = extracted.headers.length > 3 || extracted.rows.length > 5;
      return { kind: "table", headers: extracted.headers, rows: extracted.rows, interactive: useInteractive };
    }
  }
  
  const segments = extractMixedContent(content);
  if (segments.length > 1) {
    return { kind: "mixed", segments };
  }
  
  return { kind: "markdown", content };
}

function extractTableData(content: string): TableData | null {
  try {
    const tableMatch = content.match(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/);
    if (tableMatch) {
      const headers = tableMatch[1].split('|').map(h => h.trim()).filter(Boolean);
      const rows = tableMatch[2].trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(Boolean)
      );
      
      if (headers.length > 0 && rows.length > 0 && rows.every(r => r.length === headers.length)) {
        return { headers, rows };
      }
    }
  } catch (e) {
    console.warn("Failed to parse table data:", e);
  }
  return null;
}

function extractMindMapPayload(content: string): any | null {
  try {
    const jsonBlockMatch = content.match(/```(?:json|mindmap)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed.nodes || parsed.rootNode || parsed.mindmap) {
        return parsed.mindmap || parsed;
      }
    }
    
    const inlineMatch = content.match(/(?:mindmap\s*data|mindmap)\s*:\s*(\{[\s\S]*?\})/i);
    if (inlineMatch) {
      const parsed = JSON.parse(inlineMatch[1]);
      if (parsed.nodes || parsed.rootNode) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse mind map payload:", e);
  }
  return null;
}

function extractChartPayload(content: string): ChartData | null {
  try {
    const jsonBlockMatch = content.match(/```(?:json|chart)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      
      if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        const firstItem = parsed.data[0];
        const keys = Object.keys(firstItem);
        
        const labelKey = parsed.labelKey || keys[0];
        const dataKeys = parsed.dataKeys || keys.filter(k => k !== labelKey && typeof firstItem[k] === 'number');
        
        return {
          type: parsed.type || "bar",
          data: parsed.data,
          dataKeys,
          labelKey,
          title: parsed.title,
        };
      }
    }
    
    const tableMatch = content.match(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/);
    if (tableMatch) {
      const headers = tableMatch[1].split('|').map(h => h.trim()).filter(Boolean);
      const rows = tableMatch[2].trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(Boolean)
      );
      
      if (headers.length > 0 && rows.length > 0 && rows.every(r => r.length === headers.length)) {
        const numericHeaders = headers.filter((_, i) => 
          rows.every(row => !isNaN(parseFloat(row[i])))
        );
        
        if (numericHeaders.length > 0) {
          const labelKey = headers[0];
          const data = rows.map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, i) => {
              obj[header] = isNaN(parseFloat(row[i])) ? row[i] : parseFloat(row[i]);
            });
            return obj;
          });
          
          return {
            type: "bar",
            data,
            dataKeys: numericHeaders,
            labelKey,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Failed to parse chart payload:", e);
  }
  return null;
}

function extractMixedContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  
  const codeBlockRegex = /```(?:json|mindmap|chart)?\s*([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        const tableData = extractTableData(textBefore);
        if (tableData) {
          const useInteractive = tableData.headers.length > 3 || tableData.rows.length > 5;
          segments.push({ 
            type: "table", 
            headers: tableData.headers, 
            rows: tableData.rows, 
            interactive: useInteractive 
          });
        } else {
          segments.push({ type: "markdown", content: textBefore });
        }
      }
    }
    
    try {
      const blockContent = match[1].trim();
      const parsed = JSON.parse(blockContent);
      
      if (parsed.nodes || parsed.rootNode || parsed.mindmap) {
        const mindmapData = parsed.mindmap || parsed;
        const nodeCount = countMindMapNodes(mindmapData);
        const depth = getMindMapDepth(mindmapData);
        const useVisual = nodeCount > 5 || depth > 2;
        segments.push({ type: "mindmap", data: mindmapData, visual: useVisual });
      } else if (parsed.data && Array.isArray(parsed.data)) {
        const firstItem = parsed.data[0];
        const keys = Object.keys(firstItem);
        const labelKey = parsed.labelKey || keys[0];
        const dataKeys = parsed.dataKeys || keys.filter(k => k !== labelKey && typeof firstItem[k] === 'number');
        
        segments.push({
          type: "chart",
          data: {
            type: parsed.type || "bar",
            data: parsed.data,
            dataKeys,
            labelKey,
            title: parsed.title,
          }
        });
      } else {
        segments.push({ type: "markdown", content: match[0] });
      }
    } catch (e) {
      segments.push({ type: "markdown", content: match[0] });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
      const tableData = extractTableData(textAfter);
      if (tableData) {
        const useInteractive = tableData.headers.length > 3 || tableData.rows.length > 5;
        segments.push({ 
          type: "table", 
          headers: tableData.headers, 
          rows: tableData.rows, 
          interactive: useInteractive 
        });
      } else {
        segments.push({ type: "markdown", content: textAfter });
      }
    }
  }
  
  return segments.length > 0 ? segments : [{ type: "markdown", content }];
}
