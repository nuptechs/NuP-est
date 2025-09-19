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

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Olá, {user?.firstName || 'Estudante'}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bem-vindo ao seu hub de estudos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/library?create=material')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-upload-material"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Material
          </Button>
        </div>
      </div>

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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4 hover:bg-blue-50 hover:border-blue-200"
                onClick={() => navigate('/library')}
                data-testid="button-manage-library"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Biblioteca</p>
                    <p className="text-xs text-gray-500">{subjects?.length || 0} matérias</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto p-4 hover:bg-green-50 hover:border-green-200"
                onClick={() => navigate('/goals')}
                data-testid="button-manage-goals"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Metas</p>
                    <p className="text-xs text-gray-500">{goals?.length || 0} definidas</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto p-4 hover:bg-purple-50 hover:border-purple-200"
                onClick={() => navigate('/analytics')}
                data-testid="button-view-analytics"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Analytics</p>
                    <p className="text-xs text-gray-500">Ver progresso</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto p-4 hover:bg-amber-50 hover:border-amber-200"
                onClick={() => navigate('/ai-assistant')}
                data-testid="button-ai-assistant"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Brain className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">AI Assistant</p>
                    <p className="text-xs text-gray-500">Ajuda inteligente</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile & Progress */}
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
    </div>
  );
}