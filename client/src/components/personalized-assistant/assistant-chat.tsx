import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Loader2, Clock } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

export default function AssistantChat({ assistantId, subjectId, topicId }: AssistantChatProps) {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState("");
  const [loadingTime, setLoadingTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Query para carregar histórico de mensagens (usa default queryFn com credentials)
  const chatMessagesQueryKey = [`/api/assistant/${assistantId}/messages?limit=100`];
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: chatMessagesQueryKey,
    enabled: !!assistantId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      // Invalidar query para recarregar mensagens (usa singleton queryClient)
      queryClient.invalidateQueries({ queryKey: chatMessagesQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Timer para loading state (after mutation declaration)
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

  return (
    <div className="flex flex-col h-full" data-testid="card-chat">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6 py-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
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
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
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

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

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
