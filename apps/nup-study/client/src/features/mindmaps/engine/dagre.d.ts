declare module 'dagre' {
  export namespace graphlib {
    class Graph {
      setGraph(options: any): void;
      setDefaultEdgeLabel(callback: () => any): void;
      setNode(id: string, options: any): void;
      setEdge(source: string, target: string): void;
      node(id: string): any;
    }
  }

  export function layout(graph: graphlib.Graph): void;
}
