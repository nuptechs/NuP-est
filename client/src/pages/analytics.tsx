import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { Subject, StudySession, Target } from "@shared/schema";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  const { data: subjectProgress, isLoading: subjectsLoading } = useQuery({
    queryKey: ["/api/analytics/subjects"],
    enabled: isAuthenticated,
  });

  const { data: weeklyProgress, isLoading: weeklyLoading } = useQuery({
    queryKey: ["/api/analytics/weekly"],
    enabled: isAuthenticated,
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/study-sessions", "20"],
    enabled: isAuthenticated,
  });

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case "theory":
        return "bg-primary/10 text-primary border-primary/20";
      case "practice":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "ai_questions":
        return "bg-accent/10 text-accent border-accent/20";
      case "review":
        return "bg-chart-4/10 text-yellow-700 border-yellow-200";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "theory":
        return "Teoria";
      case "practice":
        return "Exercícios";
      case "ai_questions":
        return "Questões IA";
      case "review":
        return "Revisão";
      default:
        return type;
    }
  };

  const getTargetProgress = (target: Target) => {
    const current = parseFloat(target.currentValue || "0");
    const total = parseFloat(target.targetValue || "1");
    return Math.round((current / total) * 100);
  };

  const calculateStudyStreak = () => {
    if (!recentSessions?.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    const dailySessions = new Map();
    
    recentSessions.forEach((session: StudySession) => {
      const sessionDate = new Date(session.startedAt!);
      sessionDate.setHours(0, 0, 0, 0);
      const dateKey = sessionDate.getTime();
      
      if (!dailySessions.has(dateKey)) {
        dailySessions.set(dateKey, true);
      }
    });
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      if (dailySessions.has(checkDate.getTime())) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateWeeklyStudyTime = () => {
    if (!recentSessions?.length) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return recentSessions
      .filter((session: StudySession) => new Date(session.startedAt!) >= oneWeekAgo)
      .reduce((total: number, session: StudySession) => total + (session.duration || 0), 0);
  };

  const studyStreak = calculateStudyStreak();
  const weeklyStudyTime = Math.round(calculateWeeklyStudyTime() / 60 * 100) / 100; // Convert to hours

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Progresso e Analytics" 
          subtitle="Acompanhe seu desempenho e evolução nos estudos"
        />
        
        <div className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover-lift transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-fire text-primary text-xl"></i>
                  </div>
                  <span className="text-sm text-muted-foreground">Sequência</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-study-streak">
                    {studyStreak} dias
                  </p>
                  <p className="text-sm text-muted-foreground">Estudando</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-secondary text-xl"></i>
                  </div>
                  <span className="text-sm text-muted-foreground">Semana</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-weekly-hours">
                    {weeklyStudyTime}h
                  </p>
                  <p className="text-sm text-muted-foreground">Estudadas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-question-circle text-accent text-xl"></i>
                  </div>
                  <span className="text-sm text-muted-foreground">IA</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-ai-questions">
                    {stats?.questionsGenerated || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Questões geradas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-trophy text-yellow-600 text-xl"></i>
                  </div>
                  <span className="text-sm text-muted-foreground">Metas</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-goal-completion">
                    {stats?.goalProgress || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Progress and Weekly Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Progress */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Progresso por Matéria</CardTitle>
                    <Select defaultValue="month">
                      <SelectTrigger className="w-32" data-testid="select-progress-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mês</SelectItem>
                        <SelectItem value="quarter">Este trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {subjectsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse p-4 bg-muted/30 rounded-lg">
                          <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                          <div className="h-2 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : !subjectProgress?.length ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-chart-bar text-muted-foreground text-2xl"></i>
                      </div>
                      <p className="text-muted-foreground">Nenhuma matéria cadastrada</p>
                      <p className="text-sm text-muted-foreground">Adicione matérias para ver o progresso</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subjectProgress?.map((subject: any) => (
                        <div key={subject.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 rounded-full mr-3" 
                                style={{ backgroundColor: subject.color }}
                              ></div>
                              <h4 className="font-medium text-foreground" data-testid={`subject-analytics-${subject.id}`}>
                                {subject.name}
                              </h4>
                            </div>
                            <span className="text-sm text-muted-foreground" data-testid={`subject-total-hours-${subject.id}`}>
                              {subject.totalHours}h total
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Progresso geral</span>
                              <span className="text-xs font-medium text-foreground" data-testid={`subject-progress-percent-${subject.id}`}>
                                {subject.progress}%
                              </span>
                            </div>
                            <Progress value={subject.progress} className="h-2" />
                            
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                              <span>
                                <i className="fas fa-file-alt mr-1"></i>
                                <span data-testid={`subject-materials-count-${subject.id}`}>{subject.materials}</span> materiais
                              </span>
                              <span>
                                <i className="fas fa-question-circle mr-1"></i>
                                <span data-testid={`subject-questions-count-${subject.id}`}>{subject.questions}</span> questões
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Weekly Goals */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Metas da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {weeklyLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-2 bg-muted rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : !weeklyProgress?.length ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-target text-muted-foreground"></i>
                      </div>
                      <p className="text-muted-foreground mb-4">Nenhuma meta semanal</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weeklyProgress?.map((goal: any) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground" data-testid={`weekly-goal-name-${goal.id}`}>
                              {goal.name}
                            </span>
                            <span className="text-sm text-muted-foreground" data-testid={`weekly-goal-progress-${goal.id}`}>
                              {goal.progress}
                            </span>
                          </div>
                          <Progress value={goal.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center p-3 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 bg-muted rounded-lg mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : !recentSessions?.length ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-history text-muted-foreground text-2xl"></i>
                  </div>
                  <p className="text-muted-foreground">Nenhuma atividade recente</p>
                  <p className="text-sm text-muted-foreground">Comece estudando para ver seu histórico</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSessions?.slice(0, 10).map((session: StudySession) => {
                    const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                    return (
                      <div key={session.id} className="flex items-center p-3 bg-muted/30 rounded-lg border border-border">
                        <div className={`w-10 h-10 ${session.completed ? 'bg-secondary' : 'bg-muted'}/10 rounded-lg flex items-center justify-center mr-4`}>
                          <i className={`fas ${session.completed ? 'fa-check' : 'fa-clock'} text-${session.completed ? 'secondary' : 'muted-foreground'}`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-foreground" data-testid={`session-subject-${session.id}`}>
                              {subject?.name || "Matéria não encontrada"}
                            </h4>
                            <span className="text-sm text-muted-foreground" data-testid={`session-duration-${session.id}`}>
                              {session.duration} min
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={getSessionTypeColor(session.type)}>
                                {getSessionTypeLabel(session.type)}
                              </Badge>
                              {session.completed && session.score && (
                                <span className="text-xs text-muted-foreground">
                                  {session.score}% de acerto
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground" data-testid={`session-date-${session.id}`}>
                              {new Date(session.startedAt!).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center">
                      <i className="fas fa-trophy text-primary mr-3"></i>
                      <span className="text-sm font-medium text-foreground">Melhor sequência</span>
                    </div>
                    <span className="text-sm font-bold text-primary" data-testid="text-best-streak">
                      {studyStreak} dias
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                    <div className="flex items-center">
                      <i className="fas fa-clock text-secondary mr-3"></i>
                      <span className="text-sm font-medium text-foreground">Média semanal</span>
                    </div>
                    <span className="text-sm font-bold text-secondary" data-testid="text-weekly-average">
                      {weeklyStudyTime}h
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                    <div className="flex items-center">
                      <i className="fas fa-book text-accent mr-3"></i>
                      <span className="text-sm font-medium text-foreground">Matérias ativas</span>
                    </div>
                    <span className="text-sm font-bold text-accent" data-testid="text-active-subjects">
                      {stats?.subjects || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start">
                      <i className="fas fa-lightbulb text-primary mr-3 mt-0.5"></i>
                      <div>
                        <p className="text-sm font-medium text-foreground">Sugestão do sistema</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Continue mantendo sua consistência de estudos! 
                          {weeklyStudyTime < 10 && " Tente aumentar gradualmente suas horas de estudo."}
                          {studyStreak >= 7 && " Você está em uma ótima sequência!"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start">
                      <i className="fas fa-target text-accent mr-3 mt-0.5"></i>
                      <div>
                        <p className="text-sm font-medium text-foreground">Meta recomendada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Defina uma meta de estudar pelo menos {Math.max(weeklyStudyTime + 2, 10)}h na próxima semana
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <MobileNav />
      <DashboardIcon />
    </div>
  );
}
