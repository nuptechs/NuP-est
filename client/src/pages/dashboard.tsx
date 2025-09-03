import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronRight, User, BookOpen, Target, Brain, MessageSquare, Zap, FileText, BarChart3, Clock, Lightbulb, Trophy, Settings, Search, Plus } from "lucide-react";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

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

  const hasSubjects = (subjects?.length || 0) > 0;
  const hasGoals = (goals?.length || 0) > 0;
  const isSetupComplete = hasSubjects && hasGoals;

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="overflow-auto">
        <Header 
          title="Dashboard" 
          subtitle="Bem-vindo ao seu hub de estudos personalizado"
        />

        {/* Conteúdo principal */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Saudação */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-gray-900 mb-2">
            Olá, {user?.firstName || 'Estudante'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {user?.studyProfile === 'disciplined' ? 'Continue mantendo sua disciplina.' :
             user?.studyProfile === 'undisciplined' ? 'Vamos encontrar seu ritmo.' :
             'Encontre seu equilíbrio nos estudos.'}
          </p>
        </div>

        {/* 3 Blocos Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* 1. QUEM SOU EU HOJE? */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Quem sou eu hoje?</h3>
              </div>
              
              <div className="space-y-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex justify-between text-xs sm:text-sm w-full hover:bg-gray-50 p-2 rounded transition-colors">
                      <span className="text-gray-600">Perfil de estudo</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {user?.studyProfile === 'disciplined' ? 'Disciplinado' :
                         user?.studyProfile === 'undisciplined' ? 'Livre' : 'Equilibrado'}
                      </span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Atualizar perfil de estudo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você deseja refazer o mapeamento do seu perfil de estudo? Isso pode ajudar a personalizar ainda mais sua experiência de aprendizado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => window.location.href = '/onboarding?mode=edit'}>
                        Atualizar perfil
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Matérias ativas</span>
                  <span className="font-medium text-gray-900">{subjects?.length || 0}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Horas hoje</span>
                  <span className="font-medium text-gray-900">{stats?.todayHours || 0}h</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Questões resolvidas</span>
                  <span className="font-medium text-gray-900">{stats?.questionsGenerated || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. ESTUDAR */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Estudar</h3>
              </div>
              
              <div className="space-y-2">
                {/* Preparar */}
                <div className="border border-gray-100 rounded-lg">
                  <button
                    onClick={() => toggleSection('preparar')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">Preparar</span>
                    <ChevronRight 
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedSection === 'preparar' ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSection === 'preparar' && (
                    <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
                      <button
                        onClick={() => window.location.href = '/knowledge-base'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Base de conhecimento</span>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/subjects'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Matérias</span>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/materials'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <Lightbulb className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Materiais</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Avançar */}
                <div className="border border-gray-100 rounded-lg">
                  <button
                    onClick={() => toggleSection('avancar')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">Avançar</span>
                    <ChevronRight 
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedSection === 'avancar' ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSection === 'avancar' && (
                    <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
                      <button
                        onClick={() => window.location.href = '/quiz'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <Brain className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Questões IA</span>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/study'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Chat IA</span>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/flashcards'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <Zap className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Flashcards</span>
                      </button>
                      
                      <button
                        onClick={() => alert('Em breve: Simulados')}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Simulados</span>
                      </button>
                      
                      <button
                        onClick={() => alert('Em breve: Revisão')}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Revisão</span>
                      </button>
                      
                      <button
                        onClick={() => window.location.href = '/analytics'}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors"
                      >
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Progresso</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. QUEM QUERO SER */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Quem quero ser</h3>
              </div>
              
              <div className="space-y-3">
                {goals && goals.length > 0 ? (
                  goals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-900">{goal.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{goal.description}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-purple-600 h-1.5 rounded-full" 
                          style={{ width: `${goal.completed ? 100 : 20}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">Defina seus objetivos</p>
                    <Button
                      onClick={() => window.location.href = '/goals'}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Criar Meta
                    </Button>
                  </div>
                )}
                
                {goals && goals.length > 0 && (
                  <Button
                    onClick={() => window.location.href = '/goals'}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-gray-500 hover:text-gray-700"
                  >
                    Ver todas as metas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Setup necessário */}
        {!isSetupComplete && (
          <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-900 mb-4">Configure seu ambiente de estudos</h3>
            <div className="space-y-3">
              {!hasSubjects && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">Adicione suas matérias de estudo</span>
                  <Button
                    onClick={() => window.location.href = '/subjects'}
                    variant="outline"
                    size="sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
              {!hasGoals && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">Defina seus objetivos de aprendizado</span>
                  <Button
                    onClick={() => window.location.href = '/goals'}
                    variant="outline"
                    size="sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ícone de engrenagem fixo no canto inferior direito */}
        <div className="fixed bottom-6 right-6 z-50">
          <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-admin-settings"
              >
                <Settings className="h-5 w-5 text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurações Administrativas</DialogTitle>
                <DialogDescription>
                  Gerencie as configurações avançadas do sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setIsAdminDialogOpen(false);
                    window.location.href = '/admin/search-config';
                  }}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-configure-searches"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Configurar buscas
                </Button>
                
                <Button
                  onClick={() => {
                    setIsAdminDialogOpen(false);
                    alert('Funcionalidade futura');
                  }}
                  variant="outline"
                  className="w-full justify-start opacity-50"
                  disabled
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Outras funções (em breve)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
