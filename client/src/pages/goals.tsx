import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Removed Semantic UI imports - migrating to shadcn/ui
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Flag,
  ListTodo,
  TrendingUp,
  Sparkles
} from "lucide-react";
// Modern shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Professional components  
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { ProfessionalStats } from "@/components/ui/professional-stats";
import type { Goal, Target as TargetType } from "@shared/schema";

// Form schemas
const goalSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  targetDate: z.date().optional(),
});

const targetSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"), 
  description: z.string().optional(),
  targetValue: z.string().optional(),
  unit: z.string().optional(),
  deadline: z.date().optional(),
  goalId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;
type TargetFormData = z.infer<typeof targetSchema>;

export default function Goals() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetType | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // Form data states
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    targetDate: null as Date | null
  });
  
  const [targetFormData, setTargetFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: '',
    deadline: null as Date | null,
    goalId: ''
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

  // Fetch goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  // Fetch targets
  const { data: targets = [] } = useQuery<TargetType[]>({
    queryKey: ["/api/targets"],
    enabled: isAuthenticated,
  });

  // Goal mutations
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        ...data,
        targetDate: data.targetDate ? data.targetDate.toISOString() : null,
      };
      return apiRequest("POST", "/api/goals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsGoalModalOpen(false);
      resetGoalForm();
      toast({
        title: "Meta criada",
        description: "Meta criada com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar meta",
        variant: "destructive",
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GoalFormData }) => {
      const payload = {
        ...data,
        targetDate: data.targetDate ? data.targetDate.toISOString() : null,
      };
      return apiRequest("PATCH", `/api/goals/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsGoalModalOpen(false);
      setSelectedGoal(null);
      resetGoalForm();
      toast({
        title: "Meta atualizada",
        description: "Meta atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar meta",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "Meta removida",
        description: "Meta removida com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao remover meta",
        variant: "destructive",
      });
    },
  });

  // Target mutations
  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const payload = {
        ...data,
        deadline: data.deadline ? data.deadline.toISOString() : null,
      };
      return apiRequest("POST", "/api/targets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsTargetModalOpen(false);
      resetTargetForm();
      toast({
        title: "Objetivo criado",
        description: "Objetivo criado com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar objetivo",
        variant: "destructive",
      });
    },
  });

  const toggleTargetMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/targets/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
    },
  });

  // Helper functions
  const resetGoalForm = () => {
    setGoalFormData({
      title: '',
      description: '',
      targetDate: null
    });
  };

  const resetTargetForm = () => {
    setTargetFormData({
      title: '',
      description: '',
      targetValue: '',
      unit: '',
      deadline: null,
      goalId: ''
    });
  };

  const openGoalModal = (goal?: Goal) => {
    if (goal) {
      setSelectedGoal(goal);
      setGoalFormData({
        title: goal.title,
        description: goal.description || '',
        targetDate: goal.targetDate ? new Date(goal.targetDate) : null
      });
    } else {
      setSelectedGoal(null);
      resetGoalForm();
    }
    setIsGoalModalOpen(true);
  };

  const openTargetModal = (goalId: string, target?: TargetType) => {
    if (target) {
      setSelectedTarget(target);
      setTargetFormData({
        title: target.title,
        description: target.description || '',
        targetValue: target.targetValue || '',
        unit: target.unit || '',
        deadline: target.deadline ? new Date(target.deadline) : null,
        goalId: target.goalId || goalId
      });
    } else {
      setSelectedTarget(null);
      setTargetFormData({
        ...targetFormData,
        goalId,
        title: '',
        description: '',
        targetValue: '',
        unit: '',
        deadline: null
      });
    }
    setIsTargetModalOpen(true);
  };

  const getTargetsForGoal = (goalId: string) => {
    return targets.filter(target => target.goalId === goalId);
  };

  const getCompletionPercentage = (goal: Goal) => {
    const goalTargets = getTargetsForGoal(goal.id);
    if (goalTargets.length === 0) return goal.completed ? 100 : 0;
    
    const completedTargets = goalTargets.filter(t => t.completed).length;
    return Math.round((completedTargets / goalTargets.length) * 100);
  };

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const isGoalExpanded = (goalId: string) => {
    return expandedGoals.has(goalId);
  };

  const handleGoalSubmit = () => {
    if (!goalFormData.title.trim()) return;

    const data = {
      title: goalFormData.title,
      description: goalFormData.description || undefined,
      targetDate: goalFormData.targetDate || undefined
    };

    if (selectedGoal) {
      updateGoalMutation.mutate({ id: selectedGoal.id, data });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const handleTargetSubmit = () => {
    if (!targetFormData.title.trim()) return;

    const data = {
      title: targetFormData.title,
      description: targetFormData.description || undefined,
      targetValue: targetFormData.targetValue || undefined,
      unit: targetFormData.unit || undefined,
      deadline: targetFormData.deadline || undefined,
      goalId: targetFormData.goalId
    };

    createTargetMutation.mutate(data);
  };

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

  if (!isAuthenticated) {
    return null;
  }

  // Calculate stats
  const completedGoals = goals.filter(g => g.completed).length;
  const averageProgress = goals.length > 0 
    ? Math.round(goals.reduce((acc, goal) => acc + getCompletionPercentage(goal), 0) / goals.length)
    : 0;

  return (
    <ProfessionalShell
      title="Metas"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Metas', href: '/goals' }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            className="hidden sm:flex"
            onClick={() => window.location.href = '/goal-builder'}
            data-testid="button-goal-builder"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Construir Meta
          </Button>
          <Button 
            onClick={() => openGoalModal()}
            data-testid="button-create-goal"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      }
    >

        {/* Stats Overview */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Estatísticas</h2>
            <p className="text-muted-foreground">Acompanhe o progresso das suas metas</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {goalsLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <ProfessionalStats
                  icon={<Target className="w-8 h-8" />}
                  value={goals.length}
                  title="Total de Metas"
                  variant="default"
                  data-testid="stat-total-goals"
                />
                <ProfessionalStats
                  icon={<CheckCircle2 className="w-8 h-8" />}
                  value={completedGoals}
                  title="Metas Concluídas"
                  variant="success"
                  data-testid="stat-completed-goals"
                />
                <ProfessionalStats
                  icon={<ListTodo className="w-8 h-8" />}
                  value={targets.length}
                  title="Total de Objetivos"
                  variant="warning"
                  data-testid="stat-total-targets"
                />
                <ProfessionalStats
                  icon={<TrendingUp className="w-8 h-8" />}
                  value={`${averageProgress}%`}
                  title="Progresso Médio"
                  variant="info"
                  data-testid="stat-average-progress"
                />
              </>
            )}
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Suas Metas</h2>
            <p className="text-muted-foreground">{goals.length} metas cadastradas</p>
          </div>
          
          <div className="space-y-4">
            {goalsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-goals">
                <Target className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma meta encontrada</h3>
                <p className="text-muted-foreground mb-4">Comece criando sua primeira meta de estudo. Organize seus objetivos e acompanhe seu progresso.</p>
                <Button onClick={() => openGoalModal()}>
                  Criar Primeira Meta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const goalTargets = getTargetsForGoal(goal.id);
                  const completionPercentage = getCompletionPercentage(goal);
                  const isExpanded = isGoalExpanded(goal.id);
                  
                  return (
                    <Collapsible key={goal.id} open={isExpanded} onOpenChange={() => toggleGoalExpanded(goal.id)}>
                      <Card className="transition-all duration-200 hover:shadow-md">
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-6 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`p-2 rounded-lg ${
                                    goal.completed 
                                      ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                  }`}>
                                    {goal.completed ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <Flag className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className={`text-lg font-semibold mb-1 ${
                                      goal.completed 
                                        ? 'line-through text-muted-foreground' 
                                        : 'text-foreground'
                                    }`}>
                                      {goal.title}
                                    </h3>
                                    {goal.description && (
                                      <p className="text-sm text-muted-foreground">
                                        {goal.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mb-4">
                                  <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-medium">{completionPercentage}%</span>
                                  </div>
                                  <Progress value={completionPercentage} className="w-full" />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGoalModal(goal);
                                  }}
                                  data-testid={`button-edit-goal-${goal.id}`}
                                  title={`Editar meta ${goal.title}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGoalMutation.mutate(goal.id);
                                  }}
                                  data-testid={`button-delete-goal-${goal.id}`}
                                  title={`Excluir meta ${goal.title}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="pt-6 border-t">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-semibold">Objetivos ({goalTargets.length})</h4>
                              <Button 
                                size="sm"
                                onClick={() => openTargetModal(goal.id)}
                                data-testid={`button-add-target-${goal.id}`}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Objetivo
                              </Button>
                            </div>
                            
                            {goalTargets.length === 0 ? (
                              <Alert>
                                <AlertDescription>
                                  Nenhum objetivo definido para esta meta.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <div className="space-y-3">
                                {goalTargets.map((target) => (
                                  <Card key={target.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleTargetMutation.mutate({ 
                                            id: target.id, 
                                            completed: !target.completed 
                                          })}
                                          data-testid={`button-toggle-target-${target.id}`}
                                          className={target.completed ? 'text-green-600' : 'text-muted-foreground'}
                                        >
                                          {target.completed ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                          ) : (
                                            <CalendarIcon className="w-5 h-5" />
                                          )}
                                        </Button>
                                        <div className="flex-1">
                                          <p className={`font-medium ${
                                            target.completed 
                                              ? 'line-through text-muted-foreground' 
                                              : 'text-foreground'
                                          }`}>
                                            {target.title}
                                          </p>
                                          {target.description && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {target.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {(target.targetValue || target.unit) && (
                                        <Badge variant="secondary">
                                          {target.targetValue} {target.unit}
                                        </Badge>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Goal Modal */}
        <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedGoal ? "Editar Meta" : "Nova Meta"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="goal-title">
                  Título da Meta *
                </label>
                <Input
                  id="goal-title"
                  placeholder="Ex: Passar no concurso SEFAZ-DF"
                  value={goalFormData.title}
                  onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                  data-testid="input-goal-title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="goal-description">
                  Descrição (Opcional)
                </label>
                <Textarea
                  id="goal-description"
                  placeholder="Descreva sua meta..."
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                  data-testid="input-goal-description"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => setIsGoalModalOpen(false)}
                data-testid="button-cancel-goal"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGoalSubmit}
                disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                data-testid="button-save-goal"
              >
                {createGoalMutation.isPending || updateGoalMutation.isPending ? "Salvando..." : (
                  selectedGoal ? "Atualizar Meta" : "Criar Meta"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Target Modal */}
        <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedTarget ? "Editar Objetivo" : "Novo Objetivo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="target-title">
                  Título do Objetivo *
                </label>
                <Input
                  id="target-title"
                  placeholder="Ex: Estudar 2 horas de matemática por dia"
                  value={targetFormData.title}
                  onChange={(e) => setTargetFormData({ ...targetFormData, title: e.target.value })}
                  data-testid="input-target-title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="target-description">
                  Descrição (Opcional)
                </label>
                <Textarea
                  id="target-description"
                  placeholder="Descreva seu objetivo..."
                  value={targetFormData.description}
                  onChange={(e) => setTargetFormData({ ...targetFormData, description: e.target.value })}
                  data-testid="input-target-description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="target-value">
                    Meta Numérica
                  </label>
                  <Input
                    id="target-value"
                    placeholder="Ex: 100"
                    value={targetFormData.targetValue}
                    onChange={(e) => setTargetFormData({ ...targetFormData, targetValue: e.target.value })}
                    data-testid="input-target-value"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="target-unit">
                    Unidade
                  </label>
                  <Input
                    id="target-unit"
                    placeholder="Ex: horas"
                    value={targetFormData.unit}
                    onChange={(e) => setTargetFormData({ ...targetFormData, unit: e.target.value })}
                    data-testid="input-target-unit"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => setIsTargetModalOpen(false)}
                data-testid="button-cancel-target"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTargetSubmit}
                disabled={createTargetMutation.isPending}
                data-testid="button-save-target"
              >
                {createTargetMutation.isPending ? "Salvando..." : (
                  selectedTarget ? "Atualizar Objetivo" : "Criar Objetivo"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </ProfessionalShell>
  );
}