import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Form,
  Input,
  TextArea,
  Modal,
  Message,
  Progress,
  Loader,
  Dimmer,
  Label,
  Icon,
  Segment
} from 'semantic-ui-react';
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
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
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
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-gray-50)' }}>
        <Dimmer active>
          <Loader size="large">Carregando...</Loader>
        </Dimmer>
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-gray-50)', padding: 'var(--spacing-lg)' }}>
      <Container>
        {/* Header Section */}
        <div className="mb-xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
            <div>
              <Header as="h1" style={{ fontSize: '32px', fontWeight: '600', color: 'var(--nup-gray-800)', marginBottom: 'var(--spacing-xs)' }}>
                Metas e Objetivos
              </Header>
              <p style={{ color: 'var(--nup-gray-600)', fontSize: '16px' }}>
                Gerencie suas metas de estudo e acompanhe seu progresso
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button 
                primary
                icon="magic"
                content="Construir Meta"
                onClick={() => window.location.href = '/goal-builder'}
                data-testid="button-goal-builder"
              />
              <Button 
                secondary
                icon="plus"
                content="Nova Meta"
                onClick={() => openGoalModal()}
                data-testid="button-create-goal"
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-xl">
          <SectionHeader 
            title="Estatísticas"
            description="Acompanhe o progresso das suas metas"
            data-testid="stats-header"
          />
          
          <Grid columns={4} stackable style={{ marginTop: 'var(--spacing-md)' }}>
            {goalsLoading ? (
              <>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
              </>
            ) : (
              <>
                <Grid.Column>
                  <StatCard
                    icon={<Target style={{ width: '32px', height: '32px' }} />}
                    value={goals.length}
                    label="Total de Metas"
                    variant="info"
                    data-testid="stat-total-goals"
                  />
                </Grid.Column>
                <Grid.Column>
                  <StatCard
                    icon={<CheckCircle2 style={{ width: '32px', height: '32px' }} />}
                    value={completedGoals}
                    label="Metas Concluídas"
                    variant="success"
                    data-testid="stat-completed-goals"
                  />
                </Grid.Column>
                <Grid.Column>
                  <StatCard
                    icon={<ListTodo style={{ width: '32px', height: '32px' }} />}
                    value={targets.length}
                    label="Total de Objetivos"
                    variant="warning"
                    data-testid="stat-total-targets"
                  />
                </Grid.Column>
                <Grid.Column>
                  <StatCard
                    icon={<TrendingUp style={{ width: '32px', height: '32px' }} />}
                    value={`${averageProgress}%`}
                    label="Progresso Médio"
                    variant="primary"
                    data-testid="stat-average-progress"
                  />
                </Grid.Column>
              </>
            )}
          </Grid>
        </div>

        {/* Goals List */}
        <div>
          <SectionHeader 
            title="Suas Metas"
            description={`${goals.length} metas cadastradas`}
            data-testid="goals-header"
          />
          
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            {goalsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : goals.length === 0 ? (
              <EmptyState
                icon={<Target style={{ width: '48px', height: '48px' }} />}
                title="Nenhuma meta encontrada"
                description="Comece criando sua primeira meta de estudo. Organize seus objetivos e acompanhe seu progresso."
                action={{
                  label: "Criar Primeira Meta",
                  onClick: () => openGoalModal()
                }}
                data-testid="empty-goals"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {goals.map((goal) => {
                  const goalTargets = getTargetsForGoal(goal.id);
                  const completionPercentage = getCompletionPercentage(goal);
                  const isExpanded = isGoalExpanded(goal.id);
                  
                  return (
                    <Card key={goal.id} className="transition-smooth hover-lift">
                      <Card.Content style={{ padding: 'var(--spacing-xl)' }}>
                        <div 
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleGoalExpanded(goal.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{
                                  padding: 'var(--spacing-sm)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: goal.completed ? 'rgba(19, 161, 14, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                                  color: goal.completed ? 'var(--nup-success)' : 'var(--nup-secondary)'
                                }}>
                                  {goal.completed ? (
                                    <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                                  ) : (
                                    <Flag style={{ width: '20px', height: '20px' }} />
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Header as="h3" style={{ 
                                    marginBottom: 'var(--spacing-xs)',
                                    textDecoration: goal.completed ? 'line-through' : 'none',
                                    color: goal.completed ? 'var(--nup-gray-500)' : 'var(--nup-gray-800)'
                                  }}>
                                    {goal.title}
                                  </Header>
                                  {goal.description && (
                                    <p style={{ fontSize: '14px', color: 'var(--nup-gray-600)' }}>
                                      {goal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: 'var(--spacing-xs)' }}>
                                  <span style={{ color: 'var(--nup-gray-600)' }}>Progresso</span>
                                  <span style={{ fontWeight: '500' }}>{completionPercentage}%</span>
                                </div>
                                <Progress 
                                  percent={completionPercentage} 
                                  color={goal.completed ? "green" : "blue"}
                                  size="small"
                                />
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginLeft: 'var(--spacing-md)' }}>
                              <Button
                                basic
                                icon="edit"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGoalModal(goal);
                                }}
                                data-testid={`button-edit-goal-${goal.id}`}
                                title={`Editar meta ${goal.title}`}
                              />
                              <Button
                                basic
                                icon="trash"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGoalMutation.mutate(goal.id);
                                }}
                                data-testid={`button-delete-goal-${goal.id}`}
                                title={`Excluir meta ${goal.title}`}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--nup-gray-200)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                              <Header as="h4">Objetivos ({goalTargets.length})</Header>
                              <Button 
                                primary
                                size="small"
                                icon="plus"
                                content="Adicionar Objetivo"
                                onClick={() => openTargetModal(goal.id)}
                              />
                            </div>
                            
                            {goalTargets.length === 0 ? (
                              <Message info>
                                <p>Nenhum objetivo definido para esta meta.</p>
                              </Message>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {goalTargets.map((target) => (
                                  <Segment key={target.id} style={{ padding: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                          <Button
                                            basic
                                            circular
                                            icon={target.completed ? "check circle" : "circle outline"}
                                            size="small"
                                            color={target.completed ? "green" : undefined}
                                            onClick={() => toggleTargetMutation.mutate({ 
                                              id: target.id, 
                                              completed: !target.completed 
                                            })}
                                          />
                                          <div>
                                            <p style={{ 
                                              fontWeight: '500',
                                              textDecoration: target.completed ? 'line-through' : 'none',
                                              color: target.completed ? 'var(--nup-gray-500)' : 'var(--nup-gray-800)'
                                            }}>
                                              {target.title}
                                            </p>
                                            {target.description && (
                                              <p style={{ fontSize: '12px', color: 'var(--nup-gray-600)' }}>
                                                {target.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {(target.targetValue || target.unit) && (
                                        <Label color="blue" size="small">
                                          {target.targetValue} {target.unit}
                                        </Label>
                                      )}
                                    </div>
                                  </Segment>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Goal Modal */}
        <Modal 
          open={isGoalModalOpen} 
          onClose={() => setIsGoalModalOpen(false)}
          size="small"
        >
          <Modal.Header>
            {selectedGoal ? "Editar Meta" : "Nova Meta"}
          </Modal.Header>
          <Modal.Content>
            <Form>
              <Form.Field required>
                <label>Título da Meta</label>
                <Input
                  placeholder="Ex: Passar no concurso SEFAZ-DF"
                  value={goalFormData.title}
                  onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                  data-testid="input-goal-title"
                />
              </Form.Field>
              
              <Form.Field>
                <label>Descrição (Opcional)</label>
                <TextArea
                  placeholder="Descreva sua meta..."
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                  data-testid="input-goal-description"
                />
              </Form.Field>
            </Form>
          </Modal.Content>
          <Modal.Actions>
            <Button 
              content="Cancelar"
              onClick={() => setIsGoalModalOpen(false)}
              data-testid="button-cancel-goal"
            />
            <Button
              primary
              content={selectedGoal ? "Atualizar Meta" : "Criar Meta"}
              loading={createGoalMutation.isPending || updateGoalMutation.isPending}
              onClick={handleGoalSubmit}
              data-testid="button-save-goal"
            />
          </Modal.Actions>
        </Modal>

        {/* Target Modal */}
        <Modal 
          open={isTargetModalOpen} 
          onClose={() => setIsTargetModalOpen(false)}
          size="small"
        >
          <Modal.Header>
            {selectedTarget ? "Editar Objetivo" : "Novo Objetivo"}
          </Modal.Header>
          <Modal.Content>
            <Form>
              <Form.Field required>
                <label>Título do Objetivo</label>
                <Input
                  placeholder="Ex: Estudar 2 horas de matemática por dia"
                  value={targetFormData.title}
                  onChange={(e) => setTargetFormData({ ...targetFormData, title: e.target.value })}
                  data-testid="input-target-title"
                />
              </Form.Field>
              
              <Form.Field>
                <label>Descrição (Opcional)</label>
                <TextArea
                  placeholder="Descreva seu objetivo..."
                  value={targetFormData.description}
                  onChange={(e) => setTargetFormData({ ...targetFormData, description: e.target.value })}
                  data-testid="input-target-description"
                />
              </Form.Field>
              
              <Form.Group widths="equal">
                <Form.Field>
                  <label>Meta Numérica</label>
                  <Input
                    placeholder="Ex: 100"
                    value={targetFormData.targetValue}
                    onChange={(e) => setTargetFormData({ ...targetFormData, targetValue: e.target.value })}
                    data-testid="input-target-value"
                  />
                </Form.Field>
                
                <Form.Field>
                  <label>Unidade</label>
                  <Input
                    placeholder="Ex: horas"
                    value={targetFormData.unit}
                    onChange={(e) => setTargetFormData({ ...targetFormData, unit: e.target.value })}
                    data-testid="input-target-unit"
                  />
                </Form.Field>
              </Form.Group>
            </Form>
          </Modal.Content>
          <Modal.Actions>
            <Button 
              content="Cancelar"
              onClick={() => setIsTargetModalOpen(false)}
              data-testid="button-cancel-target"
            />
            <Button
              primary
              content={selectedTarget ? "Atualizar Objetivo" : "Criar Objetivo"}
              loading={createTargetMutation.isPending}
              onClick={handleTargetSubmit}
              data-testid="button-save-target"
            />
          </Modal.Actions>
        </Modal>
      </Container>
    </div>
  );
}