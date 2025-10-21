import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  List,
  Search,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
import type { Topic, Subject } from "@shared/schema";

const topicSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().min(1, "Matéria é obrigatória"),
  order: z.number().optional().default(0),
});

type TopicFormData = z.infer<typeof topicSchema>;

export default function Topics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<TopicFormData>({
    name: '',
    description: '',
    subjectId: '',
    order: 0
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa estar logado. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: allTopics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics", filterSubject],
    queryFn: async () => {
      if (!filterSubject) return [];
      const response = await fetch(`/api/subjects/${filterSubject}/topics`);
      if (!response.ok) throw new Error('Failed to fetch topics');
      return response.json();
    },
    enabled: isAuthenticated && !!filterSubject,
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: TopicFormData) => {
      return apiRequest("POST", "/api/topics", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setIsModalOpen(false);
      resetForm();
      toast({
        title: "Tópico criado",
        description: "Tópico criado com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar tópico",
        variant: "destructive",
      });
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TopicFormData> }) => {
      return apiRequest("PATCH", `/api/topics/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setIsModalOpen(false);
      setSelectedTopic(null);
      resetForm();
      toast({
        title: "Tópico atualizado",
        description: "Tópico atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar tópico",
        variant: "destructive",
      });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/topics/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "Tópico deletado",
        description: "Tópico deletado com sucesso!",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao deletar tópico",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subjectId: filterSubject || '',
      order: 0
    });
    setSelectedTopic(null);
  };

  const handleCreate = () => {
    setSelectedTopic(null);
    setFormData({
      name: '',
      description: '',
      subjectId: filterSubject || '',
      order: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (topic: Topic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
      subjectId: topic.subjectId,
      order: topic.order || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este tópico?')) {
      deleteTopicMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      topicSchema.parse(formData);
      
      if (selectedTopic) {
        updateTopicMutation.mutate({ id: selectedTopic.id, data: formData });
      } else {
        createTopicMutation.mutate(formData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const filteredTopics = allTopics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const selectedSubjectData = subjects.find(s => s.id === filterSubject);

  if (isLoading || subjectsLoading) {
    return (
      <ProfessionalShell>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </ProfessionalShell>
    );
  }

  return (
    <ProfessionalShell>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Gerenciar Tópicos
              </h1>
              <p className="text-muted-foreground mt-2">
                Organize os tópicos dentro de cada matéria
              </p>
            </div>
          </div>
        </div>

        {/* Subject Filter */}
        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Selecione uma Matéria
            </CardTitle>
            <CardDescription>
              Escolha a matéria para visualizar e gerenciar seus tópicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder="Selecione uma matéria..." />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id} data-testid={`select-item-subject-${subject.id}`}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Topics List */}
        {filterSubject && (
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 rounded-lg">
                    <List className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>
                      {selectedSubjectData?.name || 'Tópicos'}
                    </CardTitle>
                    <CardDescription>
                      {filteredTopics.length} tópico{filteredTopics.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleCreate} data-testid="button-create-topic">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tópico
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              {allTopics.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tópicos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-topics"
                    />
                  </div>
                </div>
              )}

              {topicsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredTopics.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-center py-8">
                    {searchQuery ? (
                      <>Nenhum tópico encontrado com "{searchQuery}"</>
                    ) : (
                      <>
                        Nenhum tópico cadastrado ainda.{' '}
                        <button
                          onClick={handleCreate}
                          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                        >
                          Crie o primeiro
                        </button>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((topic) => (
                    <ProfessionalCard
                      key={topic.id}
                      className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 dark:border-l-blue-400"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20 transition-colors">
                            <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate" data-testid={`text-topic-name-${topic.id}`}>
                              {topic.name}
                            </h3>
                            {topic.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {topic.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className="hidden sm:flex">
                            Ordem: {topic.order || 0}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(topic)}
                            data-testid={`button-edit-topic-${topic.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(topic.id)}
                            data-testid={`button-delete-topic-${topic.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </ProfessionalCard>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!filterSubject && (
          <Alert>
            <AlertDescription className="text-center py-8">
              Selecione uma matéria acima para visualizar e gerenciar seus tópicos
            </AlertDescription>
          </Alert>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTopic ? 'Editar Tópico' : 'Novo Tópico'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Tópico *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Equações de 2º grau"
                  required
                  data-testid="input-topic-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional do tópico..."
                  rows={3}
                  data-testid="input-topic-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Matéria *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                >
                  <SelectTrigger data-testid="select-topic-subject">
                    <SelectValue placeholder="Selecione a matéria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id} data-testid={`select-item-subject-form-${subject.id}`}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Ordem de Exibição</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-topic-order"
                />
                <p className="text-xs text-muted-foreground">
                  Números menores aparecem primeiro
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  data-testid="button-cancel-topic"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTopicMutation.isPending || updateTopicMutation.isPending}
                  data-testid="button-submit-topic"
                >
                  {selectedTopic ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProfessionalShell>
  );
}
