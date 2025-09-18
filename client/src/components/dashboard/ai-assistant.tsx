import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Target, Send, X, Copy, Check, Database } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Subject, Goal } from "@shared/schema";

interface AIRecommendation {
  recommendation: string;
  timestamp: Date;
}

interface ChatMessage {
  type: 'user' | 'ai' | 'system';
  message: string;
  timestamp: Date;
  goalOptions?: Goal[];
  knowledgeCategories?: string[];
}

interface KnowledgeCategory {
  category: string;
  count: number;
}

// Componente para mensagem da IA com Markdown
function AIMessage({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Assistente IA</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0 text-blue-400 hover:text-blue-600"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      <div className="prose prose-sm max-w-none text-gray-700">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Customizar componentes para melhor aparência
            table: ({ children }) => (
              <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden my-4">
                {children}
              </table>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2 text-gray-700">
                {children}
              </td>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-gray-900 mb-3 mt-4 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-medium text-gray-800 mb-2 mt-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed text-gray-700">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-3 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-3 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-700">
                {children}
              </li>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className="block bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  {children}
                </code>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-700">
                {children}
              </em>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-300 pl-4 py-2 bg-blue-50 italic text-gray-700 my-4">
                {children}
              </blockquote>
            ),
          }}
        >
          {message}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function AiAssistant() {
  const [userQuestion, setUserQuestion] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
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

  // Fetch knowledge base categories
  const { data: knowledgeCategories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ["/api/knowledge-base/categories"],
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
        
        // Se há uma categoria de base de conhecimento selecionada, incluir no contexto
        if (selectedKnowledgeCategory) {
          payload.selectedKnowledgeCategory = selectedKnowledgeCategory;
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
    
    // Se há bases de conhecimento e nenhuma categoria foi selecionada, mostrar opções
    if (knowledgeCategories.length > 1 && !selectedKnowledgeCategory) {
      setChatHistory(prev => [
        ...prev.filter(msg => !msg.goalOptions), // Remove mensagem de seleção de metas se existe
        { 
          type: 'system', 
          message: "Escolha qual base de conhecimento usar para sua consulta:",
          timestamp: new Date(),
          knowledgeCategories: knowledgeCategories.map(kc => kc.category)
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
      ...prev.filter(msg => !msg.goalOptions), // Remove a mensagem de seleção
      { type: 'system', message: goalMessage, timestamp: new Date() },
    ]);
    
    // Se há bases de conhecimento, mostrar opções de categoria
    if (knowledgeCategories.length > 1 && !selectedKnowledgeCategory) {
      setChatHistory(prev => [
        ...prev,
        { 
          type: 'system', 
          message: "Escolha qual base de conhecimento usar para sua consulta:",
          timestamp: new Date(),
          knowledgeCategories: knowledgeCategories.map(kc => kc.category)
        },
      ]);
      return;
    }
    
    // Caso contrário, fazer a pergunta com o contexto
    chatMutation.mutate(userQuestion);
  };
  
  const handleKnowledgeCategorySelection = (category: string | null) => {
    setSelectedKnowledgeCategory(category);
    
    // Adicionar mensagem de confirmação
    const categoryMessage = category 
      ? `✓ Usando base: ${category}`
      : "✓ Sem base de conhecimento específica";
    
    setChatHistory(prev => [
      ...prev.filter(msg => !msg.knowledgeCategories), // Remove a mensagem de seleção
      { type: 'system', message: categoryMessage, timestamp: new Date() },
    ]);
    
    // Agora fazer a pergunta com o contexto completo
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
    setSelectedKnowledgeCategory(null);
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
                <Target className="w-3 h-3 mr-1" />
                {selectedGoal.title}
              </Badge>
            )}
            {selectedKnowledgeCategory && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {selectedKnowledgeCategory}
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
          <div className="mb-6 max-h-96 overflow-y-auto space-y-4 pr-2" data-testid="chat-history">
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'user' ? (
                  <div className="max-w-[85%] bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl px-4 py-3 shadow-md">
                    <p className="leading-relaxed text-sm">{message.message}</p>
                  </div>
                ) : message.type === 'system' ? (
                  <div className="max-w-[85%] bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3">
                    <p className="leading-relaxed text-sm">{message.message}</p>
                    
                    {/* Goal Selection Options */}
                    {message.goalOptions && (
                      <div className="mt-3 space-y-2">
                        {message.goalOptions.map((goal) => (
                          <Button
                            key={goal.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleGoalSelection(goal)}
                            className="w-full text-left justify-start h-auto p-3 bg-white hover:bg-gray-50 border-amber-200 rounded-lg"
                          >
                            <Target className="w-4 h-4 mr-2 flex-shrink-0 text-amber-600" />
                            <span className="truncate text-sm text-gray-700">{goal.title}</span>
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGoalSelection(null)}
                          className="w-full text-left justify-start h-auto p-3 text-gray-500 text-sm hover:bg-gray-50 rounded-lg"
                        >
                          Continuar sem objetivo específico
                        </Button>
                      </div>
                    )}
                    
                    {/* Knowledge Base Category Selection Options */}
                    {message.knowledgeCategories && (
                      <div className="mt-3 space-y-2">
                        {message.knowledgeCategories.map((category, index) => (
                          <Button
                            key={`kb-category-${index}-${category}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleKnowledgeCategorySelection(category)}
                            className="w-full text-left justify-start h-auto p-3 bg-white hover:bg-blue-50 border-blue-200 rounded-lg"
                          >
                            <Database className="w-4 h-4 mr-2 flex-shrink-0 text-blue-600" />
                            <span className="truncate text-sm text-gray-700">{category}</span>
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleKnowledgeCategorySelection(null)}
                          className="w-full text-left justify-start h-auto p-3 text-gray-500 text-sm hover:bg-gray-50 rounded-lg"
                        >
                          Continuar sem base de conhecimento específica
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[95%] w-full">
                    <AIMessage message={message.message} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex gap-3">
              <Textarea
                placeholder="Digite sua pergunta sobre estudos..."
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 min-h-[60px] resize-none border-none shadow-none text-sm placeholder:text-gray-400 focus-visible:ring-0"
                data-testid="input-ai-question"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!userQuestion.trim() || chatMutation.isPending}
                size="sm"
                className="self-end h-[60px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                data-testid="button-ask-ai"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-2">
            {[
              "Explique os princípios fundamentais",
              "José Afonso da Silva", 
              "Técnicas de memorização",
              "Como me organizar?"
            ].map((suggestion, index) => (
              <Button
                key={`suggestion-${index}-${suggestion}`}
                variant="outline"
                size="sm"
                onClick={() => setUserQuestion(suggestion)}
                className="text-xs h-7 px-3 border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300 rounded-full"
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