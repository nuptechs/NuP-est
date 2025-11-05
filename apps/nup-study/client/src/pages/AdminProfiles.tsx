import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import UnifiedShell from "@/components/layout/unified-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@nup/ui";
import { 
  PlayCircle, 
  RefreshCw, 
  Eye, 
  TrendingUp, 
  Clock, 
  Award,
  Brain,
  MessageCircle,
  Target,
  Sparkles,
  Settings
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
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(60000);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <UnifiedShell>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </UnifiedShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Query: Get all enriched profiles
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<EnrichedProfile[]>({
    queryKey: ['/api/admin/student-profiles/all'],
    queryFn: async () => {
      const response = await fetch('/api/admin/student-profiles/all', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch profiles');
      }
      return response.json();
    },
  });

  // Mutation: Run backfill
  const backfillMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/student-profiles/backfill', null);
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
      return await apiRequest('POST', `/api/admin/student-profiles/${userId}/refresh`, null);
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

  // Query: Get user data (for autoRefreshInterval)
  const { data: userData } = useQuery<{ autoRefreshInterval: number }>({
    queryKey: ['/api/admin/users', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) throw new Error('No user selected');
      const response = await fetch(`/api/admin/users/${selectedUserId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!selectedUserId,
  });

  // Update local state when userData changes
  useEffect(() => {
    if (userData?.autoRefreshInterval) {
      setAutoRefreshInterval(userData.autoRefreshInterval);
    }
  }, [userData]);

  // Mutation: Update user config
  const updateConfigMutation = useMutation({
    mutationFn: async ({ userId, autoRefreshInterval }: { userId: string; autoRefreshInterval: number }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/config`, { autoRefreshInterval });
    },
    onSuccess: () => {
      toast({
        title: "Configuração atualizada!",
        description: "O intervalo de atualização foi salvo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  return (
    <UnifiedShell>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfis Processados</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-profiles">{profiles.length}</div>
              <p className="text-xs text-muted-foreground">
                Perfis enriquecidos disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Ativo</div>
              <p className="text-xs text-muted-foreground">
                Atualizações automáticas após exercícios, sessões e conversas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profiles List */}
        <Card>
          <CardHeader>
            <CardTitle>Perfis de Alunos</CardTitle>
            <CardDescription>
              Clique em um perfil para ver os detalhes completos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfiles ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {profiles.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="mb-2">Nenhum perfil processado ainda</p>
                      <p className="text-sm">Clique em "Processar Todos" para gerar os perfis</p>
                    </div>
                  ) : (
                    profiles.map((profile) => (
                    <div
                      key={profile.userId}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      data-testid={`card-profile-${profile.userId}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">ID: {profile.userId}</p>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          {profile.overallAccuracy !== null && profile.overallAccuracy !== undefined && (
                            <span>Precisão: {(Number(profile.overallAccuracy) * 100).toFixed(0)}%</span>
                          )}
                          {profile.totalStudyHours !== null && profile.totalStudyHours !== undefined && (
                            <span>Horas: {Number(profile.totalStudyHours).toFixed(1)}h</span>
                          )}
                          {profile.studyStreak !== null && profile.studyStreak > 0 && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {profile.studyStreak} dias
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserId(profile.userId)}
                              data-testid={`button-view-profile-${profile.userId}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
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
                                  <>
                                    <div>
                                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        Última Conversa
                                      </h3>
                                      <p className="text-sm bg-muted p-3 rounded-lg">
                                        {selectedProfile.lastConversationSummary}
                                      </p>
                                    </div>
                                    <Separator />
                                  </>
                                )}

                                {/* User Configuration */}
                                <div>
                                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Configurações
                                  </h3>
                                  <div className="space-y-4">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium">
                                          Intervalo de Atualização Automática
                                        </label>
                                        <span className="text-sm text-muted-foreground">
                                          {autoRefreshInterval / 1000}s
                                        </span>
                                      </div>
                                      <Slider
                                        value={[autoRefreshInterval]}
                                        onValueChange={(value) => setAutoRefreshInterval(value[0])}
                                        min={5000}
                                        max={300000}
                                        step={5000}
                                        className="mb-2"
                                        data-testid="slider-auto-refresh"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Define o intervalo de atualização automática do plano de estudos (5s - 300s)
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (selectedUserId) {
                                          updateConfigMutation.mutate({
                                            userId: selectedUserId,
                                            autoRefreshInterval,
                                          });
                                        }
                                      }}
                                      disabled={updateConfigMutation.isPending}
                                      data-testid="button-save-config"
                                    >
                                      {updateConfigMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
                                    </Button>
                                  </div>
                                </div>

                                <Separator />

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
                          onClick={() => refreshMutation.mutate(profile.userId)}
                          disabled={refreshMutation.isPending}
                          data-testid={`button-refresh-${profile.userId}`}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedShell>
  );
}
