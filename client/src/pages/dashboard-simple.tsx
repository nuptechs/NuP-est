import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  BookOpen, 
  Target, 
  Clock, 
  Brain, 
  Plus,
  ArrowRight,
  Trophy
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
import TeamsShell from "@/components/layout/teams-shell";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const breadcrumbs = [
    { label: "Dashboard" }
  ];

  const primaryActions = (
    <Button 
      onClick={() => navigate('/library?create=material')}
      size="sm"
      data-testid="button-upload-material"
    >
      <Plus className="w-4 h-4 mr-2" />
      Novo Material
    </Button>
  );

  return (
    <TeamsShell 
      title="Dashboard" 
      subtitle="Visão geral dos seus estudos e progresso"
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Stats Overview */}
        <div>
          <SectionHeader 
            title="Estatísticas de Hoje"
            description="Acompanhe seu progresso diário"
            data-testid="stats-header"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {statsLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : stats && (
              <>
                <StatCard
                  icon={<BookOpen className="w-8 h-8" />}
                  value={stats.subjects}
                  label="Matérias"
                  variant="info"
                  data-testid="stat-subjects"
                />
                <StatCard
                  icon={<Clock className="w-8 h-8" />}
                  value={`${stats.todayHours}h`}
                  label="Hoje"
                  variant="success"
                  data-testid="stat-today-hours"
                />
                <StatCard
                  icon={<Brain className="w-8 h-8" />}
                  value={stats.questionsGenerated}
                  label="Questões IA"
                  variant="primary"
                  data-testid="stat-ai-questions"
                />
                <StatCard
                  icon={<Trophy className="w-8 h-8" />}
                  value={`${stats.goalProgress}%`}
                  label="Progresso"
                  variant="warning"
                  data-testid="stat-goal-progress"
                />
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionHeader 
            title="Ações Rápidas"
            description="Acesse suas ferramentas principais"
            data-testid="quick-actions-header"
          />
          
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Card className="md:col-span-2 surface-elevated hover-lift transition-fast cursor-pointer" onClick={() => navigate('/library')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Biblioteca</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Organize materiais, crie áreas de conhecimento e gerencie conteúdo
                    </p>
                    <div className="flex items-center text-primary text-sm font-medium">
                      <span>Ver biblioteca</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                  <BookOpen className="w-12 h-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Seu Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{user?.firstName || 'Estudante'}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.studyProfile === 'disciplined' && 'Disciplinado'}
                    {user?.studyProfile === 'undisciplined' && 'Flexível'}
                    {user?.studyProfile === 'average' && 'Balanceado'}
                    {!user?.studyProfile && 'Perfil não definido'}
                  </p>
                </div>
                
                {stats && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progresso das Metas</span>
                        <span className="text-foreground font-medium">{stats.goalProgress}%</span>
                      </div>
                      <Progress value={parseInt(stats.goalProgress)} className="h-2" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Subjects */}
          <Card className="surface-elevated">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Matérias Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subjectsLoading ? (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : subjects && subjects.length > 0 ? (
                <div className="space-y-3">
                  {subjects.slice(0, 3).map((subject) => (
                    <div
                      key={subject.id}
                      className="interactive surface p-3 rounded-lg cursor-pointer"
                      onClick={() => navigate(`/library?subject=${subject.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{subject.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{subject.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            Prioridade {subject.priority}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="w-12 h-12" />}
                  title="Nenhuma matéria"
                  description="Adicione sua primeira matéria para começar a organizar seus estudos"
                  action={{
                    label: "Adicionar matéria",
                    onClick: () => navigate('/library')
                  }}
                  data-testid="empty-subjects"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Goals */}
          <Card className="surface-elevated">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Metas Ativas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : goals && goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.slice(0, 3).map((goal) => (
                    <div
                      key={goal.id}
                      className="interactive surface p-3 rounded-lg cursor-pointer"
                      onClick={() => navigate('/goals')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground line-clamp-1">{goal.title}</p>
                        <Target className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {goal.description || 'Meta sem descrição'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Target className="w-12 h-12" />}
                  title="Nenhuma meta"
                  description="Defina metas de estudo para manter o foco e acompanhar seu progresso"
                  action={{
                    label: "Criar meta",
                    onClick: () => navigate('/goals')
                  }}
                  data-testid="empty-goals"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TeamsShell>
  );
}