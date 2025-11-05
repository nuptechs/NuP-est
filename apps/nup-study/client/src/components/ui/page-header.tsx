import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onMenuClick?: () => void;
}

export function PageHeader({ breadcrumbs, onMenuClick }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <button
          onClick={onMenuClick}
          className="mr-4 p-2 hover:bg-accent rounded-lg transition-colors"
          data-testid="button-menu"
          aria-label="Abrir menu"
        >
          <Brain className="h-5 w-5 text-primary" />
        </button>

        <TooltipProvider>
          <nav className="flex items-center space-x-1 text-sm flex-1 overflow-hidden">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const totalCrumbs = breadcrumbs.length;
              
              // Responsividade corrigida:
              // - Mobile: últimos 2 itens
              // - Tablet: últimos 3 itens  
              // - Desktop: todos os itens
              let hiddenClasses = "flex"; // Padrão: sempre visível (para os últimos 2)
              
              // Índices dos últimos itens: [totalCrumbs-3, totalCrumbs-2, totalCrumbs-1]
              const isLastTwo = index >= totalCrumbs - 2;          // Penúltimo ou último
              const isThirdFromLast = index === totalCrumbs - 3;   // Terceiro do final
              const isBeforeThird = index < totalCrumbs - 3;       // Anteriores
              
              if (isBeforeThird) {
                // Itens antes do terceiro do final: ocultar em mobile e tablet, mostrar apenas em desktop
                hiddenClasses = "hidden lg:flex";
              } else if (isThirdFromLast) {
                // Terceiro do final: ocultar em mobile, mostrar em tablet e desktop
                hiddenClasses = "hidden md:flex";
              }
              // isLastTwo: deixa como "flex" (sempre visível)

              const content = (
                <div
                  className={`${hiddenClasses} items-center`}
                  key={index}
                  data-testid={`breadcrumb-${index}`}
                >
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                  
                  {(item.href || item.onClick) && !isLast ? (
                    item.onClick ? (
                      <button
                        onClick={item.onClick}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent max-w-[200px] truncate"
                        data-testid={`button-breadcrumb-${index}`}
                      >
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="truncate">{item.label}</span>
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent max-w-[200px] truncate"
                        data-testid={`link-breadcrumb-${index}`}
                      >
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  ) : (
                    <span
                      className={`flex items-center gap-1.5 px-2 py-1 max-w-[200px] truncate ${
                        isLast 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground"
                      }`}
                      data-testid={`text-breadcrumb-${index}`}
                    >
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </span>
                  )}
                </div>
              );

              // Adicionar tooltip apenas para itens ocultos em mobile/tablet
              if (index < breadcrumbs.length - 2) {
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      {content}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}

            {/* Indicador de itens ocultos em mobile */}
            {breadcrumbs.length > 2 && (
              <div className="md:hidden flex items-center text-muted-foreground px-2">
                <span>...</span>
                <ChevronRight className="h-4 w-4 mx-1" />
              </div>
            )}
          </nav>
        </TooltipProvider>
      </div>
    </div>
  );
}
