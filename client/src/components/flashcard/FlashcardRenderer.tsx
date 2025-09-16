import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface FlashcardRendererProps {
  content: string;
}

export default function FlashcardRenderer({ content }: FlashcardRendererProps) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        // Cabeçalhos com melhor hierarquia visual
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold text-primary mb-6 text-center leading-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold text-primary mb-5 text-center leading-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-primary mb-4 leading-tight">
            {children}
          </h3>
        ),
        
        // Parágrafos com melhor legibilidade
        p: ({ children }) => (
          <p className="text-lg leading-relaxed mb-4 text-foreground text-justify">
            {children}
          </p>
        ),
        
        // Texto em negrito destacado
        strong: ({ children }) => (
          <strong className="font-bold text-primary">{children}</strong>
        ),
        
        // Texto em itálico sutil
        em: ({ children }) => (
          <em className="italic text-muted-foreground">{children}</em>
        ),
        
        // Citações com design elegante
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-6 pr-4 py-4 italic bg-primary/5 rounded-r-lg my-6 shadow-sm">
            <div className="text-muted-foreground relative">
              <span className="absolute -left-2 -top-2 text-primary text-2xl opacity-30">"</span>
              {children}
            </div>
          </blockquote>
        ),
        
        // Listas com espaçamento melhorado
        ul: ({ children }) => (
          <ul className="list-disc pl-8 space-y-3 text-left mb-6">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-8 space-y-3 text-left mb-6">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-lg leading-relaxed text-foreground pl-2">
            {children}
          </li>
        ),
        
        // Tabelas com design profissional
        table: ({ children }) => (
          <div className="overflow-x-auto my-8 shadow-md rounded-lg">
            <table className="w-full border-collapse bg-card overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gradient-to-r from-primary/20 to-primary/10">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border/50">
            {children}
          </tbody>
        ),
        th: ({ children }) => (
          <th className="px-6 py-4 text-left font-semibold text-primary border-r border-border/30 last:border-r-0">
            <div className="flex items-center space-x-2">
              {children}
            </div>
          </th>
        ),
        td: ({ children }) => (
          <td className="px-6 py-4 text-foreground border-r border-border/20 last:border-r-0 even:bg-muted/20">
            {children}
          </td>
        ),
        
        // Código com formatação aprimorada
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-primary/15 text-primary px-3 py-1 rounded-md text-sm font-mono font-medium shadow-sm">
              {children}
            </code>
          ) : (
            <pre className="bg-muted/80 p-6 rounded-lg text-sm font-mono overflow-x-auto my-6 shadow-inner border border-border/50">
              <code className="text-foreground">
                {children}
              </code>
            </pre>
          );
        },
        
        // Separadores elegantes
        hr: () => (
          <div className="flex items-center my-8">
            <div className="flex-1 border-t-2 border-gradient-to-r from-transparent via-border to-transparent"></div>
            <div className="px-4">
              <div className="w-3 h-3 bg-primary/30 rounded-full"></div>
            </div>
            <div className="flex-1 border-t-2 border-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>
        ),
        
        // Links com hover suave
        a: ({ children, href }) => (
          <a 
            href={href} 
            className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary transition-colors duration-200"
            target="_blank" 
            rel="noopener noreferrer"
          >
            {children}
          </a>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}