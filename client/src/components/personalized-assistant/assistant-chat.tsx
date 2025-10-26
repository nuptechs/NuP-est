import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Loader2, Clock, ChevronUp, ChevronDown, Calendar, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssistantChatProps {
  assistantId: string;
  subjectId?: string;
  topicId?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ConversationTopic {
  id: string;
  title: string;
  summary: string;
  messageIds: string[];
  startTime: string;
  endTime: string;
  messageCount: number;
}

interface TemporalGroup {
  period: "today" | "yesterday" | "this_week" | "last_week" | "older";
  label: string;
  topics: ConversationTopic[];
  totalMessages: number;
}

const INITIAL_MESSAGES_TO_SHOW = 15;

export default function AssistantChat({ assistantId, subjectId, topicId }: AssistantChatProps) {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState("");
  const [loadingTime, setLoadingTime] = useState(0);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set(["today"]));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Query para carregar histórico de mensagens
  const chatMessagesQueryKey = [`/api/assistant/${assistantId}/messages?limit=200`];
  const { data: allMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: chatMessagesQueryKey,
    enabled: !!assistantId,
  });

  // Query para carregar tópicos semânticos (apenas quando expandido)
  const topicsQueryKey = [`/api/assistant/${assistantId}/conversation-topics`];
  const { data: topicsData, isLoading: isLoadingTopics, error: topicsError } = useQuery<{ topics: TemporalGroup[] }>({
    queryKey: topicsQueryKey,
    enabled: !!assistantId && showAllHistory,
  });

  const temporalGroups = topicsData?.topics || [];

  // Determinar quais mensagens mostrar
  const recentMessages = allMessages.slice(-INITIAL_MESSAGES_TO_SHOW);
  const olderMessagesCount = allMessages.length - INITIAL_MESSAGES_TO_SHOW;

  // Auto-scroll suave ao final quando novas mensagens chegam
  useEffect(() => {
    if (!showAllHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages, showAllHistory]);

  // Mutation para enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/assistant/chat", {
        assistantId,
        message,
        subjectId,
        topicId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatMessagesQueryKey });
      queryClient.invalidateQueries({ queryKey: topicsQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir mensagem
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("DELETE", `/api/assistant/messages/${messageId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatMessagesQueryKey });
      queryClient.invalidateQueries({ queryKey: topicsQueryKey });
      toast({
        title: "Mensagem excluída",
        description: "A mensagem e sua resposta foram removidas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Timer para loading state
  useEffect(() => {
    if (!sendMessage.isPending) {
      setLoadingTime(0);
      return;
    }
    
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sendMessage.isPending]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    sendMessage.mutate(inputMessage);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const togglePeriod = (period: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const getMessagesByIds = (ids: string[]): ChatMessage[] => {
    return allMessages.filter(m => ids.includes(m.id));
  };

  const renderMessage = (message: ChatMessage, index: number) => (
    <div
      key={message.id || index}
      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} group`}
      data-testid={`message-${message.role}`}
    >
      {message.role === "assistant" && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex items-start gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/30 dark:bg-secondary/50 border border-border/50"
          }`}
        >
          <div className={`prose prose-sm max-w-none ${
            message.role === "user" ? "prose-invert" : "dark:prose-invert"
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          <p className={`text-xs mt-1 opacity-70 ${
            message.role === "user" ? "text-primary-foreground" : "text-foreground"
          }`}>
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
        
        {/* Botão de exclusão (apenas para mensagens do usuário) */}
        {message.role === "user" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteMessage.mutate(message.id)}
            disabled={deleteMessage.isPending}
            data-testid={`button-delete-message-${message.id}`}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        )}
      </div>

      {message.role === "user" && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full" data-testid="card-chat">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6 py-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Olá! Como posso ajudar?</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Estou aqui para responder suas dúvidas, explicar conceitos ou ajudar você a estudar melhor.
                Digite sua mensagem abaixo para começar!
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Botão para expandir histórico */}
              {olderMessagesCount > 0 && !showAllHistory && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllHistory(true)}
                    className="gap-2 text-xs"
                    data-testid="button-show-history"
                  >
                    <ChevronUp className="h-3 w-3" />
                    Ver {olderMessagesCount} mensagens anteriores
                  </Button>
                </div>
              )}

              {/* Histórico organizado temporal + semântico */}
              {showAllHistory && isLoadingTopics ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Organizando histórico com IA...</p>
                  <p className="text-xs text-muted-foreground mt-1">Pode levar alguns segundos</p>
                </div>
              ) : showAllHistory && topicsError ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-destructive mb-3">Erro ao carregar histórico organizado</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Mostrando mensagens em ordem cronológica
                    </p>
                    {allMessages.map((message, index) => renderMessage(message, index))}
                  </div>
                </div>
              ) : showAllHistory && temporalGroups.length > 0 ? (
                <div className="space-y-3">
                  {temporalGroups.map((group) => (
                    <Collapsible
                      key={group.period}
                      open={expandedPeriods.has(group.period)}
                      onOpenChange={() => togglePeriod(group.period)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between hover:bg-secondary/50"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{group.label}</span>
                            <span className="text-xs text-muted-foreground">
                              ({group.totalMessages} mensagens)
                            </span>
                          </div>
                          {expandedPeriods.has(group.period) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2 pl-6">
                        {group.topics.map((topic) => (
                          <Collapsible
                            key={topic.id}
                            open={expandedTopics.has(topic.id)}
                            onOpenChange={() => toggleTopic(topic.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between text-left hover:bg-secondary/30"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{topic.title}</div>
                                    <div className="text-xs text-muted-foreground truncate">{topic.summary}</div>
                                  </div>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {topic.messageCount} msgs
                                  </span>
                                </div>
                                {expandedTopics.has(topic.id) ? (
                                  <ChevronDown className="h-3 w-3 flex-shrink-0 ml-2" />
                                ) : (
                                  <ChevronUp className="h-3 w-3 flex-shrink-0 ml-2" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 mt-2 pl-4">
                              {getMessagesByIds(topic.messageIds).map((msg, idx) => renderMessage(msg, idx))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  
                  {/* Botão para recolher histórico */}
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllHistory(false)}
                      className="gap-2 text-xs"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Ocultar histórico
                    </Button>
                  </div>
                </div>
              ) : !showAllHistory ? (
                // Modo padrão: mostrar apenas mensagens recentes
                recentMessages.map((message, index) => renderMessage(message, index))
              ) : null}

              {/* Indicador de digitação */}
              {sendMessage.isPending && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary/30 dark:bg-secondary/50 border border-border/50 rounded-lg px-4 py-2">
                    <div className="flex gap-1 items-center">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      {loadingTime > 10 && (
                        <span className="ml-3 text-xs text-foreground/70 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {loadingTime}s {loadingTime > 30 && "(a IA pode demorar até 45s)"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Ref para scroll automático */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input de mensagem */}
      <div className="border-t p-6 bg-background">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className="min-h-[80px] max-h-[160px] flex-1"
            data-testid="textarea-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendMessage.isPending}
            size="icon"
            className="h-[80px] w-[80px] flex-shrink-0"
            data-testid="button-send-message"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
