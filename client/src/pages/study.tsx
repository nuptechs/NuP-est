import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import AiStudyModal from "@/components/study/ai-study-modal";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    queryKey: ["/api/materials", selectedSubject || undefined],
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
    <div className="min-h-screen bg-background">
      <main className="overflow-auto">
        <Header 
          title="Estudar" 
          subtitle="Escolha seu método de estudo e comece a praticar"
        />
        
        <div className="p-6 space-y-6">
          {/* Subject Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-graduation-cap mr-2 text-primary"></i>
                Configuração da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Selecione a matéria para estudar:
                </label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger data-testid="select-study-subject">
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
                <div className="text-sm text-muted-foreground">
                  <i className="fas fa-file-alt mr-1"></i>
                  {materials?.length || 0} material{materials?.length !== 1 ? 's' : ''} disponível{materials?.length !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Methods */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Métodos de Estudo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studyMethods.map((method, index) => (
                <Card key={index} className="hover-lift transition-all cursor-pointer" onClick={method.action}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 bg-${method.color}/10 rounded-lg flex items-center justify-center mr-4`}>
                          <i className={`fas ${method.icon} text-${method.color} text-xl`}></i>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{method.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                      <i className="fas fa-arrow-right text-muted-foreground"></i>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentSessions?.length ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-history text-muted-foreground"></i>
                  </div>
                  <p className="text-muted-foreground">Nenhuma sessão de estudo encontrada</p>
                  <p className="text-sm text-muted-foreground">Comece estudando para ver seu histórico aqui</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSessions?.slice(0, 5).map((session: any) => {
                    const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                    return (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 bg-${session.completed ? 'secondary' : 'muted'}/10 rounded-lg flex items-center justify-center mr-4`}>
                            <i className={`fas ${session.completed ? 'fa-check' : 'fa-clock'} text-${session.completed ? 'secondary' : 'muted-foreground'}`}></i>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {subject?.name || "Matéria não encontrada"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {session.duration} min - {session.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {session.completed && session.score && (
                            <p className="text-sm font-medium text-foreground">{session.score}%</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.startedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileNav />
      <DashboardIcon />
      
      <AiStudyModal 
        isOpen={isAiStudyOpen}
        onClose={() => setIsAiStudyOpen(false)}
        subjectId={selectedSubject}
      />
    </div>
  );
}
