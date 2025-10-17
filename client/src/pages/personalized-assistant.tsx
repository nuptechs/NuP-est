import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePersonalizedAssistant } from "@/hooks/usePersonalizedAssistant";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppShell from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  MessageSquare, 
  HelpCircle, 
  Lightbulb, 
  GraduationCap, 
  User,
  BookOpen,
  Target,
  Loader2
} from "lucide-react";
import type { Subject } from "@shared/schema";
import AdaptiveQuestions from "@/components/personalized-assistant/adaptive-questions";
import AdaptiveAssessment from "@/components/personalized-assistant/adaptive-assessment";
import AssistantChat from "@/components/personalized-assistant/assistant-chat";
import StudentProfileView from "@/components/personalized-assistant/student-profile-view";

export default function PersonalizedAssistantPage() {
  const { toast } = useToast();
  const { assistant, profile, isLoading: assistantLoading, hasAssistant, createAssistant } = usePersonalizedAssistant();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [activeTab, setActiveTab] = useState("questions");

  // Auto-create assistant if it doesn't exist
  useEffect(() => {
    if (!assistantLoading && !hasAssistant && !createAssistant.isPending) {
      createAssistant.mutate({});
    }
  }, [assistantLoading, hasAssistant, createAssistant]);

  // Buscar matérias do usuário
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
  });

  // Buscar tópicos da matéria selecionada
  const { data: topics = [] } = useQuery<any[]>({
    queryKey: ['/api/topics', selectedSubject],
    enabled: !!selectedSubject,
  });

  if (assistantLoading) {
    return (
      <AppShell title="Assistente Personalizado">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando seu assistente...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Assistente Personalizado">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header com informações do assistente */}
        <Card data-testid="card-assistant-header">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl" data-testid="text-assistant-name">
                    {assistant?.name || "Meu Assistente IA"}
                  </CardTitle>
                  <CardDescription data-testid="text-assistant-description">
                    Personalizado para seu estilo de aprendizado
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" data-testid="badge-personality">
                  {assistant?.personality || "friendly"}
                </Badge>
                <Badge variant="outline" data-testid="badge-communication-style">
                  {assistant?.communicationStyle || "simple"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Perfil do estudante */}
        {profile && (
          <Card data-testid="card-student-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seu Perfil de Aprendizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Objetivo Principal</p>
                  <p className="text-lg font-semibold" data-testid="text-primary-goal">
                    {profile.primaryGoal}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Versão do Perfil</p>
                  <p className="text-lg font-semibold" data-testid="text-profile-version">
                    v{profile.version}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={profile.isActive ? "default" : "secondary"} data-testid="badge-profile-status">
                    {profile.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seleção de Matéria/Tópico */}
        <Card data-testid="card-subject-selection">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Selecione o Conteúdo
            </CardTitle>
            <CardDescription>
              Escolha a matéria e tópico para estudar com seu assistente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Matéria</label>
                <Select
                  value={selectedSubject}
                  onValueChange={(value) => {
                    setSelectedSubject(value);
                    setSelectedTopic("");
                  }}
                >
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Selecione uma matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id} data-testid={`select-item-subject-${subject.id}`}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tópico (opcional)</label>
                <Select
                  value={selectedTopic}
                  onValueChange={setSelectedTopic}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger data-testid="select-topic">
                    <SelectValue placeholder="Selecione um tópico" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id} data-testid={`select-item-topic-${topic.id}`}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedSubject && (
              <div className="flex gap-2 pt-2">
                <Badge variant="secondary" data-testid="badge-selected-subject">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {subjects.find(s => s.id === selectedSubject)?.name}
                </Badge>
                {selectedTopic && (
                  <Badge variant="secondary" data-testid="badge-selected-topic">
                    <Target className="h-3 w-3 mr-1" />
                    {topics.find((t: any) => t.id === selectedTopic)?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs de funcionalidades */}
        {assistant?.id && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="questions" data-testid="tab-questions" disabled={!selectedSubject}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Perguntas
              </TabsTrigger>
              <TabsTrigger value="assessment" data-testid="tab-assessment" disabled={!selectedSubject}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Avaliação
              </TabsTrigger>
              <TabsTrigger value="chat" data-testid="tab-chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-6">
              {selectedSubject ? (
                <AdaptiveQuestionsPanel 
                  assistantId={assistant?.id || ""}
                  subjectId={selectedSubject}
                  topicId={selectedTopic}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Selecione uma matéria para gerar perguntas</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assessment" className="mt-6">
              {selectedSubject ? (
                <AdaptiveAssessmentPanel
                  assistantId={assistant?.id || ""}
                  subjectId={selectedSubject}
                  topicId={selectedTopic}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Selecione uma matéria para iniciar avaliação</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="chat" className="mt-6">
              <AssistantChatPanel
                assistantId={assistant?.id || ""}
                subjectId={selectedSubject}
              />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <StudentProfilePanel profile={profile} />
            </TabsContent>
          </Tabs>
        )}

        {/* Mensagem quando não há matéria selecionada */}
        {!selectedSubject && (
          <Card data-testid="card-no-subject-selected">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione uma Matéria</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Escolha uma matéria acima para começar a estudar com seu assistente personalizado
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// Componente de Perguntas Adaptativas
function AdaptiveQuestionsPanel({ assistantId, subjectId, topicId }: { 
  assistantId: string; 
  subjectId: string; 
  topicId?: string; 
}) {
  return <AdaptiveQuestions assistantId={assistantId} subjectId={subjectId} topicId={topicId} />;
}

// Componente de Avaliação Adaptativa
function AdaptiveAssessmentPanel({ assistantId, subjectId, topicId }: { 
  assistantId: string; 
  subjectId: string; 
  topicId?: string; 
}) {
  return <AdaptiveAssessment assistantId={assistantId} subjectId={subjectId} topicId={topicId} />;
}

// Componente de Chat com Assistente
function AssistantChatPanel({ assistantId, subjectId }: { 
  assistantId: string; 
  subjectId: string; 
}) {
  return <AssistantChat assistantId={assistantId} subjectId={subjectId} />;
}

// Componente de Visualização de Perfil
function StudentProfilePanel({ profile }: { profile: any }) {
  return <StudentProfileView profile={profile} />;
}
