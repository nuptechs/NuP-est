import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Target, BookOpen, FileText, Zap, TrendingUp, Clock, Award } from "lucide-react";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

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

  const getProfileEmoji = () => {
    switch (user?.studyProfile) {
      case "disciplined": return "🎯";
      case "undisciplined": return "🌟";
      default: return "⚖️";
    }
  };

  const getProfileMessage = () => {
    switch (user?.studyProfile) {
      case "disciplined": return "Mantenha sua disciplina! Vamos continuar o bom trabalho.";
      case "undisciplined": return "Vamos criar uma rotina que funcione para você!";
      default: return "Encontre seu ritmo ideal de estudos!";
    }
  };

  const setupSteps = [
    {
      title: "Defina suas Matérias",
      description: "Configure as disciplinas que você quer estudar",
      completed: (subjects?.length || 0) > 0,
      action: "/subjects",
      icon: BookOpen,
      color: "bg-blue-500"
    },
    {
      title: "Estabeleça Objetivos",
      description: "Crie metas de estudo para se manter motivado",
      completed: (goals?.length || 0) > 0,
      action: "/goals",
      icon: Target,
      color: "bg-green-500"
    },
    {
      title: "Adicione Materiais",
      description: "Organize seus materiais de estudo",
      completed: false, // Vamos verificar isso
      action: "/materials",
      icon: FileText,
      color: "bg-purple-500"
    }
  ];

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const isSetupComplete = completedSteps === setupSteps.length;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">NuP-est</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/api/logout'}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{getProfileEmoji()}</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Olá, {user?.firstName || 'Estudante'}!
            </h2>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">{getProfileMessage()}</p>
        </div>

        {/* Setup Progress */}
        {!isSetupComplete && (
          <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
                <Clock className="h-5 w-5" />
                <span>Configure seu Ambiente de Estudos</span>
              </CardTitle>
              <p className="text-orange-700 dark:text-orange-300">
                Complete estes passos para ter a melhor experiência de estudos
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-700 dark:text-orange-300">
                    Progresso: {completedSteps} de {setupSteps.length}
                  </span>
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    {Math.round((completedSteps / setupSteps.length) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(completedSteps / setupSteps.length) * 100} 
                  className="h-2"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {setupSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        step.completed 
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 bg-white dark:bg-gray-800 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${step.color} ${step.completed ? 'opacity-100' : 'opacity-60'}`}>
                          <step.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold text-sm ${
                            step.completed ? 'text-green-800 dark:text-green-200' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {step.title}
                            {step.completed && <span className="ml-2">✓</span>}
                          </h3>
                          <p className={`text-xs mt-1 ${
                            step.completed ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                          {!step.completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 text-xs"
                              onClick={() => window.location.href = step.action}
                            >
                              Configurar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.subjects || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Matérias</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.todayHours || 0}h
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hoje</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.questionsGenerated || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Questões IA</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Target className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.goalProgress || '0'}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Objetivos</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards - Ferramentas de Estudo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/quiz'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Estudar com IA</CardTitle>
              <p className="text-muted-foreground">
                Questões personalizadas baseadas no seu perfil
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                ✨ Recomendado para {user?.studyProfile === 'disciplined' ? 'Disciplinados' : user?.studyProfile === 'undisciplined' ? 'Flexíveis' : 'Equilibrados'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/flashcards'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Flashcards</CardTitle>
              <p className="text-muted-foreground">
                Memorização inteligente com repetição espaçada
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                🧠 Revisão Ativa
              </Badge>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/knowledge-base'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Base de Conhecimento</CardTitle>
              <p className="text-muted-foreground">
                Organize e pesquise todo seu conteúdo
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                📚 Centralizado
              </Badge>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/analytics'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Progresso</CardTitle>
              <p className="text-muted-foreground">
                Acompanhe sua evolução e métricas
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                📊 Analytics
              </Badge>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/materials'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Materiais</CardTitle>
              <p className="text-muted-foreground">
                Gerencie PDFs, vídeos e recursos
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                📁 Organizado
              </Badge>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                onClick={() => window.location.href = '/goals'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Objetivos</CardTitle>
              <p className="text-muted-foreground">
                Defina e alcance suas metas de estudo
              </p>
            </CardHeader>
            <CardContent>
              <Badge className="w-full justify-center bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                🎯 Foco
              </Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
