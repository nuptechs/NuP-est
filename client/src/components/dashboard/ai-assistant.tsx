import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Lightbulb, BookOpen, Target, Sparkles } from "lucide-react";
import type { Subject } from "@shared/schema";

interface AIRecommendation {
  recommendation: string;
  timestamp: Date;
}

export default function AiAssistant() {
  const [userQuestion, setUserQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
  }>>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subjects for context
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch recent recommendation
  const { data: aiRecommendation, isLoading: recommendationLoading } = useQuery<AIRecommendation>({
    queryKey: ["/api/ai/recommendation"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate recommendation mutation
  const generateRecommendationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/recommendation", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/ai/recommendation"], {
        recommendation: data.recommendation,
        timestamp: new Date(),
      });
      toast({
        title: "Recomendação atualizada!",
        description: "O assistente gerou uma nova recomendação personalizada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar recomendação: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Chat with AI mutation (simulated for now)
  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      // For now, provide contextual responses based on the user's profile and subjects
      const responses = getContextualResponse(question, user?.studyProfile, subjects);
      return responses;
    },
    onSuccess: (response) => {
      setChatHistory(prev => [
        ...prev,
        { type: 'user', message: userQuestion, timestamp: new Date() },
        { type: 'ai', message: response, timestamp: new Date() },
      ]);
      setUserQuestion("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível processar sua pergunta: " + error.message,
        variant: "destructive",
      });
    },
  });

  const getContextualResponse = (question: string, studyProfile: string | undefined, subjects: Subject[]) => {
    const lowerQuestion = question.toLowerCase();
    
    // Study schedule questions
    if (lowerQuestion.includes("cronograma") || lowerQuestion.includes("horário") || lowerQuestion.includes("quando")) {
      if (studyProfile === "disciplined") {
        return "Como você tem um perfil disciplinado, recomendo um cronograma estruturado: 2-3 horas de estudo concentrado pela manhã, com revisões de 30min à tarde. Mantenha intervalos regulares de 15min a cada hora.";
      } else if (studyProfile === "undisciplined") {
        return "Para seu perfil, sugiro sessões curtas de 25-30 minutos com intervalos de 10min (técnica Pomodoro). Comece com 2-3 sessões por dia e vá aumentando gradualmente. Use recompensas após cada sessão!";
      } else {
        return "Recomendo o método 50/10: 50 minutos de estudo focado com 10 minutos de pausa. Faça 2-3 blocos por dia, preferencialmente no mesmo horário para criar rotina.";
      }
    }
    
    // Study techniques questions
    if (lowerQuestion.includes("como estudar") || lowerQuestion.includes("técnica") || lowerQuestion.includes("método")) {
      if (studyProfile === "disciplined") {
        return "Para maximizar seu potencial, use técnicas avançadas: mapas mentais para conexões complexas, método Cornell para anotações, e ensine o conteúdo para alguém (técnica Feynman).";
      } else if (studyProfile === "undisciplined") {
        return "Varie as técnicas para manter o interesse: flashcards para memorização, vídeos educativos, resumos coloridos e gamificação. Alterne entre leitura, escrita e exercícios práticos.";
      } else {
        return "Combine diferentes técnicas: leitura ativa, resumos, exercícios práticos e revisões espaçadas. Use flashcards para conceitos importantes e pratique com questões regulares.";
      }
    }
    
    // Motivation questions
    if (lowerQuestion.includes("motivação") || lowerQuestion.includes("desanimado") || lowerQuestion.includes("difícil")) {
      return "É normal ter momentos difíceis! Defina metas pequenas e celebre cada conquista. Lembre-se do seu objetivo final e veja o progresso já feito. Considere estudar com amigos ou formar grupos de estudo para manter a motivação.";
    }
    
    // Subject-specific advice
    if (subjects.length > 0) {
      const subjectNames = subjects.map(s => s.name.toLowerCase());
      const mentionedSubject = subjectNames.find(name => lowerQuestion.includes(name));
      
      if (mentionedSubject) {
        const subject = subjects.find(s => s.name.toLowerCase() === mentionedSubject);
        if (subject?.category === "exatas") {
          return `Para ${subject.name}, pratique muito! Resolva exercícios diariamente, começando pelos mais simples e aumentando a dificuldade. Mantenha um caderno de fórmulas e revise conceitos fundamentais regularmente.`;
        } else if (subject?.category === "humanas") {
          return `Para ${subject.name}, foque na compreensão e conexões. Faça resumos, mapas mentais e relacione o conteúdo com atualidades. Pratique dissertações e analise questões de vestibulares anteriores.`;
        } else if (subject?.category === "biologicas") {
          return `Para ${subject.name}, use muito material visual: diagramas, esquemas e vídeos. Pratique nomenclaturas, faça exercícios de fixação e relacione teoria com exemplos práticos do dia a dia.`;
        }
      }
    }
    
    // General advice
    return "Ótima pergunta! Minha dica geral é: seja consistente, use técnicas variadas de estudo, mantenha intervalos regulares e não tenha medo de revisar o mesmo conteúdo várias vezes. O aprendizado é um processo gradual. Como posso ajudar mais especificamente?";
  };

  const getUserProfileLabel = () => {
    switch (user?.studyProfile) {
      case "disciplined":
        return { label: "Disciplinado", color: "bg-green-100 text-green-800" };
      case "undisciplined":
        return { label: "Indisciplinado", color: "bg-orange-100 text-orange-800" };
      default:
        return { label: "Mediano", color: "bg-blue-100 text-blue-800" };
    }
  };

  const handleAskQuestion = () => {
    if (!userQuestion.trim()) return;
    chatMutation.mutate(userQuestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="flex items-center gap-2">
              Assistente de IA
              <Sparkles className="w-4 h-4 text-purple-500" />
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getUserProfileLabel().color}>
              {getUserProfileLabel().label}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateRecommendationMutation.mutate()}
              disabled={generateRecommendationMutation.isPending}
              data-testid="button-refresh-recommendation"
            >
              {generateRecommendationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Recommendation Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-600" />
            <h3 className="font-medium text-purple-900">Recomendação Personalizada</h3>
          </div>
          
          {recommendationLoading ? (
            <div className="flex items-center gap-2 text-purple-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Gerando recomendação...</span>
            </div>
          ) : aiRecommendation?.recommendation ? (
            <p className="text-purple-800 text-sm leading-relaxed" data-testid="ai-recommendation">
              {aiRecommendation.recommendation}
            </p>
          ) : (
            <div className="text-center py-4">
              <p className="text-purple-600 text-sm mb-3">
                Clique no botão acima para receber uma recomendação personalizada baseada no seu perfil e progresso!
              </p>
              <Button
                size="sm"
                onClick={() => generateRecommendationMutation.mutate()}
                disabled={generateRecommendationMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-generate-recommendation"
              >
                {generateRecommendationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Gerar Recomendação
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-gray-900">Pergunte ao Assistente</h3>
          </div>
          
          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="max-h-64 overflow-y-auto mb-4 space-y-3 bg-gray-50 p-3 rounded-lg" data-testid="chat-history">
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white ml-4' 
                      : 'bg-white border border-gray-200 text-gray-800 mr-4'
                  }`}>
                    <p>{message.message}</p>
                    <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Pergunte sobre técnicas de estudo, cronogramas, motivação, ou qualquer dúvida sobre seus estudos..."
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[80px] resize-none"
              data-testid="input-ai-question"
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!userQuestion.trim() || chatMutation.isPending}
              className="self-end"
              data-testid="button-ask-ai"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 Pressione Enter para enviar ou Shift+Enter para quebra de linha
          </p>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserQuestion("Como posso melhorar minha técnica de estudo?")}
              data-testid="button-study-techniques"
            >
              📚 Técnicas de Estudo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserQuestion("Qual cronograma você recomenda para mim?")}
              data-testid="button-schedule"
            >
              ⏰ Cronograma
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserQuestion("Como manter a motivação nos estudos?")}
              data-testid="button-motivation"
            >
              💪 Motivação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserQuestion("Como revisar o conteúdo de forma eficiente?")}
              data-testid="button-review"
            >
              🔄 Revisão
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}