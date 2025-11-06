/**
 * Study - Clean Quick-Start Cards
 * Simplified from 321 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@nup/ui";
import AiStudyModal from "@/components/study/ai-study-modal";
import GenerateFlashcardsFromMaterialDialog from "@/components/dialogs/GenerateFlashcardsFromMaterialDialog";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { 
  BookOpen, 
  Bot, 
  BarChart3, 
  Clock, 
  Play, 
  FileText, 
  GraduationCap, 
  History,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Home,
  Sparkles
} from "lucide-react";
import type { Subject } from "@shared/schema";
import type { BreadcrumbItem } from "@/components/ui/page-header";

export default function Study() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState([10]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isAiStudyOpen, setIsAiStudyOpen] = useState(false);
  const [isFlashcardDialogOpen, setIsFlashcardDialogOpen] = useState(false);
  const [selectedMaterialForFlashcards, setSelectedMaterialForFlashcards] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: materials = [] } = useQuery<any[]>({
    queryKey: [`/api/materials?subjectId=${selectedSubject}`],
    enabled: isAuthenticated && !!selectedSubject,
  });

  const { data: topics = [] } = useQuery<any[]>({
    queryKey: ['/api/topics', selectedSubject],
    enabled: isAuthenticated && !!selectedSubject,
  });

  const { data: recentSessions = [] } = useQuery<any[]>({
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
    if (!materials?.length) {
      toast({
        title: "Materiais necessários",
        description: "Adicione materiais para esta matéria antes de gerar questões",
        variant: "destructive",
      });
      return;
    }
    setIsAiStudyOpen(true);
  };

  const handleGenerateFlashcards = () => {
    if (!selectedSubject) {
      toast({
        title: "Selecione uma matéria",
        description: "Escolha uma matéria primeiro",
        variant: "destructive",
      });
      return;
    }
    if (!materials?.length) {
      toast({
        title: "Materiais necessários",
        description: "Adicione materiais para gerar flashcards",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedMaterialForFlashcards(materials[0]);
    setIsFlashcardDialogOpen(true);
  };

  const studyMethods = [
    {
      id: "ai-questions",
      title: "Questões IA",
      description: "Questões personalizadas geradas pela IA",
      icon: Bot,
      available: true,
      action: handleStartAiStudy,
    },
    {
      id: "generate-flashcards",
      title: "Gerar Flashcards",
      description: "Crie flashcards a partir dos seus materiais",
      icon: Sparkles,
      available: true,
      action: handleGenerateFlashcards,
    },
    {
      id: "flashcards",
      title: "Estudar Flashcards",
      description: "Sistema de repetição espaçada",
      icon: BarChart3,
      available: true,
      action: () => window.location.href = '/flashcards',
    },
    {
      id: "concept-review",
      title: "Revisão de Conceitos",
      description: "Revise teoria e conceitos importantes",
      icon: BookOpen,
      available: false,
      action: () => toast({ title: "Em desenvolvimento", description: "Disponível em breve" }),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Início", href: "/", icon: <Home className="h-4 w-4" /> },
    { label: "Estudar", icon: <BookOpen className="h-4 w-4" /> }
  ];

  return (
    <UnifiedShell breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Page Header */}
        <ModernPageHeader
          title="Métodos de Estudo"
          description="Escolha seu método de estudo e comece a praticar"
          icon={GraduationCap}
        />

        {/* Subject Selection & Advanced Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Basic Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Matéria</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject} data-testid="select-study-subject">
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color || '#666' }} />
                          <span>{subject.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters Toggle */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 w-full justify-center" data-testid="button-toggle-filters">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filtros Avançados</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Topic Filter */}
                  {topics.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tópico (opcional)</label>
                      <Select value={selectedTopic} onValueChange={setSelectedTopic} data-testid="select-topic">
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os tópicos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos os tópicos</SelectItem>
                          {topics.map((topic: any) => (
                            <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Difficulty Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Dificuldade</label>
                    <Select value={difficulty} onValueChange={setDifficulty} data-testid="select-difficulty">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="easy">Fácil</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="hard">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Question Count Slider */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Quantidade de Questões: {questionCount[0]}
                    </label>
                    <Slider
                      value={questionCount}
                      onValueChange={setQuestionCount}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                      data-testid="slider-question-count"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {selectedSubject && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{materials.length} material{materials.length !== 1 ? 's' : ''} disponível{materials.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Study Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studyMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                key={method.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !method.available ? 'opacity-60' : ''
                }`}
                onClick={method.action}
                data-testid={`button-${method.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    {method.available ? (
                      <Play className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Badge variant="secondary" className="text-xs">Em breve</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{method.title}</h3>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Sessões Recentes</h2>
            </div>
            {recentSessions.length === 0 ? (
              <ModernEmptyState
                icon={History}
                title="Nenhuma sessão encontrada"
                description="Comece estudando para ver seu histórico aqui"
              />
            ) : (
              <div className="space-y-3">
                {recentSessions.slice(0, 5).map((session: any) => {
                  const subject = subjects.find((s) => s.id === session.subjectId);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          session.completed 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/20'
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20'
                        }`}>
                          {session.completed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium">{subject?.name || "Matéria não encontrada"}</h5>
                          <p className="text-sm text-muted-foreground">
                            {session.duration} min • {session.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {session.completed && session.score && (
                          <p className="text-sm font-semibold">{session.score}%</p>
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

        <AiStudyModal 
          isOpen={isAiStudyOpen}
          onClose={() => setIsAiStudyOpen(false)}
          subjectId={selectedSubject}
        />

        {selectedMaterialForFlashcards && (
          <GenerateFlashcardsFromMaterialDialog
            open={isFlashcardDialogOpen}
            onOpenChange={setIsFlashcardDialogOpen}
            materialId={selectedMaterialForFlashcards.id}
            materialTitle={selectedMaterialForFlashcards.title}
          />
        )}
      </div>
    </UnifiedShell>
  );
}
