/**
 * Goals - Clean Timeline Layout
 * Reduced from 819 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Target,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Circle,
  Flag
} from "lucide-react";
import type { Goal, Target as TargetType } from "@shared/schema";

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
  goalId: z.string(),
});

type GoalFormData = z.infer<typeof goalSchema>;
type TargetFormData = z.infer<typeof targetSchema>;

export default function Goals() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: targets = [] } = useQuery<TargetType[]>({
    queryKey: ["/api/targets"],
    enabled: isAuthenticated,
  });

  const goalForm = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { title: "", description: "", targetDate: undefined },
  });

  const targetForm = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: { title: "", description: "", goalId: "" },
  });

  // Mutations
  const createGoal = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = { ...data, targetDate: data.targetDate?.toISOString() || null };
      return apiRequest("POST", "/api/goals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setGoalModalOpen(false);
      goalForm.reset();
      toast({ title: "Sucesso", description: "Meta criada!" });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao criar meta", variant: "destructive" }),
  });

  const createTarget = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const payload = { ...data, deadline: data.deadline?.toISOString() || null };
      return apiRequest("POST", "/api/targets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setTargetModalOpen(false);
      targetForm.reset();
      toast({ title: "Sucesso", description: "Objetivo criado!" });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao criar objetivo", variant: "destructive" }),
  });

  const toggleTarget = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/targets/${id}`, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/targets"] }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Sucesso", description: "Meta removida!" });
    },
  });

  const deleteTarget = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/targets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Sucesso", description: "Objetivo removido!" });
    },
  });

  const getGoalTargets = (goalId: string) => targets.filter(t => t.goalId === goalId);

  const getGoalProgress = (goalId: string) => {
    const goalTargets = getGoalTargets(goalId);
    if (goalTargets.length === 0) return 0;
    const completed = goalTargets.filter(t => t.completed).length;
    return (completed / goalTargets.length) * 100;
  };

  const totalTargets = targets.length;
  const completedTargets = targets.filter(t => t.completed).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <UnifiedShell
      title="Metas"
      actions={
        <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-goal">
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
            </DialogHeader>
            <Form {...goalForm}>
              <form onSubmit={goalForm.handleSubmit((data) => createGoal.mutate(data))} className="space-y-4">
                <FormField control={goalForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input {...field} data-testid="input-goal-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={goalForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={goalForm.control} name="targetDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Alvo (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : "Selecionar data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createGoal.isPending}>Criar Meta</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <ModernPageHeader
            title="Minhas Metas"
            description={`${goals.length} metas • ${totalTargets} objetivos`}
            icon={Target}
          />
          <div className="flex gap-3">
            <Badge variant="outline">{completedTargets}/{totalTargets} concluídos</Badge>
            {totalTargets > 0 && (
              <Badge variant="secondary">{Math.round((completedTargets / totalTargets) * 100)}%</Badge>
            )}
          </div>
        </div>

        {/* Goals Timeline */}
        {goals.length === 0 ? (
          <ModernEmptyState
            icon={Target}
            title="Nenhuma meta criada"
            description="Crie sua primeira meta para começar a organizar seus objetivos de estudo."
            action={{
              label: "Nova Meta",
              onClick: () => setGoalModalOpen(true)
            }}
          />
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const goalTargets = getGoalTargets(goal.id);
              const progress = getGoalProgress(goal.id);
              
              return (
                <Card key={goal.id} data-testid={`goal-${goal.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Flag className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          {goal.targetDate && (
                            <Badge variant="outline">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {format(new Date(goal.targetDate), "dd MMM yyyy", { locale: ptBR })}
                            </Badge>
                          )}
                          <Badge variant="secondary">{goalTargets.length} objetivos</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            targetForm.reset({ goalId: goal.id });
                            setTargetModalOpen(true);
                          }}
                          data-testid={`button-add-target-${goal.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGoal.mutate(goal.id)}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {goalTargets.length > 0 && (
                      <>
                        <Progress value={progress} className="h-2 mb-4" />
                        <div className="space-y-2">
                          {goalTargets.map((target) => (
                            <div
                              key={target.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                              data-testid={`target-${target.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  onClick={() => toggleTarget.mutate({ id: target.id, completed: !target.completed })}
                                  className="flex-shrink-0"
                                  data-testid={`button-toggle-${target.id}`}
                                >
                                  {target.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${target.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {target.title}
                                  </p>
                                  {target.deadline && (
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(target.deadline), "dd MMM yyyy", { locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTarget.mutate(target.id)}
                                data-testid={`button-delete-target-${target.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Target Modal */}
        <Dialog open={targetModalOpen} onOpenChange={setTargetModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Objetivo</DialogTitle>
            </DialogHeader>
            <Form {...targetForm}>
              <form onSubmit={targetForm.handleSubmit((data) => createTarget.mutate(data))} className="space-y-4">
                <FormField control={targetForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input {...field} data-testid="input-target-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={targetForm.control} name="deadline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : "Selecionar data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createTarget.isPending}>Criar Objetivo</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </UnifiedShell>
  );
}
