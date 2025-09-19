import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import TeamsShell from "@/components/layout/teams-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Target, 
  Brain, 
  Plus, 
  ChevronRight,
  TrendingUp,
  Clock,
  Trophy,
  FileText
} from "lucide-react";
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Sessão expirada",
        description: "Redirecionando para o login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const getUserInitials = () => {
    if (!user) return "??";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.email?.charAt(0).toUpperCase() || "??";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const hasSubjects = (subjects?.length || 0) > 0;
  const hasGoals = (goals?.length || 0) > 0;
  const isSetupComplete = hasSubjects && hasGoals;

  const quickActions = [
    {
      label: "Nova Área",
      icon: <BookOpen className="h-4 w-4" />,
      action: () => navigate("/library?create=area"),
      color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
    },
    {
      label: "Nova Meta",
      icon: <Target className="h-4 w-4" />,
      action: () => navigate("/goals?create=goal"),
      color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
    },
    {
      label: "AI Assistant",
      icon: <Brain className="h-4 w-4" />,
      action: () => navigate("/ai-assistant"),
      color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
    }
  ];

  const recentGoals = goals?.slice(0, 3) || [];
  const recentSubjects = subjects?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const primaryActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => navigate("/library?create=area")}
        className="gap-2"
        data-testid="create-area-button"
      >
        <Plus className="h-4 w-4" />
        Nova Área
      </Button>
    </div>
  );

  return (
    <TeamsShell primaryActions={primaryActions}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {getGreeting()}, {user?.firstName || 'Usuário'}!
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo ao seu painel de estudos
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Matérias</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.subjects || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                áreas de conhecimento
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Estudo Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.todayHours || 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                tempo de estudo
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Progresso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.goalProgress || '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                das metas atingidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-20 flex-col gap-2 ${action.color}`}
                  onClick={action.action}
                  data-testid={`quick-action-${index}`}
                >
                  {action.icon}
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Setup Guide (if incomplete) */}
        {!isSetupComplete && (
          <Card className="border border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-warning-foreground">
                Complete sua configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasSubjects && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">Adicione suas matérias</p>
                    <p className="text-sm text-muted-foreground">
                      Organize seu conteúdo por áreas de conhecimento
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/library")}
                    variant="outline"
                    size="sm"
                    data-testid="setup-subjects"
                  >
                    Configurar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
              
              {!hasGoals && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">Defina suas metas</p>
                    <p className="text-sm text-muted-foreground">
                      Estabeleça objetivos claros para seus estudos
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/goals")}
                    variant="outline"
                    size="sm"
                    data-testid="setup-goals"
                  >
                    Configurar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/analytics")}
                data-testid="view-all-activities"
              >
                Ver todas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentSubjects.length > 0 ? (
                <div className="space-y-3">
                  {recentSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{subject.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {subject.description || 'Sem descrição'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/library")}
                    className="mt-2"
                  >
                    Adicionar matéria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Goals */}
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Metas em Andamento</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/goals")}
                data-testid="view-all-goals"
              >
                Ver todas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentGoals.length > 0 ? (
                <div className="space-y-3">
                  {recentGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{goal.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {goal.description || 'Sem descrição'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma meta definida</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/goals")}
                    className="mt-2"
                  >
                    Criar meta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TeamsShell>
  );
}