import { Card } from "@/components/ui/card";
import { AlertCircle, Network } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MindMapInlineProps {
  data: any;
  fallback?: string;
}

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children?: MindMapNode[];
}

export function MindMapInline({ data, fallback }: MindMapInlineProps) {
  if (!data || (!data.nodes && !data.rootNode)) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível renderizar o mapa mental. Estrutura inválida.
        </AlertDescription>
      </Alert>
    );
  }

  const renderNode = (node: MindMapNode, level: number = 0) => {
    const indent = level * 24;
    const colors = [
      "border-primary/50 bg-primary/5",
      "border-chart-2/50 bg-chart-2/5",
      "border-chart-3/50 bg-chart-3/5",
      "border-chart-4/50 bg-chart-4/5",
      "border-chart-5/50 bg-chart-5/5",
    ];
    const colorClass = colors[level % colors.length];

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }}>
        <div className={`my-2 rounded-lg border-l-4 ${colorClass} p-3 transition-all hover:shadow-sm`}>
          <div className="flex items-start gap-2">
            <Network className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm break-words">{node.label}</p>
              {node.description && (
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {node.description}
                </p>
              )}
            </div>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNode = data.rootNode || (data.nodes && data.nodes[0]);

  return (
    <Card className="my-4 p-4 bg-secondary/10 dark:bg-secondary/5 border-border/50">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
        <Network className="h-5 w-5 text-primary" />
        <h4 className="font-semibold text-sm">Mapa Mental</h4>
      </div>
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {Array.isArray(data.nodes) ? (
          data.nodes.map((node: MindMapNode) => renderNode(node, 0))
        ) : rootNode ? (
          renderNode(rootNode, 0)
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estrutura de mapa mental não reconhecida.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
