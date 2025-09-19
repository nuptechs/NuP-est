import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Brain, 
  Trophy, 
  Target as TargetIcon,
  Flame,
  BookOpen,
  BarChart3,
  Calendar,
  ChevronDown
} from "lucide-react";
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
    if (!Array.isArray(recentSessions) || !recentSessions?.length) return 0;
    
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
    if (!Array.isArray(recentSessions) || !recentSessions?.length) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return recentSessions
      .filter((session: StudySession) => new Date(session.startedAt!) >= oneWeekAgo)
      .reduce((total: number, session: StudySession) => total + (session.duration || 0), 0);
  };

  const studyStreak = calculateStudyStreak();
  const weeklyStudyTime = Math.round(calculateWeeklyStudyTime() / 60 * 100) / 100; // Convert to hours

  return (
    <div className="p-6 space-y-6">
      {/* Analytics Content */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Analytics</h1>
        <p className="text-sm text-gray-500">
          Acompanhe seu desempenho e evolução nos estudos
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950 dark:to-red-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300" data-testid="stat-study-streak">
                  {studyStreak}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Dias consecutivos</p>
              </div>
              <Flame className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="stat-weekly-hours">
                  {weeklyStudyTime}h
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Esta semana</p>
              </div>
              <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="stat-ai-questions">
                  {(stats as any)?.questionsGenerated || 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Questões IA</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300" data-testid="stat-goal-completion">
                  {(stats as any)?.goalProgress || 0}%
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Metas concluídas</p>
              </div>
              <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />
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
                  ) : !Array.isArray(subjectProgress) || !subjectProgress?.length ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-chart-bar text-muted-foreground text-2xl"></i>
                      </div>
                      <p className="text-muted-foreground">Nenhuma matéria cadastrada</p>
                      <p className="text-sm text-muted-foreground">Adicione matérias para ver o progresso</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.isArray(subjectProgress) && subjectProgress?.map((subject: any) => (
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
                  ) : !Array.isArray(weeklyProgress) || !weeklyProgress?.length ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-target text-muted-foreground"></i>
                      </div>
                      <p className="text-muted-foreground mb-4">Nenhuma meta semanal</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.isArray(weeklyProgress) && weeklyProgress?.map((goal: any) => (
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

          {/* Simplified Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics em desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Interface de analytics atualizada em breve...</p>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
