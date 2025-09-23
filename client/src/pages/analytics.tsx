import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
// Removed Semantic UI imports - migrating to shadcn/ui
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
  ChevronDown,
  FileText
} from "lucide-react";
// Modern shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
// Professional components  
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalStats } from "@/components/ui/professional-stats";
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando analytics...</p>
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
        return "blue";
      case "practice":
        return "green";
      case "ai_questions":
        return "purple";
      case "review":
        return "yellow";
      default:
        return "grey";
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
    <ProfessionalShell
      title="Analytics"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics', href: '/analytics' }
      ]}
    >
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Analytics Detalhado</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Acompanhe seu desempenho e evolução nos estudos
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ProfessionalStats
            title="Dias consecutivos"
            value={studyStreak.toString()}
            icon={<Flame className="w-8 h-8" />}
            variant="warning"
            data-testid="stat-study-streak"
          />
          <ProfessionalStats
            title="Esta semana"
            value={`${weeklyStudyTime}h`}
            icon={<Clock className="w-8 h-8" />}
            variant="success"
            data-testid="stat-weekly-hours"
          />
          <ProfessionalStats
            title="Questões IA"
            value={((stats as any)?.questionsGenerated || 0).toString()}
            icon={<Brain className="w-8 h-8" />}
            variant="info"
            data-testid="stat-ai-questions"
          />
          <ProfessionalStats
            title="Metas concluídas"
            value={`${(stats as any)?.goalProgress || 0}%`}
            icon={<Trophy className="w-8 h-8" />}
            variant="info"
            data-testid="stat-goal-completion"
          />
        </div>

        {/* Subject Progress and Weekly Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span>Progresso por Matéria</span>
                </CardTitle>
                <Select defaultValue="month" data-testid="select-progress-period">
                  <SelectTrigger className="w-40">
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
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !Array.isArray(subjectProgress) || !subjectProgress?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">
                    Nenhuma matéria cadastrada
                  </h4>
                  <p className="text-muted-foreground">
                    Adicione matérias para ver o progresso
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(subjectProgress) && subjectProgress?.map((subject: any) => (
                    <Card key={subject.id} className="p-4 border-l-4" style={{
                      borderLeftColor: subject.color
                    }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <h5 className="font-semibold text-foreground" data-testid={`subject-analytics-${subject.id}`}>
                            {subject.name}
                          </h5>
                        </div>
                        <Badge variant="secondary" data-testid={`subject-total-hours-${subject.id}`}>
                          {subject.totalHours}h total
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Progresso geral</span>
                          <span className="text-sm font-medium" data-testid={`subject-progress-percent-${subject.id}`}>
                            {subject.progress}%
                          </span>
                        </div>
                        <Progress 
                          value={subject.progress} 
                          className="h-2"
                        />
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span data-testid={`subject-materials-count-${subject.id}`}>{subject.materials}</span>
                            <span>materiais</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Brain className="w-3 h-3" />
                            <span data-testid={`subject-questions-count-${subject.id}`}>{subject.questions}</span>
                            <span>questões</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TargetIcon className="w-5 h-5 text-primary" />
                <span>Metas da Semana</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !Array.isArray(weeklyProgress) || !weeklyProgress?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TargetIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma meta semanal
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(weeklyProgress) && weeklyProgress?.map((goal: any) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" data-testid={`weekly-goal-name-${goal.id}`}>
                          {goal.name}
                        </span>
                        <Badge variant="outline" data-testid={`weekly-goal-progress-${goal.id}`}>
                          {goal.progress}
                        </Badge>
                      </div>
                      <Progress 
                        value={goal.percentage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simplified Analytics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Analytics Avançado</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Gráficos e Relatórios Detalhados</h3>
              <p className="text-muted-foreground max-w-md">
                Visualizações avançadas, gráficos de evolução e relatórios personalizados estarão disponíveis em breve.
              </p>
            </div>
          </CardContent>
        </Card>
    </ProfessionalShell>
  );
}
