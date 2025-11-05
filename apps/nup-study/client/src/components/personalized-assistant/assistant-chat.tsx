import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@nup/ui";
import { Send, Bot, User, Loader2, Clock, ChevronUp, ChevronDown, Calendar, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VoiceToggle } from "@/components/voice/VoiceToggle";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { detectContentType } from "@/lib/content-detector";
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from "@/components/chat-content/ResponsiveTable";
import { AdaptiveChart } from "@/components/chat-content/AdaptiveChart";
import { MindMapInline } from "@/components/chat-content/MindMapInline";
import { InteractiveTable } from "@/components/chat-content/InteractiveTable";
import { MindMapVisual } from "@/components/chat-content/MindMapVisual";

interface AssistantChatProps {
  assistantId: string;
  subjectId?: string;
  topicId?: string;
  initialMessage?: string | null;
  onMessageSent?: () => void;
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

const customMarkdownComponents: Components = {
  table: ({ children }) => <ResponsiveTable>{children}</ResponsiveTable>,
  thead: ({ children }) => <ResponsiveTableHeader>{children}</ResponsiveTableHeader>,
  tr: ({ children }) => <ResponsiveTableRow>{children}</ResponsiveTableRow>,
  th: ({ children }) => <ResponsiveTableHead>{children}</ResponsiveTableHead>,
  td: ({ children }) => <ResponsiveTableCell>{children}</ResponsiveTableCell>,
  p: ({ children }) => <p className="break-words my-2">{children}</p>,
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-sm font-mono break-all" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-secondary/30 dark:bg-secondary/20 rounded-lg p-4 overflow-x-auto my-3">
        <code className="text-sm font-mono break-all" {...props}>
          {children}
        </code>
      </pre>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-3 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="break-words">{children}</li>,
  h1: ({ children }) => <h1 className="text-xl font-bold my-3 break-words">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold my-2 break-words">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold my-2 break-words">{children}</h3>,
  a: ({ children, href }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-primary hover:underline break-all"
    >
      {children}
    </a>
  ),
};

export default function AssistantChat({ assistantId, subjectId, topicId, initialMessage, onMessageSent }: AssistantChatProps) {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState("");
  const [loadingTime, setLoadingTime] = useState(0);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set(["today"]));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);

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

  // Auto-send initial message from mind map deep-link
  useEffect(() => {
    if (initialMessage && !hasProcessedInitialMessage && assistantId && !sendMessage.isPending) {
      setHasProcessedInitialMessage(true);
      sendMessage.mutate(initialMessage);
      if (onMessageSent) {
        onMessageSent();
      }
    }
    // Reset flag when initialMessage changes to allow new deep-links
    if (!initialMessage && hasProcessedInitialMessage) {
      setHasProcessedInitialMessage(false);
    }
  }, [initialMessage, hasProcessedInitialMessage, assistantId, sendMessage.isPending, onMessageSent]);

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

  const handleVoiceTranscript = (text: string) => {
    setInputMessage(prev => prev ? `${prev} ${text}` : text);
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

  const renderMessage = (message: ChatMessage, index: number) => {
    const contentType = message.role === "assistant" ? detectContentType(message.content) : { kind: "markdown" as const, content: message.content };
    
    return (
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
          className={`max-w-[95%] rounded-lg px-4 py-3 ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/30 dark:bg-secondary/50 border border-border/50"
          }`}
        >
          {contentType.kind === "markdown" && (
            <div className={`prose prose-sm max-w-none break-words ${
              message.role === "user" ? "prose-invert" : "dark:prose-invert"
            }`}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={customMarkdownComponents}
              >
                {contentType.content}
              </ReactMarkdown>
            </div>
          )}

          {contentType.kind === "mindmap" && (
            contentType.visual ? (
              <MindMapVisual data={contentType.data} />
            ) : (
              <MindMapInline data={contentType.data} fallback={contentType.fallback} />
            )
          )}

          {contentType.kind === "chart" && (
            <AdaptiveChart data={contentType.data} />
          )}

          {contentType.kind === "table" && (
            contentType.interactive ? (
              <InteractiveTable headers={contentType.headers} rows={contentType.rows} />
            ) : (
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    {contentType.headers.map((header, i) => (
                      <ResponsiveTableHead key={i}>{header}</ResponsiveTableHead>
                    ))}
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <tbody>
                  {contentType.rows.map((row, i) => (
                    <ResponsiveTableRow key={i}>
                      {row.map((cell, j) => (
                        <ResponsiveTableCell key={j}>{cell}</ResponsiveTableCell>
                      ))}
                    </ResponsiveTableRow>
                  ))}
                </tbody>
              </ResponsiveTable>
            )
          )}

          {contentType.kind === "mixed" && (
            <div className={`prose prose-sm max-w-none break-words ${
              message.role === "user" ? "prose-invert" : "dark:prose-invert"
            }`}>
              {contentType.segments.map((segment, idx) => {
                if (segment.type === "markdown") {
                  return (
                    <ReactMarkdown 
                      key={idx}
                      remarkPlugins={[remarkGfm]}
                      components={customMarkdownComponents}
                    >
                      {segment.content}
                    </ReactMarkdown>
                  );
                } else if (segment.type === "mindmap") {
                  return segment.visual ? (
                    <MindMapVisual key={idx} data={segment.data} />
                  ) : (
                    <MindMapInline key={idx} data={segment.data} />
                  );
                } else if (segment.type === "chart") {
                  return <AdaptiveChart key={idx} data={segment.data} />;
                } else if (segment.type === "table") {
                  return segment.interactive ? (
                    <InteractiveTable key={idx} headers={segment.headers} rows={segment.rows} />
                  ) : (
                    <ResponsiveTable key={idx}>
                      <ResponsiveTableHeader>
                        <ResponsiveTableRow>
                          {segment.headers.map((header, i) => (
                            <ResponsiveTableHead key={i}>{header}</ResponsiveTableHead>
                          ))}
                        </ResponsiveTableRow>
                      </ResponsiveTableHeader>
                      <tbody>
                        {segment.rows.map((row, i) => (
                          <ResponsiveTableRow key={i}>
                            {row.map((cell, j) => (
                              <ResponsiveTableCell key={j}>{cell}</ResponsiveTableCell>
                            ))}
                          </ResponsiveTableRow>
                        ))}
                      </tbody>
                    </ResponsiveTable>
                  );
                }
                return null;
              })}
            </div>
          )}
          <div className="flex items-center justify-between mt-1 gap-2">
            <p className={`text-xs opacity-70 ${
              message.role === "user" ? "text-primary-foreground" : "text-foreground"
            }`}>
              {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
            {/* Botão TTS apenas para mensagens do assistente */}
            {message.role === "assistant" && (
              <SpeakButton 
                text={message.content}
                isPremium={true}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
        </div>
        
        {/* Botão de exclusão (apenas para mensagens do usuário) */}
        {message.role === "user" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setMessageToDelete(message.id)}
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
};

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
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Voice Toggle */}
          <div className="flex justify-end">
            <VoiceToggle
              isPremium={true}
              onTranscript={handleVoiceTranscript}
              disabled={sendMessage.isPending}
              language="pt-BR"
            />
          </div>

          {/* Message Input */}
          <div className="flex gap-3">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem ou use o modo voz... (Enter para enviar, Shift+Enter para nova linha)"
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

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao excluir sua pergunta, a resposta da IA também será removida. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (messageToDelete) {
                  deleteMessage.mutate(messageToDelete);
                  setMessageToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
