/**
 * Topics - Clean Master-Detail Layout
 * Simplified from 501 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  List,
  Search,
  ChevronRight
} from "lucide-react";
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
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: subjects = [] } = useQuery<Subject[]>({
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
    mutationFn: async (data: TopicFormData) => apiRequest("POST", "/api/topics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Tópico criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar tópico", variant: "destructive" }),
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TopicFormData> }) => 
      apiRequest("PATCH", `/api/topics/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setIsModalOpen(false);
      setSelectedTopic(null);
      resetForm();
      toast({ title: "Tópico atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar tópico", variant: "destructive" }),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/topics/${id}`, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({ title: "Tópico deletado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao deletar tópico", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', subjectId: filterSubject || '', order: 0 });
    setSelectedTopic(null);
  };

  const handleCreate = () => {
    resetForm();
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
        toast({ title: error.errors[0].message, variant: "destructive" });
      }
    }
  };

  const filteredTopics = allTopics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const selectedSubjectData = subjects.find(s => s.id === filterSubject);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <UnifiedShell title="Tópicos">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Page Header */}
        <ModernPageHeader
          title="Gerenciar Tópicos"
          description="Organize os tópicos dentro de cada matéria"
          icon={List}
        />

        {/* Subject Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Selecione uma Matéria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder="Escolha uma matéria..." />
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedSubjectData?.name || 'Tópicos'}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredTopics.length} tópico{filteredTopics.length !== 1 ? 's' : ''}
                  </p>
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
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredTopics.length === 0 ? (
                <ModernEmptyState
                  icon={List}
                  title={searchQuery ? "Nenhum tópico encontrado" : "Nenhum tópico cadastrado"}
                  description={searchQuery ? `Tente outro termo de busca` : "Crie o primeiro tópico"}
                />
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" data-testid={`text-topic-name-${topic.id}`}>
                            {topic.name}
                          </h3>
                          {topic.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className="hidden sm:flex">
                          {topic.order || 0}
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!filterSubject && (
          <ModernEmptyState
            icon={BookOpen}
            title="Selecione uma matéria"
            description="Escolha uma matéria acima para visualizar seus tópicos"
          />
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTopic ? 'Editar Tópico' : 'Novo Tópico'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
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
                  placeholder="Descrição opcional..."
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
                    <SelectValue placeholder="Selecione..." />
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
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-topic-order"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} data-testid="button-cancel-topic">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTopicMutation.isPending || updateTopicMutation.isPending} data-testid="button-submit-topic">
                  {selectedTopic ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </UnifiedShell>
  );
}
