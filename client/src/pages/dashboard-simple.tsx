import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
// Removed Semantic UI imports - migrating to shadcn/ui
import { 
  User, 
  BookOpen, 
  Target, 
  Clock, 
  Brain, 
  Plus,
  ArrowRight,
  Trophy,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MessageCircle,
  Settings
} from "lucide-react";
// Modern shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
// Professional components  
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { ProfessionalStats } from "@/components/ui/professional-stats";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);

  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    subjects: string;
    todayHours: number;
    questionsGenerated: string;
    goalProgress: string;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
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
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProfessionalShell
      title="Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' }
      ]}
    >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Bem-vindo de volta!</h1>
            <p className="text-muted-foreground">Acompanhe seu progresso e continue seus estudos</p>
          </div>
          <Button 
            onClick={() => navigate('/library?create=material')}
            data-testid="button-upload-material"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Material</span>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <Collapsible 
            open={isStatsExpanded} 
            onOpenChange={setIsStatsExpanded}
            data-testid="stats-section"
          >
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Acompanhe seu progresso diário
                  </CardTitle>
                  <div className="transition-transform duration-200" data-testid="stats-toggle">
                    {isStatsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-300">
              <Card className="mt-2">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statsLoading ? (
                      <>
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                      </>
                    ) : stats && (
                      <>
                        <ProfessionalStats
                          title="Matérias"
                          value={stats.subjects}
                          icon={<BookOpen className="w-8 h-8" />}
                          variant="info"
                          data-testid="stat-subjects"
                        />
                        <ProfessionalStats
                          title="Hoje"
                          value={`${stats.todayHours}h`}
                          icon={<Clock className="w-8 h-8" />}
                          variant="success"
                          data-testid="stat-today-hours"
                        />
                        <ProfessionalStats
                          title="Questões IA"
                          value={stats.questionsGenerated}
                          icon={<Brain className="w-8 h-8" />}
                          variant="info"
                          data-testid="stat-ai-questions"
                        />
                        <ProfessionalStats
                          title="Progresso"
                          value={`${stats.goalProgress}%`}
                          icon={<Trophy className="w-8 h-8" />}
                          variant="warning"
                          data-testid="stat-goal-progress"
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Collapsible 
            open={isActionsExpanded} 
            onOpenChange={setIsActionsExpanded}
            data-testid="actions-section"
          >
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Ações Rápidas
                  </CardTitle>
                  <div className="transition-transform duration-200" data-testid="actions-toggle">
                    {isActionsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-300">
              <Card className="mt-2">
                <CardContent className="p-6">
                  {/* Responsive grid for action cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ProfessionalCard
                      title="Biblioteca"
                      description="Organize materiais, crie áreas de conhecimento e gerencie conteúdo"
                      icon={<BookOpen className="w-6 h-6" />}
                      variant="elevated"
                      onClick={() => navigate('/library')}
                      className="cursor-pointer"
                      data-testid="card-library"
                      actions={
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Ver biblioteca</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      }
                    />

                    <ProfessionalCard
                      title="Criar Flashcards"
                      description="Crie e estude com flashcards personalizados"
                      icon={<CreditCard className="w-6 h-6" />}
                      variant="outline"
                      onClick={() => navigate('/flashcards')}
                      className="cursor-pointer"
                      data-testid="card-flashcards"
                      actions={
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Criar flashcards</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      }
                    />

                    <ProfessionalCard
                      title="Questões com IA"
                      description="Pratique com questões geradas por inteligência artificial"
                      icon={<Brain className="w-6 h-6" />}
                      variant="elevated"
                      onClick={() => navigate('/study')}
                      className="cursor-pointer"
                      data-testid="card-ai-questions"
                      actions={
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Gerar questões</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      }
                    />

                    <ProfessionalCard
                      title="Chat com IA"
                      description="Converse com a IA para esclarecer dúvidas e estudar"
                      icon={<MessageCircle className="w-6 h-6" />}
                      variant="outline"
                      onClick={() => navigate('/study')}
                      className="cursor-pointer"
                      data-testid="card-ai-chat"
                      actions={
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Iniciar chat</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Content Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Subjects */}
          <Card className="min-h-[350px]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Matérias Recentes</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/library')}
                >
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {subjectsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : subjects && subjects.length > 0 ? (
                <div className="space-y-3">
                  {(subjects || []).slice(0, 3).map((subject) => (
                    <Card 
                      key={subject.id}
                      className="cursor-pointer border transition-colors hover:bg-accent/5"
                      onClick={() => navigate(`/library?subject=${subject.id}`)}
                      data-testid={`subject-${subject.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-foreground truncate max-w-[160px]">
                              {subject.name.length > 20 ? subject.name.substring(0, 20) + '...' : subject.name}
                            </h4>
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5 rounded-sm bg-muted/60 text-muted-foreground font-normal"
                            >
                              {subject.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color || '#666' }}
                            />
                            <p className="text-sm text-muted-foreground">
                              {subject.category}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">Nenhuma matéria</h4>
                  <p className="text-muted-foreground mb-4">
                    Adicione sua primeira matéria para começar a organizar seus estudos
                  </p>
                  <Button 
                    onClick={() => navigate('/library')}
                    data-testid="empty-subjects"
                  >
                    Adicionar matéria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Goals */}
          <Card className="min-h-[350px]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Metas Ativas</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/goals')}
                >
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {goalsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : goals && goals.length > 0 ? (
                <div className="space-y-3">
                  {(goals || []).slice(0, 3).map((goal) => (
                    <Card 
                      key={goal.id}
                      className="cursor-pointer border transition-colors hover:bg-accent/5"
                      onClick={() => navigate('/goals')}
                      data-testid={`goal-${goal.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground flex-1 pr-2">
                            {goal.title}
                          </h4>
                          <Target className="w-4 h-4 text-muted-foreground mt-1" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {goal.description || 'Meta sem descrição'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">Nenhuma meta</h4>
                  <p className="text-muted-foreground mb-4">
                    Defina metas de estudo para manter o foco e acompanhar seu progresso
                  </p>
                  <Button 
                    onClick={() => navigate('/goals')}
                    data-testid="empty-goals"
                  >
                    Criar meta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Profile */}
          <Card className="min-h-[350px]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <span>Seu Perfil</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between flex-1">
              <div className="text-center mb-6">
                <div 
                  data-testid="avatar-container"
                  className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <User 
                    data-testid="avatar-icon"
                    className="w-12 h-12 text-primary-foreground" 
                  />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  {user?.firstName || 'Estudante'}
                </h4>
                <Badge variant="secondary" className="text-sm">
                  {user?.studyProfile === 'disciplined' && 'Disciplinado'}
                  {user?.studyProfile === 'undisciplined' && 'Flexível'}
                  {user?.studyProfile === 'average' && 'Balanceado'}
                  {!user?.studyProfile && 'Perfil não definido'}
                </Badge>
              </div>
              
              {stats && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso das Metas</span>
                    <span className="font-medium">{stats?.goalProgress || 0}%</span>
                  </div>
                  <Progress 
                    value={parseInt(stats?.goalProgress || '0')} 
                    className="h-2"
                  />
                </div>
              )}
              
              <Button 
                className="w-full flex items-center justify-center space-x-2" 
                onClick={() => navigate('/onboarding')}
                data-testid="button-update-profile"
              >
                <Settings className="w-4 h-4" />
                <span>Atualizar Perfil</span>
              </Button>
            </CardContent>
          </Card>
        </div>
    </ProfessionalShell>
  );
}