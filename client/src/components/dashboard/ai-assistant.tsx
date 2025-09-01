import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Target, Send, X } from "lucide-react";
import type { Subject, Goal } from "@shared/schema";

interface AIRecommendation {
  recommendation: string;
  timestamp: Date;
}

export default function AiAssistant() {
  const [userQuestion, setUserQuestion] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
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

  const handleAskQuestion = () => {
    if (!userQuestion.trim()) return;
    
    // Se há metas e nenhuma foi selecionada, mostrar opções primeiro
    if (goals.length > 0 && !selectedGoal) {
      setChatHistory(prev => [
        ...prev,
        { type: 'user', message: userQuestion, timestamp: new Date() },
        { 
          type: 'system', 
          message: "Para dar uma resposta mais personalizada, escolha seu objetivo principal:",
          timestamp: new Date(),
          goalOptions: goals
        },
      ]);
      return;
    }
    
    // Caso contrário, proceder normalmente
    chatMutation.mutate(userQuestion);
  };

  const handleGoalSelection = (goal: Goal | null) => {
    setSelectedGoal(goal);
    
    // Adicionar mensagem de confirmação
    const goalMessage = goal 
      ? `✓ Focando em: ${goal.title}`
      : "✓ Sem objetivo específico";
    
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

  const clearChat = () => {
    setChatHistory([]);
    setSelectedGoal(null);
    setUserQuestion("");
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-gray-600" />
            <h3 className="text-base font-medium text-gray-900">Assistente de IA</h3>
          </div>
          <div className="flex items-center gap-2">
            {selectedGoal && (
              <Badge variant="outline" className="text-xs">
                {selectedGoal.title}
              </Badge>
            )}
            {chatHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto space-y-3" data-testid="chat-history">
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  message.type === 'user' 
                    ? 'bg-gray-900 text-white' 
                    : message.type === 'system'
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="leading-relaxed">{message.message}</p>
                  
                  {/* Goal Selection Options */}
                  {message.goalOptions && (
                    <div className="mt-2 space-y-1">
                      {message.goalOptions.map((goal) => (
                        <Button
                          key={goal.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleGoalSelection(goal)}
                          className="w-full text-left justify-start h-auto p-2 bg-white hover:bg-gray-50 border-gray-200"
                        >
                          <Target className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate text-xs">{goal.title}</span>
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGoalSelection(null)}
                        className="w-full text-left justify-start h-auto p-2 text-gray-500 text-xs"
                      >
                        Continuar sem objetivo específico
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua pergunta sobre estudos..."
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[60px] resize-none border-gray-200 text-sm"
              data-testid="input-ai-question"
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!userQuestion.trim() || chatMutation.isPending}
              size="sm"
              className="self-end h-[60px] px-3"
              data-testid="button-ask-ai"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-1">
            {[
              "Como me organizar?",
              "Técnicas de memorização", 
              "Manter foco"
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setUserQuestion(suggestion)}
                className="text-xs h-6 px-2 border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                data-testid={`suggestion-${suggestion.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}