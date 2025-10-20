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
  CreditCard,
  MessageCircle,
  BarChart3,
  Sparkles,
  ArrowRight,
  Trophy,
  Play,
  Library,
  Settings,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProfessionalShell from "@/components/ui/professional-shell";
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

  const quickStats = [
    { label: "Matérias", value: stats?.subjects || "0", icon: BookOpen, color: "text-blue-500" },
    { label: "Hoje", value: `${stats?.todayHours || 0}h`, icon: Clock, color: "text-green-500" },
    { label: "Questões", value: stats?.questionsGenerated || "0", icon: Brain, color: "text-purple-500" },
    { label: "Progresso", value: `${stats?.goalProgress || 0}%`, icon: Trophy, color: "text-orange-500" },
  ];

  const tools = [
    { 
      title: "Biblioteca", 
      description: "Organize e gerencie seus materiais de estudo",
      icon: Library, 
      href: "/library", 
      color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      testid: "tool-library"
    },
    { 
      title: "Flashcards", 
      description: "Memorização eficaz com repetição espaçada",
      icon: CreditCard, 
      href: "/flashcards", 
      color: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      testid: "tool-flashcards"
    },
    { 
      title: "Chat IA", 
      description: "Tire dúvidas e estude com assistente inteligente",
      icon: MessageCircle, 
      href: "/personalized-assistant?tab=chat", 
      color: "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      testid: "tool-chat"
    },
    { 
      title: "Questões IA", 
      description: "Pratique com questões adaptadas ao seu nível",
      icon: Brain, 
      href: "/personalized-assistant?tab=questions", 
      color: "bg-pink-500/10 hover:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
      testid: "tool-questions"
    },
    { 
      title: "Metas", 
      description: "Configure e acompanhe seus objetivos",
      icon: Target, 
      href: "/goals", 
      color: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      testid: "tool-goals"
    },
    { 
      title: "Analytics", 
      description: "Analise sua evolução e desempenho",
      icon: BarChart3, 
      href: "/analytics", 
      color: "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
      testid: "tool-analytics"
    },
  ];

  return (
    <ProfessionalShell
      title="Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }]}
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Olá, {user?.firstName || "Estudante"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Escolha como você quer estudar hoje
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Hero CTA - Modo Guiado */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <Badge variant="default" className="text-xs">
                    RECOMENDADO
                  </Badge>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold">
                  Estudo Guiado por IA
                </CardTitle>
                <CardDescription className="text-base">
                  Deixe nossa IA criar um plano personalizado para você hoje. Baseado no seu perfil, objetivos e tempo disponível.
                </CardDescription>
                <ul className="space-y-1 text-sm text-muted-foreground mt-4">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Plano diário adaptado ao seu perfil
                  </li>
                  <li className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Foco nas suas áreas de dificuldade
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Otimizado para o tempo que você tem
                  </li>
                </ul>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <Button
              size="lg"
              className="w-full md:w-auto text-lg h-14 px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate('/guided-study')}
              data-testid="button-guided-study"
            >
              <Play className="w-5 h-5 mr-2" />
              Começar Estudo Guiado
              <ArrowRight className="w-5 h-5 ml-2" />
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

        {/* Modo Livre - Ferramentas */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Ferramentas Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.href}
                  className={`cursor-pointer transition-all hover:shadow-md border-2 ${tool.color}`}
                  onClick={() => navigate(tool.href)}
                  data-testid={tool.testid}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-background">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 flex items-center gap-2">
                          {tool.title}
                          <ArrowRight className="w-4 h-4 opacity-50" />
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Hint */}
        {subjects && subjects.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Comece adicionando suas matérias</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione matérias e materiais para desbloquear o estudo guiado e todas as ferramentas
              </p>
              <Button onClick={() => navigate('/library')}>
                Ir para Biblioteca
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfessionalShell>
  );
}
