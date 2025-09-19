import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Home,
  Search,
  Brain,
  Library,
  Target,
  GraduationCap,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Settings,
  Plus,
  Bot
} from "lucide-react";

interface NavigationSection {
  title: string;
  items: NavigationItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const navigationSections: NavigationSection[] = [
  {
    title: "Visão Geral",
    items: [
      { name: "Dashboard", href: "/", icon: Home, description: "Seu hub central" },
      { name: "AI Assistant", href: "/ai-assistant", icon: Bot, description: "Assistente inteligente" },
      { name: "Busca Global", href: "/search", icon: Search, description: "Encontre qualquer coisa" },
    ],
    defaultOpen: true
  },
  {
    title: "Preparar",
    items: [
      { name: "Biblioteca", href: "/library", icon: Library, description: "Organize seu conteúdo" },
      { name: "Objetivos", href: "/goals", icon: Target, description: "Defina suas metas" },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    title: "Estudar",
    items: [
      { name: "Chat IA", href: "/study", icon: Brain, description: "Estude com IA" },
      { name: "Quiz IA", href: "/quiz", icon: GraduationCap, description: "Questões personalizadas" },
      { name: "Flashcards", href: "/flashcards", icon: Zap, description: "Memorização eficaz" },
    ],
    collapsible: true,
    defaultOpen: true
  },
  {
    title: "Acompanhar",
    items: [
      { name: "Progresso", href: "/analytics", icon: BarChart3, description: "Métricas de estudo" },
    ],
    collapsible: true,
    defaultOpen: false
  }
];

export default function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(
    navigationSections
      .filter(section => section.defaultOpen)
      .map(section => section.title)
  );

  const { data: stats } = useQuery<{
    subjects: number;
    todayHours: number;
    questionsGenerated: number;
    goalProgress: number;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: !!user,
  });

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => 
      prev.includes(sectionTitle)
        ? prev.filter(title => title !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const isActiveRoute = (href: string) => {
    // Exact match for root
    if (href === "/" && location === "/") return true;
    if (href === "/" && location === "/dashboard") return true;
    
    // For other routes, check if location starts with href (but not for root)
    if (href !== "/" && location.startsWith(href)) return true;
    
    // Special cases for legacy redirects
    if (href === "/library" && ["/subjects", "/materials", "/knowledge-base"].includes(location)) {
      return true;
    }
    
    return false;
  };

  const getStudyProfileLabel = () => {
    switch (user?.studyProfile) {
      case "disciplined":
        return "Disciplinado";
      case "undisciplined":
        return "Indisciplinado";
      default:
        return "Equilibrado";
    }
  };

  const studyProgressPercentage = Math.min((stats?.todayHours || 0) * 12.5, 100); // 8h = 100%

  return (
    <aside className="w-64 bg-surface border-r border-border flex-shrink-0 flex flex-col h-full">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">NuP-est</h1>
            <p className="text-xs text-muted-foreground">Estudo Inteligente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navigationSections.map((section) => {
          const isOpen = openSections.includes(section.title);
          
          return (
            <div key={section.title} className="space-y-1">
              {section.collapsible ? (
                <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.title)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                      data-testid={`sidebar-section-${section.title.toLowerCase()}`}
                    >
                      <span className="uppercase tracking-wider">{section.title}</span>
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = isActiveRoute(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm group relative",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                          data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{item.name}</span>
                              {item.badge && (
                                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground/70 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
                          )}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  <div className="px-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </span>
                  </div>
                  {section.items.map((item) => {
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm group relative",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
                        )}
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Status Card */}
      <div className="p-4 border-t border-border">
        <div className="surface-elevated p-4 rounded-lg">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
                {user?.firstName || user?.email || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-user-profile">
                {getStudyProfileLabel()}
              </p>
            </div>
          </div>

          {/* Study Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estudo hoje</span>
              <span className="font-medium text-foreground" data-testid="text-study-hours">
                {stats?.todayHours || 0}h
              </span>
            </div>
            <Progress 
              value={studyProgressPercentage} 
              className="h-1.5"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Meta: 8h</span>
              <span>{Math.round(studyProgressPercentage)}%</span>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Matérias</p>
                <p className="text-sm font-semibold text-foreground">{stats.subjects || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Questões</p>
                <p className="text-sm font-semibold text-foreground">{stats.questionsGenerated || 0}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}