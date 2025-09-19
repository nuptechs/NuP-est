import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AiStudyModal from "@/components/study/ai-study-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Bot, BarChart3, Clock, Play, FileText, GraduationCap, History } from "lucide-react";
import type { Subject } from "@shared/schema";

export default function Study() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isAiStudyOpen, setIsAiStudyOpen] = useState(false);

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

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: materials } = useQuery<any[]>({
    queryKey: [`/api/materials?subjectId=${selectedSubject}`],
    enabled: isAuthenticated && !!selectedSubject,
  });

  const { data: recentSessions } = useQuery<any[]>({
    queryKey: ["/api/study-sessions"],
    enabled: isAuthenticated,
  });

  const handleStartAiStudy = () => {
    if (!selectedSubject) {
      toast({
        title: "Selecione uma matéria",
        description: "Escolha uma matéria para gerar questões personalizadas",
        variant: "destructive",
      });
      return;
    }

    const subjectMaterials = materials?.filter((m: any) => m.subjectId === selectedSubject);
    if (!subjectMaterials?.length) {
      toast({
        title: "Materiais necessários",
        description: "Adicione materiais para esta matéria antes de gerar questões",
        variant: "destructive",
      });
      return;
    }

    setIsAiStudyOpen(true);
  };

  const studyMethods = [
    {
      title: "Questões IA",
      description: "Questões personalizadas geradas pela IA com base em seus materiais",
      icon: "fa-robot",
      color: "primary",
      action: handleStartAiStudy,
    },
    {
      title: "Revisão de Conceitos",
      description: "Revise teoria e conceitos importantes das suas matérias",
      icon: "fa-book-open",
      color: "secondary",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
    {
      title: "Flashcards",
      description: "Sistema de repetição espaçada para memorização eficiente",
      icon: "fa-layer-group",
      color: "accent",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
    {
      title: "Simulados",
      description: "Provas completas para testar seu conhecimento",
      icon: "fa-clock",
      color: "destructive",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
  ];

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
    <div className="flex-1 p-6 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Estudar
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Escolha seu método de estudo e comece a praticar
          </p>
        </div>
        {/* Subject Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Configuração da Sessão
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Selecione a matéria para estudar:
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="border-gray-300 dark:border-gray-600" data-testid="select-study-subject">
                  <SelectValue placeholder="Escolha uma matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject: Subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: subject.color || '#666' }}
                        ></div>
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSubject && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <FileText className="h-4 w-4" />
                <span>
                  {materials?.length || 0} material{materials?.length !== 1 ? 's' : ''} disponível{materials?.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Study Methods */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Métodos de Estudo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
              onClick={handleStartAiStudy}
              data-testid="button-ai-study"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Questões IA</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Questões personalizadas geradas pela IA com base em seus materiais</p>
                  </div>
                </div>
                <Play className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
            
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors group opacity-75"
              onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revisão de Conceitos</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Revise teoria e conceitos importantes das suas matérias</p>
                  </div>
                </div>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">Em breve</div>
              </div>
            </div>
            
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors group opacity-75"
              onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Flashcards</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sistema de repetição espaçada para memorização eficiente</p>
                  </div>
                </div>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">Em breve</div>
              </div>
            </div>
            
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors group opacity-75"
              onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Simulados</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Provas completas para testar seu conhecimento</p>
                  </div>
                </div>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">Em breve</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sessões Recentes
            </h2>
          </div>
          
          {!recentSessions?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhuma sessão de estudo encontrada</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Comece estudando para ver seu histórico aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions?.slice(0, 5).map((session: any) => {
                const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        session.completed 
                          ? 'bg-green-50 dark:bg-green-950' 
                          : 'bg-orange-50 dark:bg-orange-950'
                      }`}>
                        {session.completed ? (
                          <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {subject?.name || "Matéria não encontrada"}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.duration} min • {session.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {session.completed && session.score && (
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{session.score}%</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <AiStudyModal 
        isOpen={isAiStudyOpen}
        onClose={() => setIsAiStudyOpen(false)}
        subjectId={selectedSubject}
      />
    </div>
  );
}
