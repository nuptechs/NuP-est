export type ContentType = 
  | { kind: "markdown"; content: string }
  | { kind: "mindmap"; data: any; fallback: string }
  | { kind: "chart"; data: ChartData; fallback: string }
  | { kind: "mixed"; segments: ContentSegment[] };

export type ContentSegment = 
  | { type: "markdown"; content: string }
  | { type: "mindmap"; data: any }
  | { type: "chart"; data: ChartData };

export interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  data: Array<Record<string, any>>;
  dataKeys: string[];
  labelKey: string;
  title?: string;
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

export function detectContentType(content: string): ContentType {
  const trimmed = content.trim();
  
  const hasMindMap = MINDMAP_MARKERS.some(pattern => pattern.test(trimmed));
  const hasChart = CHART_MARKERS.some(pattern => pattern.test(trimmed));
  
  if (!hasMindMap && !hasChart) {
    return { kind: "markdown", content };
  }
  
  if (hasMindMap && !hasChart) {
    const extracted = extractMindMapPayload(content);
    if (extracted) {
      return { kind: "mindmap", data: extracted, fallback: content };
    }
  }
  
  if (hasChart && !hasMindMap) {
    const extracted = extractChartPayload(content);
    if (extracted) {
      return { kind: "chart", data: extracted, fallback: content };
    }
  }
  
  const segments = extractMixedContent(content);
  if (segments.length > 1) {
    return { kind: "mixed", segments };
  }
  
  return { kind: "markdown", content };
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
        segments.push({ type: "markdown", content: textBefore });
      }
    }
    
    try {
      const blockContent = match[1].trim();
      const parsed = JSON.parse(blockContent);
      
      if (parsed.nodes || parsed.rootNode || parsed.mindmap) {
        segments.push({ type: "mindmap", data: parsed.mindmap || parsed });
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
      segments.push({ type: "markdown", content: textAfter });
    }
  }
  
  return segments.length > 0 ? segments : [{ type: "markdown", content }];
}
