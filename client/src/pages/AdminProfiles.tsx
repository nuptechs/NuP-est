import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  PlayCircle, 
  RefreshCw, 
  Eye, 
  Users, 
  TrendingUp, 
  Clock, 
  Award,
  Brain,
  MessageCircle,
  Target,
  Sparkles
} from "lucide-react";

interface EnrichedProfile {
  id: string;
  userId: string;
  overallAccuracy: number | null;
  totalStudyHours: number | null;
  weeklyProgress: any;
  monthlyProgress: any;
  strongSubjects: string[];
  weakSubjects: string[];
  currentFocus: string | null;
  studyStreak: number | null;
  preferredStudyTime: string | null;
  avgSessionDuration: number | null;
  engagementLevel: string | null;
  improvementTrend: string | null;
  nextRecommendedTopics: string[];
  recommendedActions: string[];
  motivationalMessage: string | null;
  lastConversationSummary: string | null;
  recentDifficulties: string[];
  masteredConcepts: string[];
  conversationCount: number | null;
  updatedAt: string;
}

export default function AdminProfiles() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Query: Get all users (simplified - you may need to create this endpoint)
  const { data: users = [] } = useQuery<Array<{ id: string; username?: string; email?: string }>>({
    queryKey: ['/api/users'],
  });

  // Mutation: Run backfill
  const backfillMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/student-profiles/backfill', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Backfill iniciado!",
        description: `Processando ${data.total} usuários em background. Acompanhe o progresso nos logs.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar backfill",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Mutation: Refresh single user
  const refreshMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/student-profiles/${userId}/refresh`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "O perfil está sendo processado em background.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/student-profiles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Query: Get enriched profile for selected user
  const { data: selectedProfile, isLoading: isLoadingProfile } = useQuery<EnrichedProfile>({
    queryKey: ['/api/admin/student-profiles', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) throw new Error('No user selected');
      const response = await fetch(`/api/admin/student-profiles/${selectedUserId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!selectedUserId,
  });

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Perfis de Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie e visualize perfis enriquecidos dos alunos
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            data-testid="button-run-backfill"
          >
            {backfillMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Processar Todos
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Usuários cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sistema</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Student Profile Engine</div>
              <p className="text-xs text-muted-foreground">
                Análise automática de perfis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Ativo</div>
              <p className="text-xs text-muted-foreground">
                Atualizações automáticas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              <strong>Processamento Automático:</strong> Perfis são atualizados automaticamente após:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Resposta a exercícios</li>
              <li>Conclusão de sessões de estudo</li>
              <li>Conversas com Professor IA</li>
            </ul>
            <p className="mt-4">
              <strong>Botão "Processar Todos":</strong> Use para processar usuários existentes pela primeira vez ou recalcular todos os perfis.
            </p>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              Clique em um usuário para ver o perfil enriquecido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      data-testid={`card-user-${user.id}`}
                    >
                      <div>
                        <p className="font-medium">{user.username || user.email || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserId(user.id)}
                              data-testid={`button-view-profile-${user.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Perfil
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Perfil Enriquecido</DialogTitle>
                              <DialogDescription>
                                Análise completa do progresso do aluno
                              </DialogDescription>
                            </DialogHeader>
                            
                            {isLoadingProfile ? (
                              <div className="flex items-center justify-center py-12">
                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : !selectedProfile ? (
                              <div className="text-center py-12 text-muted-foreground">
                                <p>Perfil não encontrado</p>
                                <p className="text-sm mt-2">Execute "Processar Todos" para criar perfis</p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {/* Metrics */}
                                <div>
                                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Métricas Gerais
                                  </h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-muted">
                                      <p className="text-sm text-muted-foreground">Acurácia</p>
                                      <p className="text-2xl font-bold">
                                        {selectedProfile.overallAccuracy !== null 
                                          ? `${(selectedProfile.overallAccuracy * 100).toFixed(1)}%`
                                          : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted">
                                      <p className="text-sm text-muted-foreground">Horas de Estudo</p>
                                      <p className="text-2xl font-bold">
                                        {selectedProfile.totalStudyHours !== null
                                          ? `${selectedProfile.totalStudyHours.toFixed(1)}h`
                                          : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted">
                                      <p className="text-sm text-muted-foreground">Sequência</p>
                                      <p className="text-2xl font-bold">
                                        {selectedProfile.studyStreak || 0} dias
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted">
                                      <p className="text-sm text-muted-foreground">Conversas</p>
                                      <p className="text-2xl font-bold">
                                        {selectedProfile.conversationCount || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Subjects */}
                                <div>
                                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Award className="h-4 w-4" />
                                    Matérias
                                  </h3>
                                  <div className="space-y-2">
                                    {selectedProfile.strongSubjects.length > 0 && (
                                      <div>
                                        <p className="text-sm text-muted-foreground mb-1">Fortes:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {selectedProfile.strongSubjects.map((subject, i) => (
                                            <Badge key={i} variant="default">{subject}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {selectedProfile.weakSubjects.length > 0 && (
                                      <div>
                                        <p className="text-sm text-muted-foreground mb-1">Para melhorar:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {selectedProfile.weakSubjects.map((subject, i) => (
                                            <Badge key={i} variant="outline">{subject}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Recommendations */}
                                {selectedProfile.recommendedActions.length > 0 && (
                                  <>
                                    <div>
                                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Recomendações
                                      </h3>
                                      <ul className="space-y-2">
                                        {selectedProfile.recommendedActions.map((action, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <span className="text-primary mt-1">→</span>
                                            <span>{action}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <Separator />
                                  </>
                                )}

                                {/* Last Conversation */}
                                {selectedProfile.lastConversationSummary && (
                                  <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                      <MessageCircle className="h-4 w-4" />
                                      Última Conversa
                                    </h3>
                                    <p className="text-sm bg-muted p-3 rounded-lg">
                                      {selectedProfile.lastConversationSummary}
                                    </p>
                                  </div>
                                )}

                                {/* Update Info */}
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  Atualizado: {new Date(selectedProfile.updatedAt).toLocaleString('pt-BR')}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshMutation.mutate(user.id)}
                          disabled={refreshMutation.isPending}
                          data-testid={`button-refresh-${user.id}`}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
