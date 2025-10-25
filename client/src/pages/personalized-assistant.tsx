/**
 * Personalized Assistant - Clean Navigation & Lazy Load
 * Simplified from 371 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePersonalizedAssistant } from "@/hooks/usePersonalizedAssistant";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  HelpCircle, 
  GraduationCap, 
  User,
  BookOpen,
  Loader2,
  Sparkles,
  Menu
} from "lucide-react";
import type { Subject } from "@shared/schema";
import AdaptiveQuestions from "@/components/personalized-assistant/adaptive-questions";
import AdaptiveAssessment from "@/components/personalized-assistant/adaptive-assessment";
import AssistantChat from "@/components/personalized-assistant/assistant-chat";
import StudentProfileView from "@/components/personalized-assistant/student-profile-view";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import Breadcrumbs from "@/components/ui/breadcrumbs";

type TabId = "chat" | "questions" | "assessment" | "profile";

export default function PersonalizedAssistantPage() {
  const { assistant, profile, isLoading, hasAssistant, createAssistant } = usePersonalizedAssistant();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasAssistant && !createAssistant.isPending) {
      createAssistant.mutate({});
    }
  }, [isLoading, hasAssistant, createAssistant]);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
  });

  const { data: topics = [] } = useQuery<any[]>({
    queryKey: ['/api/topics', selectedSubject],
    enabled: !!selectedSubject,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando seu assistente...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "chat", label: "Chat", icon: MessageSquare, desc: "Converse com seu assistente", disabled: false },
    { id: "questions", label: "Perguntas", icon: HelpCircle, desc: "Pratique com perguntas adaptativas", disabled: !selectedSubject },
    { id: "assessment", label: "Avaliação", icon: GraduationCap, desc: "Avalie seu conhecimento", disabled: !selectedSubject },
    { id: "profile", label: "Perfil", icon: User, desc: "Seu perfil de aprendizado", disabled: false },
  ] as const;

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`
        w-80 border-r bg-background flex flex-col shadow-2xl
        lg:relative absolute inset-y-0 left-0 z-40
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Assistant Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-3">
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
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">{profile.primaryGoal}</Badge>
              <Badge variant="outline" className="text-xs">v{profile.version}</Badge>
            </div>
          )}
        </div>

        {/* Subject/Topic Selection */}
        <div className="p-6 border-b space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              MATÉRIA
              {!selectedSubject && (
                <span className="text-amber-500 ml-2">● Necessário para Perguntas/Avaliação</span>
              )}
            </label>
            <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
              <SelectTrigger className="h-9" data-testid="select-subject">
                <SelectValue placeholder="Selecione uma matéria..." />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSubject && topics.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">TÓPICO</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger className="h-9" data-testid="select-topic">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {topics.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!tab.disabled) {
                    setActiveTab(tab.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }
                }}
                disabled={tab.disabled}
                data-testid={`nav-${tab.id}`}
                title={tab.disabled && (tab.id === "questions" || tab.id === "assessment") 
                  ? "Selecione uma matéria primeiro" 
                  : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : tab.disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.disabled && <span className="ml-auto text-xs">🔒</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/80 dark:bg-black/90 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <Breadcrumbs className="mb-1 hidden sm:flex" />
              <div>
                <h1 className="text-2xl font-bold">{activeTabData?.label}</h1>
                <p className="text-sm text-muted-foreground">{activeTabData?.desc}</p>
              </div>
            </div>
          </div>
          {selectedSubject && (activeTab === "questions" || activeTab === "assessment") && (
            <Badge variant="secondary">
              <BookOpen className="h-3 w-3 mr-1" />
              {subjects.find(s => s.id === selectedSubject)?.name}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "chat" && (
            <AssistantChat assistantId={assistant?.id || ""} subjectId={selectedSubject} />
          )}
          {activeTab === "questions" && (
            selectedSubject ? (
              <AdaptiveQuestions assistantId={assistant?.id || ""} subjectId={selectedSubject} topicId={selectedTopic} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <ModernEmptyState
                  icon={HelpCircle}
                  title="Selecione uma matéria"
                  description="Escolha uma matéria na barra lateral para praticar."
                />
              </div>
            )
          )}
          {activeTab === "assessment" && (
            selectedSubject ? (
              <AdaptiveAssessment assistantId={assistant?.id || ""} subjectId={selectedSubject} topicId={selectedTopic} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <ModernEmptyState
                  icon={GraduationCap}
                  title="Selecione uma matéria"
                  description="Escolha uma matéria na barra lateral para iniciar uma avaliação."
                />
              </div>
            )
          )}
          {activeTab === "profile" && (
            profile ? (
              <div className="p-8">
                <StudentProfileView profile={profile} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <ModernEmptyState
                  icon={User}
                  title="Perfil não disponível"
                  description="Seu perfil será gerado conforme você interage com o assistente."
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
