import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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

  // Redirect to home if not authenticated or profile not mapped
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
    
    // SEMPRE verificar se o usuário tem perfil mapeado PRIMEIRO
    if (isAuthenticated && user && !user.studyProfile) {
      window.location.href = "/onboarding";
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const hasSubjects = (subjects?.length || 0) > 0;
  const hasGoals = (goals?.length || 0) > 0;
  const isSetupComplete = hasSubjects && hasGoals;

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
    <div className="min-h-screen bg-white">
      {/* Header minimalista */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-black">NuP-est</h1>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/api/logout'}
              className="text-gray-500 hover:text-black text-sm"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Saudação simples */}
        <div className="mb-16">
          <h2 className="text-3xl font-light text-black mb-2">
            Olá, {user?.firstName || 'Estudante'}
          </h2>
          <p className="text-gray-500 text-lg">
            {user?.studyProfile === 'disciplined' ? 'Continue mantendo sua disciplina.' :
             user?.studyProfile === 'undisciplined' ? 'Vamos encontrar seu ritmo.' :
             'Encontre seu equilíbrio nos estudos.'}
          </p>
        </div>

        {/* Setup necessário */}
        {!isSetupComplete && (
          <div className="mb-16 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-black mb-4">Configure seu ambiente</h3>
            <div className="space-y-3">
              {!hasSubjects && (
                <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-medium text-black">Matérias</p>
                    <p className="text-sm text-gray-500">Defina o que você quer estudar</p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/subjects'}
                    variant="outline"
                    className="text-sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
              {!hasGoals && (
                <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-medium text-black">Objetivos</p>
                    <p className="text-sm text-gray-500">Estabeleça suas metas</p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/goals'}
                    variant="outline"
                    className="text-sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ferramentas principais */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-black">Ferramentas de estudo</h3>
          
          <div className="grid gap-4">
            <button
              onClick={() => window.location.href = '/quiz'}
              className="text-left p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-black mb-1">Estudar com IA</h4>
              <p className="text-gray-500 text-sm">Questões personalizadas para seu perfil</p>
            </button>

            <button
              onClick={() => window.location.href = '/flashcards'}
              className="text-left p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-black mb-1">Flashcards</h4>
              <p className="text-gray-500 text-sm">Memorização com repetição espaçada</p>
            </button>

            <button
              onClick={() => window.location.href = '/knowledge-base'}
              className="text-left p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-black mb-1">Base de conhecimento</h4>
              <p className="text-gray-500 text-sm">Pesquise e organize seus conteúdos</p>
            </button>
          </div>
        </div>

        {/* Recursos secundários */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/materials'}
              className="text-left p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-medium text-black text-sm mb-1">Materiais</h4>
              <p className="text-gray-500 text-xs">Organize seus recursos</p>
            </button>

            <button
              onClick={() => window.location.href = '/analytics'}
              className="text-left p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-medium text-black text-sm mb-1">Progresso</h4>
              <p className="text-gray-500 text-xs">Acompanhe sua evolução</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
