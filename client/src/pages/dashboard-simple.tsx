import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, BookOpen, Target } from "lucide-react";
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Olá, {user?.firstName || 'Estudante'}! Bem-vindo ao seu hub de estudos.</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 - Perfil */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Perfil</h3>
            </div>
            <p className="text-sm text-gray-600">
              Perfil: {user?.studyProfile || 'Não definido'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2 - Matérias */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Matérias</h3>
            </div>
            <p className="text-sm text-gray-600">
              {subjects?.length || 0} matérias configuradas
            </p>
            <Button
              onClick={() => navigate('/library')}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Ver Biblioteca
            </Button>
          </CardContent>
        </Card>

        {/* Card 3 - Metas */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Metas</h3>
            </div>
            <p className="text-sm text-gray-600">
              {goals?.length || 0} metas definidas
            </p>
            <Button
              onClick={() => navigate('/goals')}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Gerenciar Metas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estatísticas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.subjects}</p>
              <p className="text-sm text-blue-700">Matérias</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.todayHours}h</p>
              <p className="text-sm text-green-700">Horas hoje</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.questionsGenerated}</p>
              <p className="text-sm text-purple-700">Questões</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{stats.goalProgress}%</p>
              <p className="text-sm text-amber-700">Progresso</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}