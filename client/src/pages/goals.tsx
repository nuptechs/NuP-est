import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
import TeamsShell from "@/components/layout/teams-shell";
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
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

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

  // Goal form
  const goalForm = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Target form
  const targetForm = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      title: "",
      description: "",
      targetValue: "",
      unit: "",
    },
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
      setIsGoalDialogOpen(false);
      goalForm.reset();
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
      setIsGoalDialogOpen(false);
      setSelectedGoal(null);
      goalForm.reset();
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
      setIsTargetDialogOpen(false);
      targetForm.reset();
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

  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TargetFormData }) => {
      const payload = {
        ...data,
        deadline: data.deadline ? data.deadline.toISOString() : null,
      };
      return apiRequest("PATCH", `/api/targets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsTargetDialogOpen(false);
      setSelectedTarget(null);
      targetForm.reset();
      toast({
        title: "Objetivo atualizado",
        description: "Objetivo atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar objetivo",
        variant: "destructive",
      });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "Objetivo removido",
        description: "Objetivo removido com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao remover objetivo",
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
  const openGoalDialog = (goal?: Goal) => {
    if (goal) {
      setSelectedGoal(goal);
      goalForm.setValue("title", goal.title);
      goalForm.setValue("description", goal.description || "");
      if (goal.targetDate) {
        goalForm.setValue("targetDate", new Date(goal.targetDate));
      }
    } else {
      setSelectedGoal(null);
      goalForm.reset();
    }
    setIsGoalDialogOpen(true);
  };

  const openTargetDialog = (target?: TargetType, goalId?: string) => {
    if (target) {
      setSelectedTarget(target);
      targetForm.setValue("title", target.title);
      targetForm.setValue("description", target.description || "");
      targetForm.setValue("targetValue", target.targetValue || "");
      targetForm.setValue("unit", target.unit || "");
      targetForm.setValue("goalId", target.goalId || "");
      if (target.deadline) {
        targetForm.setValue("deadline", new Date(target.deadline));
      }
    } else {
      setSelectedTarget(null);
      targetForm.reset({
        title: "",
        description: "",
        targetValue: "",
        unit: "",
        goalId: goalId || "",
      });
    }
    setIsTargetDialogOpen(true);
  };

  const getTargetsForGoal = (goalId: string): TargetType[] => {
    return targets.filter(target => target.goalId === goalId);
  };

  const getCompletionPercentage = (goal: Goal): number => {
    const goalTargets = getTargetsForGoal(goal.id);
    if (goalTargets.length === 0) return 0;
    const completedTargets = goalTargets.filter(target => target.completed).length;
    return Math.round((completedTargets / goalTargets.length) * 100);
  };

  const isGoalExpanded = (goalId: string) => expandedGoals.has(goalId);

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  // Loading state
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

  // Calculate stats
  const completedGoals = goals.filter(g => g.completed).length;
  const averageProgress = goals.length > 0 
    ? Math.round(goals.reduce((acc, goal) => acc + getCompletionPercentage(goal), 0) / goals.length)
    : 0;

  const breadcrumbs = [
    { label: "Metas e Objetivos" }
  ];

  const primaryActions = (
    <div className="flex gap-2">
      <Button 
        onClick={() => window.location.href = '/goal-builder'}
        size="sm"
        data-testid="button-goal-builder"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Construir Meta
      </Button>
      <Button 
        onClick={() => openGoalDialog()}
        variant="outline"
        size="sm"
        data-testid="button-create-goal"
      >
        <Plus className="w-4 h-4 mr-2" />
        Nova Meta
      </Button>
    </div>
  );

  return (
    <TeamsShell 
      title="Metas e Objetivos" 
      subtitle="Gerencie suas metas de estudo e acompanhe seu progresso"
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Stats Overview */}
        <div>
          <SectionHeader 
            title="Estatísticas"
            description="Acompanhe o progresso das suas metas"
            data-testid="stats-header"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {goalsLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard
                  icon={<Target className="w-8 h-8" />}
                  value={goals.length}
                  label="Total de Metas"
                  variant="info"
                  data-testid="stat-total-goals"
                />
                <StatCard
                  icon={<CheckCircle2 className="w-8 h-8" />}
                  value={completedGoals}
                  label="Metas Concluídas"
                  variant="success"
                  data-testid="stat-completed-goals"
                />
                <StatCard
                  icon={<ListTodo className="w-8 h-8" />}
                  value={targets.length}
                  label="Total de Objetivos"
                  variant="warning"
                  data-testid="stat-total-targets"
                />
                <StatCard
                  icon={<TrendingUp className="w-8 h-8" />}
                  value={`${averageProgress}%`}
                  label="Progresso Médio"
                  variant="primary"
                  data-testid="stat-average-progress"
                />
              </>
            )}
          </div>
        </div>

        {/* Goals List */}
        <div>
          <SectionHeader 
            title="Suas Metas"
            description={`${goals.length} metas cadastradas`}
            data-testid="goals-header"
          />
          
          <div className="mt-4">
            {goalsLoading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : goals.length === 0 ? (
              <EmptyState
                icon={<Target className="w-12 h-12" />}
                title="Nenhuma meta encontrada"
                description="Comece criando sua primeira meta de estudo. Organize seus objetivos e acompanhe seu progresso."
                action={{
                  label: "Criar Primeira Meta",
                  onClick: () => openGoalDialog()
                }}
                data-testid="empty-goals"
              />
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const goalTargets = getTargetsForGoal(goal.id);
                  const completionPercentage = getCompletionPercentage(goal);
                  const isExpanded = isGoalExpanded(goal.id);
                  
                  return (
                    <Card key={goal.id} className="surface-elevated hover-lift transition-fast">
                      <CardContent className="p-6">
                        <div 
                          className="cursor-pointer"
                          onClick={() => toggleGoalExpanded(goal.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  goal.completed 
                                    ? "bg-success/10 text-success" 
                                    : "bg-info/10 text-info"
                                )}>
                                  {goal.completed ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Flag className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className={cn(
                                    "text-lg font-semibold text-foreground truncate",
                                    goal.completed && "line-through text-muted-foreground"
                                  )}>
                                    {goal.title}
                                  </h3>
                                  {goal.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {goal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                  {goalTargets.length} objetivo{goalTargets.length !== 1 ? 's' : ''}
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                  {completionPercentage}% completo
                                </div>
                                {goal.targetDate && (
                                  <div className="text-sm text-muted-foreground">
                                    Prazo: {format(new Date(goal.targetDate), "dd/MM/yyyy", { locale: ptBR })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGoalDialog(goal);
                                }}
                                data-testid={`button-edit-goal-${goal.id}`}
                                aria-label={`Editar meta ${goal.title}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGoalMutation.mutate(goal.id);
                                }}
                                data-testid={`button-delete-goal-${goal.id}`}
                                aria-label={`Excluir meta ${goal.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded content with targets */}
                        {isExpanded && goalTargets.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-semibold text-foreground">Objetivos</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTargetDialog(undefined, goal.id);
                                }}
                                data-testid={`button-add-target-${goal.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              {goalTargets.map((target) => (
                                <div
                                  key={target.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTargetMutation.mutate({
                                          id: target.id,
                                          completed: !target.completed
                                        });
                                      }}
                                      className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                        target.completed
                                          ? "bg-success border-success text-white"
                                          : "border-border hover:border-primary"
                                      )}
                                      data-testid={`button-toggle-target-${target.id}`}
                                    >
                                      {target.completed && (
                                        <CheckCircle2 className="w-3 h-3" />
                                      )}
                                    </button>
                                    
                                    <div className="flex-1">
                                      <p className={cn(
                                        "text-sm font-medium text-foreground",
                                        target.completed && "line-through text-muted-foreground"
                                      )}>
                                        {target.title}
                                      </p>
                                      {(target.targetValue || target.unit) && (
                                        <p className="text-xs text-muted-foreground">
                                          Meta: {target.targetValue} {target.unit}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTargetDialog(target);
                                      }}
                                      data-testid={`button-edit-target-${target.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTargetMutation.mutate(target.id);
                                      }}
                                      data-testid={`button-delete-target-${target.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goal Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              {selectedGoal ? "Edite os detalhes da sua meta" : "Crie uma nova meta para organizar seus estudos e acompanhar seu progresso"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(data => {
              if (selectedGoal) {
                updateGoalMutation.mutate({ id: selectedGoal.id, data });
              } else {
                createGoalMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={goalForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Meta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Passar no ENEM 2024" {...field} data-testid="input-goal-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={goalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva sua meta em detalhes..."
                        className="resize-none"
                        {...field}
                        data-testid="input-goal-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={goalForm.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Alvo (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-goal-target-date"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGoalDialogOpen(false)}
                  data-testid="button-cancel-goal"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                  data-testid="button-save-goal"
                >
                  {createGoalMutation.isPending || updateGoalMutation.isPending
                    ? "Salvando..."
                    : selectedGoal ? "Atualizar Meta" : "Criar Meta"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Target Dialog */}
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTarget ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
            <DialogDescription>
              {selectedTarget ? "Edite os detalhes do seu objetivo" : "Crie um objetivo específico para esta meta"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...targetForm}>
            <form onSubmit={targetForm.handleSubmit(data => {
              if (selectedTarget) {
                updateTargetMutation.mutate({ id: selectedTarget.id, data });
              } else {
                createTargetMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={targetForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Objetivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Estudar 2 horas de matemática por dia" {...field} data-testid="input-target-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={targetForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva seu objetivo..."
                        className="resize-none"
                        {...field}
                        data-testid="input-target-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={targetForm.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Numérica</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 100" {...field} data-testid="input-target-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={targetForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: horas" {...field} data-testid="input-target-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={targetForm.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-target-deadline"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTargetDialogOpen(false)}
                  data-testid="button-cancel-target"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                  data-testid="button-save-target"
                >
                  {createTargetMutation.isPending || updateTargetMutation.isPending
                    ? "Salvando..."
                    : selectedTarget ? "Atualizar" : "Criar Objetivo"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TeamsShell>
  );
}