/**
 * Guided Study - Daily Study Plan Dashboard
 * Simplified from 432 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Pause,
  Check,
  Clock,
  Target,
  Sparkles,
  BookOpen,
  Trophy,
  RefreshCw
} from "lucide-react";

interface StudyTask {
  id: string;
  type: 'material' | 'practice' | 'review' | 'assessment';
  title: string;
  description: string;
  subjectName: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface DailyPlan {
  date: string;
  totalMinutes: number;
  availableMinutes: number;
  tasks: StudyTask[];
  motivationalMessage: string;
  completionRate?: number;
}

export default function GuidedStudyPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const { data: dailyPlan, isLoading, refetch } = useQuery<DailyPlan>({
    queryKey: ['/api/study-planner/today'],
    enabled: isAuthenticated,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, timeSpent }: { taskId: string; timeSpent: number }) => {
      const response = await fetch('/api/study-planner/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId, timeSpent }),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: (_, variables) => {
      setCompletedTaskIds(prev => new Set(prev).add(variables.taskId));
      toast({ title: "Tarefa concluída!", description: "Ótimo trabalho! Continue assim." });
      queryClient.invalidateQueries({ queryKey: ['/api/study-planner/today'] });
    },
    onError: () => {
      toast({ title: "Erro ao concluir tarefa", variant: "destructive" });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTask = (taskId: string) => {
    setActiveTaskId(taskId);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const completeTask = (taskId: string) => {
    const timeSpent = Math.floor(timerSeconds / 60);
    completeTaskMutation.mutate({ taskId, timeSpent });
    setActiveTaskId(null);
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const activeTasks = dailyPlan?.tasks.filter(t => !t.completed && !completedTaskIds.has(t.id)) || [];
  const completionPercentage = dailyPlan ? 
    ((dailyPlan.tasks.length - activeTasks.length) / dailyPlan.tasks.length) * 100 : 0;

  return (
    <UnifiedShell title="Estudo Guiado">
      <div className="p-6 space-y-6">
        <ModernPageHeader
          title="Seu Plano de Hoje"
          description={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          icon={Sparkles}
          actions={
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-plan">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !dailyPlan ? (
          <ModernEmptyState
            icon={BookOpen}
            title="Erro ao carregar plano"
            description="Não foi possível gerar seu plano de estudos"
          />
        ) : (
          <>
            {/* Motivational Message */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium">{dailyPlan.motivationalMessage}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeTasks.length} tarefa{activeTasks.length !== 1 ? 's' : ''} pendente{activeTasks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Progresso</p>
                      <p className="text-2xl font-bold">{Math.round(completionPercentage)}%</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                  <Progress value={completionPercentage} className="mt-3" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Total</p>
                      <p className="text-2xl font-bold">{dailyPlan.totalMinutes}min</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tarefas Concluídas</p>
                      <p className="text-2xl font-bold">
                        {dailyPlan.tasks.length - activeTasks.length}/{dailyPlan.tasks.length}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Tarefas de Hoje</h2>
              {activeTasks.length === 0 ? (
                <ModernEmptyState
                  icon={Trophy}
                  title="Parabéns! Você completou todas as tarefas"
                  description="Volte amanhã para um novo plano de estudos"
                />
              ) : (
                activeTasks.map((task) => {
                  const isActive = activeTaskId === task.id;
                  
                  return (
                    <Card key={task.id} className={isActive ? 'border-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{task.subjectName}</Badge>
                              <Badge 
                                variant={task.priority === 'high' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <CardTitle className="text-base">{task.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {isActive ? (
                              <>
                                <div className="text-center">
                                  <p className="text-2xl font-mono font-bold">{formatTime(timerSeconds)}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                  >
                                    {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => completeTask(task.id)}
                                    data-testid={`button-complete-${task.id}`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                onClick={() => startTask(task.id)}
                                data-testid={`button-start-${task.id}`}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Iniciar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </UnifiedShell>
  );
}
