import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Clock,
  Star,
  ArrowLeft,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  // Fetch targets
  const { data: targets } = useQuery<TargetType[]>({
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
      toast({ title: "Sucesso", description: "Meta criada com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<GoalFormData> }) => {
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
      toast({ title: "Sucesso", description: "Meta atualizada com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Sucesso", description: "Meta excluída com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir meta",
        variant: "destructive",
      });
    },
  });

  // Target mutations
  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const payload = {
        ...data,
        // Deixar que o schema transforme os tipos automaticamente
        targetValue: data.targetValue || null,
        deadline: data.deadline || null,
      };
      return apiRequest("POST", "/api/targets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsTargetDialogOpen(false);
      targetForm.reset();
      toast({ title: "Sucesso", description: "Objetivo criado com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<TargetFormData> }) => {
      const payload = {
        ...data,
        // Deixar que o schema transforme os tipos automaticamente
        targetValue: data.targetValue || null,
        deadline: data.deadline || null,
      };
      return apiRequest("PATCH", `/api/targets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsTargetDialogOpen(false);
      setSelectedTarget(null);
      targetForm.reset();
      toast({ title: "Sucesso", description: "Objetivo atualizado com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Sucesso", description: "Objetivo excluído com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir objetivo",
        variant: "destructive",
      });
    },
  });

  const toggleTargetCompleted = useMutation({
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
      goalForm.reset({
        title: goal.title,
        description: goal.description || "",
        targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
      });
    } else {
      setSelectedGoal(null);
      goalForm.reset();
    }
    setIsGoalDialogOpen(true);
  };

  const openTargetDialog = (goalId?: string, target?: TargetType) => {
    if (target) {
      setSelectedTarget(target);
      targetForm.reset({
        title: target.title,
        description: target.description || "",
        targetValue: target.targetValue?.toString() || "",
        unit: target.unit || "",
        goalId: target.goalId || "",
        deadline: target.deadline ? new Date(target.deadline) : undefined,
      });
    } else {
      setSelectedTarget(null);
      targetForm.reset({
        goalId: goalId || "",
      });
    }
    setIsTargetDialogOpen(true);
  };

  const getTargetsForGoal = (goalId: string): TargetType[] => {
    return targets?.filter(target => target.goalId === goalId) || [];
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

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/dashboard"}
                className="flex items-center gap-2 hover:bg-muted"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
              <div className="border-l h-6"></div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Metas e Objetivos</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie suas metas de estudo e objetivos específicos</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Suas Metas</h1>
                <p className="text-sm text-muted-foreground">
                  {goals?.length || 0} metas • {targets?.length || 0} objetivos
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => openGoalDialog()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-create-goal"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </div>

          {/* Goals List */}
          {goalsLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando metas...</p>
            </div>
          ) : goals?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma meta encontrada</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Comece criando sua primeira meta de estudo. Organize seus objetivos e acompanhe seu progresso.
                </p>
                <Button 
                  onClick={() => openGoalDialog()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-create-first-goal"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals?.map((goal) => {
                const goalTargets = getTargetsForGoal(goal.id);
                const completionPercentage = getCompletionPercentage(goal);
                const isExpanded = isGoalExpanded(goal.id);
                
                return (
                  <Card key={goal.id} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGoalExpanded(goal.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              goal.completed 
                                ? "bg-green-100 dark:bg-green-900" 
                                : "bg-blue-100 dark:bg-blue-900"
                            )}>
                              {goal.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Flag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className={cn(
                                "font-medium text-foreground truncate",
                                goal.completed && "line-through text-muted-foreground"
                              )}>
                                {goal.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {goalTargets.length} objetivos
                                </Badge>
                                {completionPercentage > 0 && (
                                  <Badge 
                                    variant={completionPercentage === 100 ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {completionPercentage}% concluído
                                  </Badge>
                                )}
                                {goal.targetDate && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {format(new Date(goal.targetDate), "dd/MM/yyyy", { locale: ptBR })}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {goal.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGoalDialog(goal);
                            }}
                            data-testid={`button-edit-goal-${goal.id}`}
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
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-goal-${goal.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent>
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-foreground flex items-center gap-2">
                              <ListTodo className="h-4 w-4" />
                              Objetivos ({goalTargets.length})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTargetDialog(goal.id)}
                              data-testid={`button-add-target-${goal.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>

                          {goalTargets.length === 0 ? (
                            <div className="text-center py-6 border border-dashed rounded-lg">
                              <ListTodo className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Nenhum objetivo criado para esta meta
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {goalTargets.map((target) => (
                                <div
                                  key={target.id}
                                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto"
                                    onClick={() => toggleTargetCompleted.mutate({
                                      id: target.id,
                                      completed: !target.completed
                                    })}
                                    data-testid={`button-toggle-target-${target.id}`}
                                  >
                                    {target.completed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <div className="h-4 w-4 border-2 border-muted-foreground rounded-full" />
                                    )}
                                  </Button>
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      target.completed && "line-through text-muted-foreground"
                                    )}>
                                      {target.title}
                                    </p>
                                    {target.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {target.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      {target.targetValue && target.unit && (
                                        <Badge variant="outline" className="text-xs">
                                          {target.currentValue || 0}/{target.targetValue} {target.unit}
                                        </Badge>
                                      )}
                                      {target.deadline && (
                                        <Badge variant="outline" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {format(new Date(target.deadline), "dd/MM", { locale: ptBR })}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openTargetDialog(undefined, target)}
                                      data-testid={`button-edit-target-${target.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteTargetMutation.mutate(target.id)}
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-target-${target.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <DashboardIcon />

      {/* Goal Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedGoal ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
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
                            data-testid="button-goal-date"
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
                    : selectedGoal ? "Atualizar" : "Criar Meta"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Target Dialog */}
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTarget ? "Editar Objetivo" : "Novo Objetivo"}
            </DialogTitle>
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
    </div>
  );
}