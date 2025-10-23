/**
 * Dashboard - Clean, Professional, Functional
 * Redesigned for clarity and user flow
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  Target, 
  Clock, 
  Brain,
  Sparkles,
  ArrowRight,
  Trophy,
  Play,
  Library,
  CreditCard,
  MessageCircle,
  BarChart3,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernStatCard from "@/components/ui/modern-stat-card";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery<{
    subjects: string;
    todayHours: number;
    questionsGenerated: string;
    goalProgress: string;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Redirecionando para login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const quickTools = [
    { 
      title: "Biblioteca", 
      description: "Materiais de estudo",
      icon: Library, 
      href: "/library", 
      variant: "primary" as const,
      testid: "tool-library"
    },
    { 
      title: "Flashcards", 
      description: "Memorização eficaz",
      icon: CreditCard, 
      href: "/flashcards", 
      variant: "default" as const,
      testid: "tool-flashcards"
    },
    { 
      title: "Chat IA", 
      description: "Assistente inteligente",
      icon: MessageCircle, 
      href: "/personalized-assistant?tab=chat", 
      variant: "default" as const,
      testid: "tool-chat"
    },
    { 
      title: "Metas", 
      description: "Acompanhe objetivos",
      icon: Target, 
      href: "/goals", 
      variant: "default" as const,
      testid: "tool-goals"
    },
  ];

  // Empty state when no subjects
  if (subjects && subjects.length === 0) {
    return (
      <UnifiedShell title="Dashboard">
        <div className="max-w-7xl mx-auto p-6">
          <ModernEmptyState
            icon={BookOpen}
            title="Bem-vindo ao NuP-est!"
            description="Comece adicionando suas matérias e materiais para desbloquear todas as ferramentas de estudo inteligente."
            action={{
              label: "Ir para Biblioteca",
              onClick: () => navigate('/library')
            }}
            variant="large"
          />
        </div>
      </UnifiedShell>
    );
  }

  return (
    <UnifiedShell title="Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Olá, {user?.firstName || "Estudante"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Escolha como você quer estudar hoje
          </p>
        </div>

        {/* Stats Overview - 4 Cards Only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModernStatCard
            title="Matérias"
            value={stats?.subjects || "0"}
            icon={BookOpen}
            variant="primary"
            description="Cadastradas"
          />
          <ModernStatCard
            title="Hoje"
            value={`${stats?.todayHours || 0}h`}
            icon={Clock}
            variant="success"
            description="Estudadas"
          />
          <ModernStatCard
            title="Questões IA"
            value={stats?.questionsGenerated || "0"}
            icon={Brain}
            variant="default"
            description="Geradas"
          />
          <ModernStatCard
            title="Meta"
            value={`${stats?.goalProgress || 0}%`}
            icon={Trophy}
            variant="warning"
            description="Concluída"
          />
        </div>

        {/* Guided Study CTA - Simplified */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <Badge>RECOMENDADO</Badge>
                </div>
                <CardTitle className="text-2xl">
                  Estudo Guiado por IA
                </CardTitle>
                <CardDescription>
                  Deixe nossa IA criar um plano personalizado baseado no seu perfil e objetivos.
                </CardDescription>
              </div>
              <Button
                size="lg"
                className="hidden md:flex"
                onClick={() => navigate('/guided-study')}
                data-testid="button-guided-study"
              >
                <Play className="w-4 h-4 mr-2" />
                Começar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="md:hidden">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate('/guided-study')}
              data-testid="button-guided-study-mobile"
            >
              <Play className="w-4 h-4 mr-2" />
              Começar Estudo Guiado
            </Button>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground font-medium">
              ou escolha uma ferramenta
            </span>
          </div>
        </div>

        {/* Quick Tools Grid - 4 Main Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.href}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() => navigate(tool.href)}
                data-testid={tool.testid}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-0.5 flex items-center gap-2">
                        {tool.title}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Secondary Tools - Compact */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/personalized-assistant?tab=questions')}
            data-testid="tool-questions"
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Questões IA
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/analytics')}
            data-testid="tool-analytics"
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/quiz')}
            data-testid="tool-quiz"
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Quiz Rápido
          </Button>
        </div>
      </div>
    </UnifiedShell>
  );
}
