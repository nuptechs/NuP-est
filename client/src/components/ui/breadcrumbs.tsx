/**
 * Breadcrumbs Component
 * Componente de navegação sutil e suave para orientação contextual
 */

import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  className?: string;
}

// Mapeamento de rotas para nomes amigáveis
const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "dashboard": "Dashboard",
  "library": "Biblioteca",
  "study": "Estudar",
  "flashcards": "Flashcards",
  "goals": "Metas",
  "analytics": "Analytics",
  "personalized-assistant": "Assistente IA",
  "guided-study": "Estudo Guiado",
  "quiz": "Quiz",
  "topics": "Tópicos",
  "knowledge-base": "Base de Conhecimento",
  "goal-builder": "Criar Meta",
  "onboarding": "Configuração",
  "search": "Busca",
  "admin": "Admin",
  "search-config": "Configuração de Busca",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove leading slash e separa por /
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  
  // Sempre começa com home
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Início", href: "/" }
  ];

  // Se estiver na home, retorna apenas home
  if (segments.length === 0) {
    return breadcrumbs;
  }

  // Constrói breadcrumbs baseado nos segmentos
  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      href: currentPath
    });
  });

  return breadcrumbs;
}

export default function Breadcrumbs({ className }: BreadcrumbsProps) {
  const [location, navigate] = useLocation();
  
  // Remove query params para o cálculo dos breadcrumbs
  const pathname = location.split("?")[0];
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Se só tiver home, não mostra breadcrumbs (evita redundância)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}
      data-testid="breadcrumbs-nav"
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {!isFirst && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
            )}
            {isLast ? (
              <span 
                className="text-foreground/70 font-normal truncate max-w-[200px] pointer-events-none"
                data-testid="breadcrumb-current"
                aria-current="page"
                role="text"
              >
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(crumb.href)}
                className={cn(
                  "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm px-1.5 py-0.5",
                  "-ml-1.5" // Compensate padding to align with container edge
                )}
                data-testid={`breadcrumb-${crumb.href.replace(/\//g, '-') || 'home'}`}
                aria-label={isFirst ? "Início" : undefined}
                title={isFirst ? "Voltar ao início" : undefined}
              >
                {isFirst ? (
                  <Home className="h-4 w-4" aria-hidden="true" />
                ) : (
                  crumb.label
                )}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
