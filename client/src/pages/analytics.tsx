/**
 * Analytics - Clean KPI Header + Charts
 * Simplified from 387 lines to clean, professional UX
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernStatCard from "@/components/ui/modern-stat-card";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Brain, 
  Flame,
  BarChart3,
  Target as TargetIcon,
  FileText
} from "lucide-react";
import type { StudySession, Target } from "@shared/schema";

export default function Analytics() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: stats } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  const { data: subjectProgress = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/subjects"],
    enabled: isAuthenticated,
  });

  const { data: weeklyProgress = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/weekly"],
    enabled: isAuthenticated,
  });

  const { data: recentSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/study-sessions", "20"],
    enabled: isAuthenticated,
  });

  const calculateStudyStreak = () => {
    if (!Array.isArray(recentSessions) || !recentSessions?.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const dailySessions = new Map();
    
    recentSessions.forEach((session: StudySession) => {
      const sessionDate = new Date(session.startedAt!);
      sessionDate.setHours(0, 0, 0, 0);
      dailySessions.set(sessionDate.getTime(), true);
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
  const weeklyStudyTime = Math.round(calculateWeeklyStudyTime() / 60 * 100) / 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <UnifiedShell title="Analytics">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Page Header */}
        <ModernPageHeader
          title="Analytics Detalhado"
          description="Acompanhe seu desempenho e evolução nos estudos"
          icon={BarChart3}
        />

        {/* KPI Header - 4 Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModernStatCard
            title="Dias consecutivos"
            value={studyStreak.toString()}
            icon={Flame}
            data-testid="stat-study-streak"
          />
          <ModernStatCard
            title="Esta semana"
            value={`${weeklyStudyTime}h`}
            icon={Clock}
            data-testid="stat-weekly-hours"
          />
          <ModernStatCard
            title="Questões IA"
            value={((stats as any)?.questionsGenerated || 0).toString()}
            icon={Brain}
            data-testid="stat-ai-questions"
          />
          <ModernStatCard
            title="Progresso"
            value={`${(stats as any)?.goalProgress || 0}%`}
            icon={TrendingUp}
            data-testid="stat-goal-completion"
          />
        </div>

        {/* Charts Row - 2 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Progress Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Progresso por Matéria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectProgress.length === 0 ? (
                <ModernEmptyState
                  icon={BarChart3}
                  title="Nenhuma matéria cadastrada"
                  description="Adicione matérias para ver o progresso"
                />
              ) : (
                <div className="space-y-4">
                  {subjectProgress.map((subject: any) => (
                    <div key={subject.id} className="p-4 rounded-lg border" style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: subject.color
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                          <h5 className="font-medium" data-testid={`subject-analytics-${subject.id}`}>
                            {subject.name}
                          </h5>
                        </div>
                        <Badge variant="secondary" data-testid={`subject-total-hours-${subject.id}`}>
                          {subject.totalHours}h
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium" data-testid={`subject-progress-percent-${subject.id}`}>
                            {subject.progress}%
                          </span>
                        </div>
                        <Progress value={subject.progress} className="h-2" />
                        
                        <div className="flex justify-between text-sm text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span data-testid={`subject-materials-count-${subject.id}`}>{subject.materials}</span>
                            <span>materiais</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            <span data-testid={`subject-questions-count-${subject.id}`}>{subject.questions}</span>
                            <span>questões</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TargetIcon className="h-5 w-5" />
                Metas da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyProgress.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TargetIcon className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma meta</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {weeklyProgress.map((goal: any) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" data-testid={`weekly-goal-name-${goal.id}`}>
                          {goal.name}
                        </span>
                        <Badge variant="outline" data-testid={`weekly-goal-progress-${goal.id}`}>
                          {goal.progress}
                        </Badge>
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
    </UnifiedShell>
  );
}
