import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePersonalizedAssistant } from "@/hooks/usePersonalizedAssistant";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppShell from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
  Sparkles,
  ChevronRight
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
  const [activeTab, setActiveTab] = useState<"questions" | "assessment" | "chat" | "profile">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!assistantLoading && !hasAssistant && !createAssistant.isPending) {
      createAssistant.mutate({});
    }
  }, [assistantLoading, hasAssistant, createAssistant]);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
  });

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

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const selectedTopicData = topics.find((t: any) => t.id === selectedTopic);

  const navigationItems = [
    { id: "chat", label: "Chat", icon: MessageSquare, disabled: false },
    { id: "questions", label: "Perguntas", icon: HelpCircle, disabled: !selectedSubject },
    { id: "assessment", label: "Avaliação", icon: GraduationCap, disabled: !selectedSubject },
    { id: "profile", label: "Perfil", icon: User, disabled: false },
  ] as const;

  return (
    <AppShell title="Assistente Personalizado">
      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Sidebar - Navegação e Seleção */}
        <div className={`
          w-80 border-r bg-muted/20 flex flex-col
          lg:relative absolute inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header do Assistente */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sm" data-testid="text-assistant-name">
                  {assistant?.name || "Meu Assistente"}
                </h2>
                <p className="text-xs text-muted-foreground">Seu tutor pessoal</p>
              </div>
            </div>

            {profile && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-xs" data-testid="badge-primary-goal">
                  {profile.primaryGoal}
                </Badge>
                <Badge variant="outline" className="text-xs" data-testid="badge-profile-status">
                  v{profile.version}
                </Badge>
              </div>
            )}
          </div>

          {/* Seleção de Conteúdo */}
          <div className="p-6 border-b space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                Matéria
              </label>
              <Select
                value={selectedSubject}
                onValueChange={(value) => {
                  setSelectedSubject(value);
                  setSelectedTopic("");
                }}
              >
                <SelectTrigger className="h-9" data-testid="select-subject">
                  <SelectValue placeholder="Selecione..." />
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
            
            {selectedSubject && topics.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                  Tópico (opcional)
                </label>
                <Select
                  value={selectedTopic}
                  onValueChange={setSelectedTopic}
                >
                  <SelectTrigger className="h-9" data-testid="select-topic">
                    <SelectValue placeholder="Todos os tópicos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tópicos</SelectItem>
                    {topics.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id} data-testid={`select-item-topic-${topic.id}`}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSubjectData && (
              <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>{selectedSubjectData.name}</span>
                {selectedTopicData && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span>{selectedTopicData.name}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isDisabled = item.disabled;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isDisabled) {
                      setActiveTab(item.id as any);
                      // Auto-close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }
                  }}
                  disabled={isDisabled}
                  data-testid={`nav-${item.id}`}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : isDisabled
                        ? 'text-muted-foreground/40 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isDisabled && (
                    <span className="ml-auto text-xs opacity-50">Selecione matéria</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer com dica */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Selecione uma matéria para acessar perguntas e avaliações personalizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content Header */}
          <div className="border-b bg-background px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile Sidebar Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                  data-testid="button-open-sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-2xl font-bold">
                    {navigationItems.find(i => i.id === activeTab)?.label}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === "chat" && "Converse com seu assistente personalizado"}
                    {activeTab === "questions" && "Pratique com perguntas adaptativas"}
                    {activeTab === "assessment" && "Avalie seu conhecimento com IRT"}
                    {activeTab === "profile" && "Visualize seu perfil de aprendizado"}
                  </p>
                </div>
              </div>
              
              {selectedSubjectData && (activeTab === "questions" || activeTab === "assessment") && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-selected-subject">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {selectedSubjectData.name}
                  </Badge>
                  {selectedTopicData && (
                    <Badge variant="outline" data-testid="badge-selected-topic">
                      <Target className="h-3 w-3 mr-1" />
                      {selectedTopicData.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto bg-muted/10">
            <div className="h-full">
              {activeTab === "questions" && (
                selectedSubject ? (
                  <AdaptiveQuestions 
                    assistantId={assistant?.id || ""} 
                    subjectId={selectedSubject} 
                    topicId={selectedTopic} 
                  />
                ) : (
                  <EmptyState
                    icon={HelpCircle}
                    title="Selecione uma matéria"
                    description="Escolha uma matéria na barra lateral para começar a praticar com perguntas adaptativas."
                  />
                )
              )}

              {activeTab === "assessment" && (
                selectedSubject ? (
                  <AdaptiveAssessment 
                    assistantId={assistant?.id || ""} 
                    subjectId={selectedSubject} 
                    topicId={selectedTopic} 
                  />
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="Selecione uma matéria"
                    description="Escolha uma matéria na barra lateral para iniciar uma avaliação adaptativa."
                  />
                )
              )}

              {activeTab === "chat" && (
                <AssistantChat 
                  assistantId={assistant?.id || ""} 
                  subjectId={selectedSubject} 
                />
              )}

              {activeTab === "profile" && (
                profile ? (
                  <div className="p-8">
                    <StudentProfileView profile={profile} />
                  </div>
                ) : (
                  <EmptyState
                    icon={User}
                    title="Perfil não disponível"
                    description="Seu perfil de aprendizado será gerado automaticamente conforme você interage com o assistente."
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
