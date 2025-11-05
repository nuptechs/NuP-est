import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStudySessionSchema } from "@shared/schema";
import { z } from "zod";
import type { Subject, StudySession } from "@shared/schema";

const sessionFormSchema = insertStudySessionSchema.extend({
  duration: z.number().min(1, "Duração deve ser maior que 0"),
});

export default function StudySessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: recentSessions, isLoading } = useQuery<StudySession[]>({
    queryKey: ["/api/study-sessions"],
  });

  const form = useForm({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      subjectId: "",
      type: "theory" as const,
      duration: 30,
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sessionFormSchema>) => {
      await apiRequest("POST", "/api/study-sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      setIsAddSessionOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Sessão de estudo criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar sessão de estudo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof sessionFormSchema>) => {
    createSessionMutation.mutate(data);
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case "theory":
        return "bg-primary/10 text-primary border-primary/20";
      case "practice":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "ai_questions":
        return "bg-accent/10 text-accent border-accent/20";
      case "review":
        return "bg-chart-4/10 text-yellow-700 border-yellow-200";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "theory":
        return "Teoria";
      case "practice":
        return "Exercícios";
      case "ai_questions":
        return "Questões IA";
      case "review":
        return "Revisão";
      default:
        return type;
    }
  };

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plano de Estudos - Hoje</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsAddSessionOpen(true)}
              data-testid="button-add-session"
            >
              <i className="fas fa-plus mr-2"></i>
              Adicionar sessão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : !recentSessions?.length ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-plus text-muted-foreground"></i>
              </div>
              <p className="text-muted-foreground mb-4">Nenhuma sessão planejada para hoje</p>
              <Button onClick={() => setIsAddSessionOpen(true)} data-testid="button-create-first-session">
                <i className="fas fa-plus mr-2"></i>
                Planejar primeira sessão
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions?.slice(0, 3).map((session: StudySession) => {
                const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                return (
                  <div key={session.id} className="flex items-center p-4 bg-muted/50 rounded-lg border border-border">
                    <div className={`w-3 h-3 ${session.completed ? 'bg-secondary' : 'bg-primary'} rounded-full mr-4`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground" data-testid={`session-subject-${session.id}`}>
                          {subject?.name || "Matéria não encontrada"}
                        </h4>
                        <span className="text-sm text-muted-foreground" data-testid={`session-duration-${session.id}`}>
                          {session.duration} min
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(session.startedAt!).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="flex items-center mt-2 space-x-4">
                        <Badge className={getSessionTypeColor(session.type)}>
                          {getSessionTypeLabel(session.type)}
                        </Badge>
                        {session.completed && (
                          <span className="text-xs text-muted-foreground">
                            <i className="fas fa-check mr-1"></i>
                            Concluída
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={session.completed}
                      data-testid={`button-start-session-${session.id}`}
                    >
                      {session.completed ? "Concluída" : "Iniciar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Sessão de Estudo</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matéria</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-session-subject">
                          <SelectValue placeholder="Selecione uma matéria" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects?.map((subject: Subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Estudo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-session-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Teoria</SelectItem>
                          <SelectItem value="practice">Exercícios</SelectItem>
                          <SelectItem value="ai_questions">Questões IA</SelectItem>
                          <SelectItem value="review">Revisão</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-session-duration"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddSessionOpen(false)}
                  data-testid="button-cancel-session"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSessionMutation.isPending}
                  data-testid="button-create-session"
                >
                  {createSessionMutation.isPending ? "Criando..." : "Criar Sessão"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
