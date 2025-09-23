import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AiStudyModal from "@/components/study/ai-study-modal";
// Removed Semantic UI imports - migrating to shadcn/ui
import { BookOpen, Bot, BarChart3, Clock, Play, FileText, GraduationCap, History, ChevronDown } from "lucide-react";
// Modern shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
// Professional components  
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProfessionalShell
      title="Estudar"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Estudar', href: '/study' }
      ]}
    >
        {/* Page Introduction */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Métodos de Estudo</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Escolha seu método de estudo e comece a praticar
          </p>
        </div>
        {/* Subject Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span>Configuração da Sessão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="subject-select">
                Selecione a matéria para estudar:
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} data-testid="select-study-subject">
                <SelectTrigger id="subject-select">
                  <SelectValue placeholder="Escolha uma matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject: Subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color || '#666' }}
                        />
                        <span>{subject.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSubject && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  {materials?.length || 0} material{materials?.length !== 1 ? 's' : ''} disponível{materials?.length !== 1 ? 's' : ''}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Study Methods */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Métodos de Estudo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfessionalCard
              title="Questões IA"
              description="Questões personalizadas geradas pela IA com base em seus materiais"
              icon={<Bot className="w-6 h-6" />}
              variant="elevated"
              onClick={handleStartAiStudy}
              className="cursor-pointer transition-all hover:shadow-md"
              data-testid="button-ai-study"
              actions={
                <Play className="w-5 h-5 text-muted-foreground" />
              }
            />
            
            <ProfessionalCard
              title="Revisão de Conceitos"
              description="Revise teoria e conceitos importantes das suas matérias"
              icon={<BookOpen className="w-6 h-6" />}
              variant="outline"
              onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
              className="cursor-pointer opacity-75 transition-all hover:opacity-90"
              data-testid="button-concept-review"
              actions={
                <Badge variant="secondary" className="text-xs">Em breve</Badge>
              }
            />
            
            <ProfessionalCard
              title="Flashcards"
              description="Sistema de repetição espaçada para memorização eficiente"
              icon={<BarChart3 className="w-6 h-6" />}
              variant="elevated"
              onClick={() => window.location.href = '/flashcards'}
              className="cursor-pointer transition-all hover:shadow-md"
              data-testid="button-flashcards"
              actions={
                <Play className="w-5 h-5 text-muted-foreground" />
              }
            />
            
            <ProfessionalCard
              title="Simulados"
              description="Provas completas para testar seu conhecimento"
              icon={<Clock className="w-6 h-6" />}
              variant="outline"
              onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
              className="cursor-pointer opacity-75 transition-all hover:opacity-90"
              data-testid="button-simulados"
              actions={
                <Badge variant="outline" className="text-xs">Em breve</Badge>
              }
            />
          </div>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <span>Sessões Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentSessions?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="w-12 h-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">
                  Nenhuma sessão de estudo encontrada
                </h4>
                <p className="text-muted-foreground">
                  Comece estudando para ver seu histórico aqui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions?.slice(0, 5).map((session: any) => {
                  const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                  return (
                    <Card key={session.id} className="p-4 border-l-4" style={{
                      borderLeftColor: session.completed ? '#10b981' : '#f59e0b'
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            session.completed 
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {session.completed ? (
                              <BarChart3 className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h5 className="font-semibold text-foreground">
                              {subject?.name || "Matéria não encontrada"}
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {session.duration} min • {session.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {session.completed && session.score && (
                            <p className="text-sm font-semibold text-foreground">{session.score}%</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.startedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      
      <AiStudyModal 
        isOpen={isAiStudyOpen}
        onClose={() => setIsAiStudyOpen(false)}
        subjectId={selectedSubject}
      />
    </ProfessionalShell>
  );
}
