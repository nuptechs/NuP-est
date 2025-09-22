import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  Brain, 
  Plus,
  ArrowRight,
  BarChart3,
  Calendar,
  Trophy
} from "lucide-react";
import TeamsShell from "@/components/layout/teams-shell";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery<{
    subjects: string;
    todayHours: number;
    questionsGenerated: string;
    goalProgress: string;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500 text-lg font-light">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const breadcrumbs = [
    { label: "Dashboard" }
  ];

  const primaryActions = (
    <Button 
      onClick={() => navigate('/library?create=material')}
      size="sm"
      data-testid="button-upload-material"
    >
      <Plus className="w-4 h-4 mr-2" />
      Novo Material
    </Button>
  );

  return (
    <TeamsShell 
      title="Dashboard" 
      subtitle="Visão geral dos seus estudos e progresso"
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.subjects}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Matérias</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.todayHours}h</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Hoje</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.questionsGenerated}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Questões IA</p>
                  </div>
                  <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.goalProgress}%</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Progresso</p>
                  </div>
                  <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="col-span-2 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/library')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Biblioteca</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Organize materiais, crie áreas de conhecimento e gerencie conteúdo
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Ver biblioteca</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
                <BookOpen className="w-12 h-12 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Seu Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{user?.firstName || 'Estudante'}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {user?.studyProfile === 'disciplined' && 'Disciplinado'}
                  {user?.studyProfile === 'undisciplined' && 'Flexível'}
                  {user?.studyProfile === 'average' && 'Balanceado'}
                  {!user?.studyProfile && 'Perfil não definido'}
                </p>
              </div>
              
              {stats && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progresso das Metas</span>
                      <span className="text-gray-900 font-medium">{stats.goalProgress}%</span>
                    </div>
                    <Progress value={parseInt(stats.goalProgress)} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Subjects */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Matérias Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subjects && subjects.length > 0 ? (
                <div className="space-y-3">
                  {subjects.slice(0, 3).map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => navigate(`/library?subject=${subject.id}`)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{subject.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{subject.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Prioridade {subject.priority}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhuma matéria adicionada</p>
                  <Button size="sm" onClick={() => navigate('/library')} className="mt-2">
                    Adicionar matéria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Goals */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Metas Ativas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goals && goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.slice(0, 3).map((goal) => (
                    <div
                      key={goal.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => navigate('/goals')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{goal.title}</p>
                        <Target className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">
                          {goal.description || 'Meta sem descrição'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhuma meta criada</p>
                  <Button size="sm" onClick={() => navigate('/goals')} className="mt-2">
                    Criar meta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TeamsShell>
  );
}