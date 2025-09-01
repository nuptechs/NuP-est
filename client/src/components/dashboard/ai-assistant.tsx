import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Lightbulb, BookOpen, Target, Sparkles, CheckCircle } from "lucide-react";
import type { Subject, Goal } from "@shared/schema";

interface AIRecommendation {
  recommendation: string;
  timestamp: Date;
}

export default function AiAssistant() {
  const [userQuestion, setUserQuestion] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    type: 'user' | 'ai' | 'system';
    message: string;
    timestamp: Date;
    goalOptions?: Goal[];
  }>>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subjects for context
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch user goals
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
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

  // Chat with AI mutation - com verificação de metas
  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      try {
        const payload: any = { question };
        
        // Se há uma meta selecionada, incluir no contexto
        if (selectedGoal) {
          payload.selectedGoal = selectedGoal;
        }
        
        const response = await apiRequest("POST", "/api/ai/chat", payload);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.response) {
          throw new Error("Resposta inválida da IA");
        }
        
        return data.response;
      } catch (error) {
        console.error("Erro no chat com IA:", error);
        if (error instanceof SyntaxError) {
          throw new Error("Erro de formato na resposta da IA");
        }
        throw error;
      }
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
        title: "Erro no Assistente",
        description: error.message || "Não foi possível processar sua pergunta. Tente novamente.",
        variant: "destructive",
      });
    },
  });


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
    
    // Se há metas e nenhuma foi selecionada, mostrar opções primeiro
    if (goals.length > 0 && !selectedGoal) {
      setChatHistory(prev => [
        ...prev,
        { type: 'user', message: userQuestion, timestamp: new Date() },
        { 
          type: 'system', 
          message: "Para dar uma resposta mais personalizada, me diga qual é o seu objetivo principal de estudo:",
          timestamp: new Date(),
          goalOptions: goals
        },
      ]);
      setShowGoalSelection(true);
      return;
    }
    
    // Caso contrário, proceder normalmente
    chatMutation.mutate(userQuestion);
  };

  const handleGoalSelection = (goal: Goal | null) => {
    setSelectedGoal(goal);
    setShowGoalSelection(false);
    
    // Adicionar mensagem de confirmação
    const goalMessage = goal 
      ? `Perfeito! Vou focar nas suas necessidades para: "${goal.title}". Agora posso responder sua pergunta.`
      : "Ok, vou responder sua pergunta sem focar em um objetivo específico.";
    
    setChatHistory(prev => [
      ...prev.filter(msg => msg.type !== 'system'), // Remove a mensagem de seleção
      { type: 'system', message: goalMessage, timestamp: new Date() },
    ]);
    
    // Agora fazer a pergunta com o contexto
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
          
          {/* Current Goal Display */}
          {selectedGoal && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Objetivo atual: {selectedGoal.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGoal(null)}
                  className="text-green-600 hover:text-green-800 ml-auto"
                >
                  Alterar
                </Button>
              </div>
            </div>
          )}

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="max-h-64 overflow-y-auto mb-4 space-y-3 bg-gray-50 p-3 rounded-lg" data-testid="chat-history">
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white ml-4' 
                      : message.type === 'system'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 mr-4'
                      : 'bg-white border border-gray-200 text-gray-800 mr-4'
                  }`}>
                    <p>{message.message}</p>
                    
                    {/* Goal Selection Options */}
                    {message.goalOptions && (
                      <div className="mt-3 space-y-2">
                        {message.goalOptions.map((goal) => (
                          <Button
                            key={goal.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleGoalSelection(goal)}
                            className="w-full text-left justify-start"
                          >
                            <Target className="w-3 h-3 mr-2" />
                            {goal.title}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGoalSelection(null)}
                          className="w-full text-left justify-start text-gray-600"
                        >
                          Prosseguir sem objetivo específico
                        </Button>
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' 
                        ? 'text-blue-100' 
                        : message.type === 'system'
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}>
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