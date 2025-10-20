import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Play,
  Pause,
  Check,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  BookOpen,
  Brain,
  RefreshCw,
  ArrowLeft,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProfessionalShell from "@/components/ui/professional-shell";

interface StudyTask {
  id: string;
  type: 'material' | 'practice' | 'review' | 'assessment';
  title: string;
  description: string;
  subjectName: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  materialId?: string;
  completed: boolean;
  timeSpent?: number;
}

interface DailyPlan {
  date: string;
  totalMinutes: number;
  availableMinutes: number;
  tasks: StudyTask[];
  motivationalMessage: string;
  focusAreas: string[];
  completionRate?: number;
}

export default function GuidedStudyPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [localCompletedTasks, setLocalCompletedTasks] = useState<Set<string>>(new Set());

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
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to complete task' }));
        throw new Error(error.message || 'Failed to complete task');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      setLocalCompletedTasks(prev => new Set(prev).add(variables.taskId));
      toast({
        title: "Tarefa concluída!",
        description: "Ótimo trabalho! Continue assim.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/study-planner/today'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao concluir tarefa",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
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

  const pauseTask = () => {
    setIsTimerRunning(false);
  };

  const resumeTask = () => {
    setIsTimerRunning(true);
  };

  const completeTask = (taskId: string) => {
    const timeSpent = Math.floor(timerSeconds / 60);
    completeTaskMutation.mutate({ taskId, timeSpent });
    setActiveTaskId(null);
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  useEffect(() => {
    if (dailyPlan?.tasks) {
      const backendCompleted = dailyPlan.tasks
        .filter(t => t.completed)
        .map(t => t.id);
      setLocalCompletedTasks(new Set(backendCompleted));
    }
  }, [dailyPlan]);

  if (isLoading) {
    return (
      <ProfessionalShell
        title="Estudo Guiado"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estudo Guiado', href: '/guided-study' }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Gerando seu plano de estudo...</p>
          </div>
        </div>
      </ProfessionalShell>
    );
  }

  if (!dailyPlan) {
    return (
      <ProfessionalShell
        title="Estudo Guiado"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estudo Guiado', href: '/guided-study' }
        ]}
      >
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Erro ao carregar plano</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Não foi possível gerar seu plano de estudos.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </ProfessionalShell>
    );
  }

  const completedTaskIds = new Set([
    ...Array.from(localCompletedTasks), 
    ...dailyPlan.tasks.filter(t => t.completed).map(t => t.id)
  ]);
  const activeTasks = dailyPlan.tasks.filter(t => !completedTaskIds.has(t.id));
  const completionPercentage = dailyPlan.completionRate !== undefined 
    ? dailyPlan.completionRate 
    : (completedTaskIds.size / dailyPlan.tasks.length) * 100;
  const totalTimeSpent = Math.floor(timerSeconds / 60);

  return (
    <ProfessionalShell
      title="Estudo Guiado"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Estudo Guiado', href: '/guided-study' }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Seu Plano de Hoje
            </h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Motivational Message */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <p className="text-lg font-medium">{dailyPlan.motivationalMessage}</p>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Progresso</p>
                  <p className="text-3xl font-bold">{Math.round(completionPercentage)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedTaskIds.size} de {dailyPlan.tasks.length} tarefas
                  </p>
                </div>
                <Target className="w-8 h-8 text-primary" />
              </div>
              <Progress value={completionPercentage} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tempo Planejado</p>
                  <p className="text-3xl font-bold">{dailyPlan.totalMinutes}min</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    De {dailyPlan.availableMinutes}min disponíveis
                  </p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Focos Principais</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dailyPlan.focusAreas.slice(0, 2).map(area => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Brain className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Task Timer */}
        {activeTaskId && (
          <Card className="border-2 border-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Badge variant="default" className="mb-2">Em andamento</Badge>
                  <h3 className="font-semibold text-lg">
                    {dailyPlan.tasks.find(t => t.id === activeTaskId)?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dailyPlan.tasks.find(t => t.id === activeTaskId)?.description}
                  </p>
                </div>
                <div className="text-center ml-6">
                  <div className="text-4xl font-mono font-bold mb-2">{formatTime(timerSeconds)}</div>
                  <div className="flex gap-2">
                    {isTimerRunning ? (
                      <Button variant="outline" size="sm" onClick={pauseTask} data-testid="button-pause">
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={resumeTask} data-testid="button-resume">
                        <Play className="w-4 h-4 mr-2" />
                        Continuar
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => completeTask(activeTaskId)}
                      data-testid="button-complete"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Concluir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Suas Tarefas de Hoje</h2>
          <div className="space-y-3">
            {dailyPlan.tasks.map((task, index) => {
              const isCompleted = completedTaskIds.has(task.id);
              const isActive = activeTaskId === task.id;
              const priorityColors = {
                high: 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900',
                medium: 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900',
                low: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900',
              };

              return (
                <Card
                  key={task.id}
                  className={`border-2 transition-all ${
                    isCompleted
                      ? 'opacity-50 bg-muted'
                      : isActive
                      ? 'border-primary shadow-md'
                      : priorityColors[task.priority]
                  }`}
                  data-testid={`task-${task.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-muted-foreground">
                              {index + 1}.
                            </span>
                            <div>
                              <h3 className="font-semibold">{task.title}</h3>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                          </div>
                          {isCompleted && (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Concluído
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.estimatedMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {task.subjectName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {task.priority === 'high' ? 'Alta prioridade' :
                             task.priority === 'medium' ? 'Prioridade média' : 'Baixa prioridade'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-2">
                          💡 {task.reason}
                        </p>
                      </div>
                      {!isCompleted && !isActive && (
                        <Button
                          onClick={() => startTask(task.id)}
                          data-testid={`button-start-${task.id}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Completion State */}
        {completedTaskIds.size === dailyPlan.tasks.length && (
          <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <Trophy className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Parabéns! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                Você concluiu todas as tarefas de hoje. Excelente trabalho!
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Novo Plano
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfessionalShell>
  );
}
