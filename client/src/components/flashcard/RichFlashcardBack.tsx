/**
 * RichFlashcardBack - Multi-format flashcard back renderer
 * FASE 1: Markdown support (default)
 * FASE 2: Mind Map inline viewer
 * FASE 3: Diagrams, tables, mixed content
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Suspense, lazy } from "react";

// Lazy load MindMapViewer for better performance
const MindMapViewer = lazy(() => import("@/features/mindmaps/components/MindMapViewer"));

interface RichFlashcardBackProps {
  content: string;
  contentType?: "markdown" | "mindmap" | "diagram" | "table" | "mixed";
  backData?: any;
  mindMapId?: string;
  className?: string;
}

export default function RichFlashcardBack({
  content,
  contentType = "markdown",
  backData,
  mindMapId,
  className = "",
}: RichFlashcardBackProps) {
  
  // Process literal escape sequences for markdown
  const processMarkdown = (text: string) => {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '');
  };

  // Render based on content type
  const renderContent = () => {
    switch (contentType) {
      case "markdown":
        return (
          <div className={`flashcard-rich-content ${className}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground border-b pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-foreground">{children}</h4>,
                
                // Paragraphs
                p: ({ children }) => <p className="mb-3 leading-relaxed text-foreground">{children}</p>,
                
                // Lists
                ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-foreground">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                
                // Tables
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-border border border-border rounded-lg">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                tbody: ({ children }) => <tbody className="bg-card divide-y divide-border">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-muted/50 transition-colors">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-foreground border-r border-border last:border-r-0">
                    {children}
                  </td>
                ),
                
                // Code blocks
                code: ({ className, children, ...props }) => {
                  const inline = !className;
                  return inline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-muted p-4 rounded-lg text-sm font-mono text-foreground overflow-x-auto" {...props}>
                      {children}
                    </code>
                  );
                },
                
                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                
                // Horizontal rules
                hr: () => <hr className="my-6 border-border" />,
                
                // Strong/Bold
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                
                // Emphasis/Italic
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {processMarkdown(content)}
            </ReactMarkdown>
          </div>
        );

      case "mindmap":
        // FASE 2: Mind Map inline viewer
        if (!backData?.nodes || !backData?.edges) {
          return (
            <div className={`flashcard-mindmap-container ${className}`}>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">🗺️ Mapa Mental Indisponível</p>
                <p className="text-sm">Dados do mapa mental não encontrados</p>
              </div>
            </div>
          );
        }

        return (
          <div className={`flashcard-mindmap-container ${className}`}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg animate-pulse">
                  <div className="text-muted-foreground">Carregando mapa mental...</div>
                </div>
              }
            >
              <MindMapViewer
                mindMapData={{
                  nodes: backData.nodes,
                  edges: backData.edges,
                  layout: backData.layout,
                  styleSheetId: backData.styleSheetId,
                }}
                height="500px"
                showControls={true}
                showMinimap={false}
                enableZoom={true}
                enablePan={true}
              />
            </Suspense>
            
            {/* Optional: Show fallback text below mind map */}
            {content && content.trim() !== "" && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2 font-semibold">Descrição textual:</p>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {processMarkdown(content)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );

      case "diagram":
        // FASE 3: Diagram renderer
        return (
          <div className={`flashcard-diagram-container ${className}`}>
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">📊 Diagram Viewer</p>
              <p className="text-sm">FASE 3: Em desenvolvimento</p>
            </div>
          </div>
        );

      case "table":
        // FASE 3: Advanced table renderer
        return (
          <div className={`flashcard-table-container ${className}`}>
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">📋 Table Viewer</p>
              <p className="text-sm">FASE 3: Em desenvolvimento</p>
            </div>
          </div>
        );

      case "mixed":
        // FASE 3: Mixed content (multiple formats)
        return (
          <div className={`flashcard-mixed-container ${className}`}>
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">🎨 Mixed Content</p>
              <p className="text-sm">FASE 3: Em desenvolvimento</p>
            </div>
          </div>
        );

      default:
        // Fallback to markdown
        return (
          <div className={`flashcard-rich-content ${className}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processMarkdown(content)}
            </ReactMarkdown>
          </div>
        );
    }
  };

  return renderContent();
}
