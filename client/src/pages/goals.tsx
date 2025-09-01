import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema, insertTargetSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Goal, Target } from "@shared/schema";

const goalFormSchema = insertGoalSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  targetDate: z.string().optional(),
});

const targetFormSchema = insertTargetSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  targetValue: z.string().min(1, "Valor da meta é obrigatório"),
  unit: z.string().min(1, "Unidade é obrigatória"),
});

export default function Goals() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [isTargetFormOpen, setIsTargetFormOpen] = useState(false);

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

  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: targets } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
    enabled: isAuthenticated,
  });

  const goalForm = useForm({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: "",
    },
  });

  const targetForm = useForm({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      title: "",
      description: "",
      targetValue: "",
      currentValue: "0",
      unit: "",
      goalId: "",
      deadline: "",
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof goalFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const goalData = {
        ...data,
        userId: user.id,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      };
      await apiRequest("POST", "/api/goals", goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsGoalFormOpen(false);
      goalForm.reset();
      toast({
        title: "Sucesso",
        description: "Objetivo criado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao criar objetivo",
        variant: "destructive",
      });
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof targetFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const targetData = {
        ...data,
        userId: user.id,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      };
      await apiRequest("POST", "/api/targets", targetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/weekly"] });
      setIsTargetFormOpen(false);
      targetForm.reset();
      toast({
        title: "Sucesso",
        description: "Meta criada com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao criar meta",
        variant: "destructive",
      });
    },
  });

  const updateStudyProfileMutation = useMutation({
    mutationFn: async (studyProfile: string) => {
      await apiRequest("PATCH", "/api/auth/user", { studyProfile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sucesso",
        description: "Perfil de estudo atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    },
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

  const getTargetProgress = (target: Target) => {
    const current = parseFloat(target.currentValue || "0");
    const total = parseFloat(target.targetValue || "1");
    return Math.round((current / total) * 100);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Objetivos e Metas" 
          subtitle="Defina seus objetivos e acompanhe seu progresso"
        />
        
        <div className="p-6 space-y-6">
          {/* Study Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-user-cog mr-2 text-accent"></i>
                Perfil de Estudo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seu perfil atual: <span className="font-medium text-foreground">
                    {user?.studyProfile === "disciplined" ? "Disciplinado" :
                     user?.studyProfile === "undisciplined" ? "Indisciplinado" : "Mediano"}
                  </span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant={user?.studyProfile === "disciplined" ? "default" : "outline"}
                    onClick={() => updateStudyProfileMutation.mutate("disciplined")}
                    className="p-4 h-auto flex-col"
                    data-testid="button-profile-disciplined"
                  >
                    <i className="fas fa-star mb-2"></i>
                    <span className="font-medium">Disciplinado</span>
                    <span className="text-xs mt-1 opacity-80">
                      Estudante organizado, prefere desafios complexos
                    </span>
                  </Button>
                  
                  <Button
                    variant={user?.studyProfile === "average" ? "default" : "outline"}
                    onClick={() => updateStudyProfileMutation.mutate("average")}
                    className="p-4 h-auto flex-col"
                    data-testid="button-profile-average"
                  >
                    <i className="fas fa-balance-scale mb-2"></i>
                    <span className="font-medium">Mediano</span>
                    <span className="text-xs mt-1 opacity-80">
                      Equilibrio entre teoria e prática
                    </span>
                  </Button>
                  
                  <Button
                    variant={user?.studyProfile === "undisciplined" ? "default" : "outline"}
                    onClick={() => updateStudyProfileMutation.mutate("undisciplined")}
                    className="p-4 h-auto flex-col"
                    data-testid="button-profile-undisciplined"
                  >
                    <i className="fas fa-fire mb-2"></i>
                    <span className="font-medium">Indisciplinado</span>
                    <span className="text-xs mt-1 opacity-80">
                      Precisa de conteúdo envolvente e prático
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals and Targets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Objetivos Macro</CardTitle>
                  <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-new-goal">
                        <i className="fas fa-plus mr-2"></i>
                        Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Objetivo</DialogTitle>
                      </DialogHeader>
                      <Form {...goalForm}>
                        <form onSubmit={goalForm.handleSubmit((data) => createGoalMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={goalForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: Passar no vestibular" 
                                    {...field}
                                    data-testid="input-goal-title"
                                  />
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
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Descreva seu objetivo..."
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
                                <FormLabel>Data Alvo</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field}
                                    data-testid="input-goal-date"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-3">
                            <Button type="button" variant="outline" onClick={() => setIsGoalFormOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={createGoalMutation.isPending} data-testid="button-save-goal">
                              {createGoalMutation.isPending ? "Criando..." : "Criar Objetivo"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!goals?.length ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-bullseye text-muted-foreground"></i>
                    </div>
                    <p className="text-muted-foreground mb-4">Nenhum objetivo definido</p>
                    <Button onClick={() => setIsGoalFormOpen(true)} data-testid="button-create-first-goal">
                      <i className="fas fa-plus mr-2"></i>
                      Criar primeiro objetivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goals?.map((goal: Goal) => (
                      <div key={goal.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground" data-testid={`goal-title-${goal.id}`}>
                              {goal.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.description}
                            </p>
                            {goal.targetDate && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <i className="fas fa-calendar mr-1"></i>
                                Meta: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <Badge variant={goal.completed ? "default" : "secondary"}>
                            {goal.completed ? "Concluído" : "Em progresso"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Targets */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Metas Micro</CardTitle>
                  <Dialog open={isTargetFormOpen} onOpenChange={setIsTargetFormOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-new-target">
                        <i className="fas fa-plus mr-2"></i>
                        Nova
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Meta</DialogTitle>
                      </DialogHeader>
                      <Form {...targetForm}>
                        <form onSubmit={targetForm.handleSubmit((data) => createTargetMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={targetForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: Estudar 20 horas esta semana" 
                                    {...field}
                                    data-testid="input-target-title"
                                  />
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
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Detalhes da meta..."
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
                                  <FormLabel>Valor Alvo</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="20" 
                                      {...field}
                                      data-testid="input-target-value"
                                    />
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
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger data-testid="select-target-unit">
                                        <SelectValue placeholder="Unidade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="horas">Horas</SelectItem>
                                        <SelectItem value="questões">Questões</SelectItem>
                                        <SelectItem value="materiais">Materiais</SelectItem>
                                        <SelectItem value="sessões">Sessões</SelectItem>
                                        <SelectItem value="dias">Dias</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={targetForm.control}
                            name="goalId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Objetivo Relacionado (Opcional)</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger data-testid="select-target-goal">
                                      <SelectValue placeholder="Selecione um objetivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {goals?.map((goal: Goal) => (
                                        <SelectItem key={goal.id} value={goal.id}>
                                          {goal.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={targetForm.control}
                            name="deadline"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prazo</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field}
                                    data-testid="input-target-deadline"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-3">
                            <Button type="button" variant="outline" onClick={() => setIsTargetFormOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={createTargetMutation.isPending} data-testid="button-save-target">
                              {createTargetMutation.isPending ? "Criando..." : "Criar Meta"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!targets?.length ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-crosshairs text-muted-foreground"></i>
                    </div>
                    <p className="text-muted-foreground mb-4">Nenhuma meta definida</p>
                    <Button onClick={() => setIsTargetFormOpen(true)} data-testid="button-create-first-target">
                      <i className="fas fa-plus mr-2"></i>
                      Criar primeira meta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {targets?.map((target: Target) => {
                      const progress = getTargetProgress(target);
                      return (
                        <div key={target.id} className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground" data-testid={`target-title-${target.id}`}>
                                {target.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {target.currentValue}/{target.targetValue} {target.unit}
                              </p>
                              {target.deadline && (
                                <p className="text-xs text-muted-foreground">
                                  <i className="fas fa-clock mr-1"></i>
                                  {new Date(target.deadline).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                            <Badge variant={target.completed ? "default" : "secondary"}>
                              {progress}%
                            </Badge>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
