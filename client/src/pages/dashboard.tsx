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

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimalista */}
      <header className="border-b border-gray-100 backdrop-blur-sm bg-white/95">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-black tracking-tight">NuP-Study</h1>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/api/logout'}
              className="text-gray-500 hover:text-black text-sm transition-colors duration-200 hover:bg-gray-50 rounded-lg px-3 py-2"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>
      {/* Conteúdo principal */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Saudação simples */}
        <div className="mb-20">
          <h2 className="text-4xl font-light text-black mb-3 tracking-tight">
            Olá, {user?.firstName || 'Estudante'}
          </h2>
          <p className="text-gray-600 text-xl leading-relaxed">
            {user?.studyProfile === 'disciplined' ? 'Continue mantendo sua disciplina.' :
             user?.studyProfile === 'undisciplined' ? 'Vamos encontrar seu ritmo.' :
             'Encontre seu equilíbrio nos estudos.'}
          </p>
        </div>

        {/* Setup necessário */}
        {!isSetupComplete && (
          <div className="mb-20 p-8 bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-medium text-black mb-6 tracking-tight">Configure seu ambiente</h3>
            <div className="space-y-4">
              {!hasSubjects && (
                <div className="flex items-center justify-between py-4 border-b border-gray-150 last:border-0 group">
                  <div>
                    <p className="font-medium text-black group-hover:text-gray-700 transition-colors">Matérias</p>
                    <p className="text-sm text-gray-500 mt-1">Defina o que você quer estudar</p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/subjects'}
                    variant="outline"
                    className="text-sm hover:bg-black hover:text-white transition-all duration-200 hover:shadow-sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
              {!hasGoals && (
                <div className="flex items-center justify-between py-4 border-b border-gray-150 last:border-0 group">
                  <div>
                    <p className="font-medium text-black group-hover:text-gray-700 transition-colors">Objetivos</p>
                    <p className="text-sm text-gray-500 mt-1">Estabeleça suas metas</p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/goals'}
                    variant="outline"
                    className="text-sm hover:bg-black hover:text-white transition-all duration-200 hover:shadow-sm"
                  >
                    Configurar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ferramentas principais */}
        <div className="space-y-8">
          <h3 className="text-xl font-medium text-black tracking-tight">Ferramentas de estudo</h3>
          
          <div className="grid gap-5">
            <button
              onClick={() => window.location.href = '/quiz'}
              className="group text-left p-8 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <h4 className="font-semibold text-black mb-2 group-hover:text-gray-700 transition-colors">Estudar com IA</h4>
              <p className="text-gray-500 text-base leading-relaxed">Questões personalizadas para seu perfil</p>
            </button>

            <button
              onClick={() => window.location.href = '/flashcards'}
              className="group text-left p-8 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <h4 className="font-semibold text-black mb-2 group-hover:text-gray-700 transition-colors">Flashcards</h4>
              <p className="text-gray-500 text-base leading-relaxed">Memorização com repetição espaçada</p>
            </button>

            <button
              onClick={() => window.location.href = '/knowledge-base'}
              className="group text-left p-8 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <h4 className="font-semibold text-black mb-2 group-hover:text-gray-700 transition-colors">Base de conhecimento</h4>
              <p className="text-gray-500 text-base leading-relaxed">Pesquise e organize seus conteúdos</p>
            </button>
          </div>
        </div>

        {/* Recursos secundários */}
        <div className="mt-16 pt-12 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => window.location.href = '/materials'}
              className="group text-left p-6 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
            >
              <h4 className="font-medium text-black text-base mb-2 group-hover:text-gray-700 transition-colors">Materiais</h4>
              <p className="text-gray-500 text-sm leading-relaxed">Organize seus recursos</p>
            </button>

            <button
              onClick={() => window.location.href = '/analytics'}
              className="group text-left p-6 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
            >
              <h4 className="font-medium text-black text-base mb-2 group-hover:text-gray-700 transition-colors">Progresso</h4>
              <p className="text-gray-500 text-sm leading-relaxed">Acompanhe sua evolução</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
