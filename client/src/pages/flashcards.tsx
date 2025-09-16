import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Plus, BookOpen, Upload, Play, Edit, Trash2, Brain, FileText, Folder } from "lucide-react";
import type { FlashcardDeck, Flashcard, Subject, Material } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ModernFlashcard from "@/components/flashcard/ModernFlashcard";

const createDeckSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
});

const uploadFileSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  file: z.instanceof(File).refine((file) => file.size > 0, "Arquivo é obrigatório"),
  count: z.number().min(1, "Mínimo 1 flashcard").max(50, "Máximo 50 flashcards").default(10),
});

const materialFlashcardSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  materialId: z.string().min(1, "Material é obrigatório"),
  count: z.number().min(1, "Mínimo 1 flashcard").max(50, "Máximo 50 flashcards").default(10),
});

type CreateDeckFormData = z.infer<typeof createDeckSchema>;
type UploadFileFormData = z.infer<typeof uploadFileSchema>;
type MaterialFlashcardFormData = z.infer<typeof materialFlashcardSchema>;

// Função para decodificar conteúdo de flashcards (resolve problemas de escapes duplos)
const decodeFlashcardContent = (content: string): string => {
  if (!content) return '';
  
  try {
    // Método 1: Tentativa segura usando JSON.parse para decodificação automática
    const jsonString = `"${content.replace(/"/g, '\\"')}"`;
    const decoded = JSON.parse(jsonString);
    return decoded.trim();
  } catch {
    // Método 2: Fallback manual com ordem correta (barras primeiro)
    return content
      .replace(/\\\\/g, '\x00TEMP_BACKSLASH\x00')  // Preservar \\ temporariamente
      .replace(/\\n/g, '\n')                       // \\n -> \n (quebras)
      .replace(/\\t/g, '\t')                       // \\t -> \t (tabs)
      .replace(/\\r/g, '\r')                       // \\r -> \r (carriage return)
      .replace(/\\"/g, '"')                        // \\" -> " (aspas)
      .replace(/\x00TEMP_BACKSLASH\x00/g, '\\')    // Restaurar \\ únicos
      .trim();
  }
};

export default function FlashcardsPage() {
  const [activeTab, setActiveTab] = useState("decks");
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch flashcard decks
  const { data: decks = [], isLoading: decksLoading } = useQuery<FlashcardDeck[]>({
    queryKey: ["/api/flashcard-decks"],
  });

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch materials for dropdown
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Fetch flashcards for selected deck
  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"],
    enabled: !!selectedDeck?.id,
  });

  // Fetch flashcards for review
  const { data: reviewFlashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcards/review"],
  });

  // Create deck mutation
  const createDeckMutation = useMutation({
    mutationFn: async (data: CreateDeckFormData) => {
      const response = await apiRequest("POST", "/api/flashcard-decks", {
        ...data,
        totalCards: 0,
        studiedCards: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Deck de flashcards criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar deck: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: UploadFileFormData) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("title", data.title);
      formData.append("count", data.count.toString());
      if (data.description) formData.append("description", data.description);
      if (data.subjectId) formData.append("subjectId", data.subjectId);

      const response = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao gerar flashcards");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados automaticamente com IA!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao gerar flashcards: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Delete deck mutation
  const deleteDeckMutation = useMutation({
    mutationFn: async (deckId: string) => {
      return apiRequest("DELETE", `/api/flashcard-decks/${deckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      setSelectedDeck(null);
      toast({
        title: "Sucesso",
        description: "Deck excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir deck: " + error.message,
        variant: "destructive",
      });
    },
  });

  const createDeckForm = useForm<CreateDeckFormData>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
    },
  });

  const uploadFileForm = useForm<UploadFileFormData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      count: 10,
    },
  });

  const materialForm = useForm<MaterialFlashcardFormData>({
    resolver: zodResolver(materialFlashcardSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      materialId: "",
      count: 10,
    },
  });

  const handleCreateDeck = (data: CreateDeckFormData) => {
    createDeckMutation.mutate(data);
    createDeckForm.reset();
  };

  const handleUploadFile = (data: UploadFileFormData) => {
    uploadFileMutation.mutate(data);
    uploadFileForm.reset();
  };

  // Generate flashcards from material mutation
  const materialMutation = useMutation({
    mutationFn: async (data: MaterialFlashcardFormData) => {
      const response = await apiRequest("POST", "/api/ai/generate-flashcards-from-material", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados com sucesso a partir do material!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao gerar flashcards: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateFromMaterial = (data: MaterialFlashcardFormData) => {
    materialMutation.mutate(data);
    materialForm.reset();
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return "Geral";
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "Desconhecido";
  };

  const getProgressPercentage = (deck: FlashcardDeck) => {
    const totalCards = deck.totalCards || 0;
    const studiedCards = deck.studiedCards || 0;
    return totalCards > 0 ? (studiedCards / totalCards) * 100 : 0;
  };

  const handleStartStudy = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setCurrentFlashcardIndex(0);
    setShowAnswer(false);
    setActiveTab("study");
  };

  const handleNextCard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Finish study session
      setSelectedDeck(null);
      setActiveTab("decks");
      toast({
        title: "Parabéns!",
        description: "Você terminou de estudar todos os flashcards deste deck!",
      });
    }
  };

  const handlePrevCard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const handleBackToDecks = () => {
    setSelectedDeck(null);
    setActiveTab("decks");
  };

  // If studying a deck, show study interface
  if (selectedDeck && activeTab === "study") {
    const currentCard = flashcards[currentFlashcardIndex];

    if (!flashcards || flashcards.length === 0) {
      return (
        <div className="container mx-auto p-6" data-testid="flashcards-study">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-semibold mb-4">{selectedDeck.title}</h2>
              <p className="text-muted-foreground mb-4">
                Este deck ainda não possui flashcards.
              </p>
              <Button onClick={handleBackToDecks}>
                Voltar aos Decks
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6" data-testid="flashcards-study">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{selectedDeck.title}</h1>
            <p className="text-muted-foreground">
              {selectedDeck.description}
            </p>
          </div>
          <Button variant="outline" onClick={handleBackToDecks}>
            Voltar aos Decks
          </Button>
        </div>

        <ModernFlashcard
          flashcards={flashcards}
          currentIndex={currentFlashcardIndex}
          onNext={handleNextCard}
          onPrevious={handlePrevCard}
          onComplete={(flashcardId, difficulty) => {
            // TODO: Implementar salvamento da dificuldade no backend
            console.log(`Flashcard ${flashcardId} marcado com dificuldade ${difficulty}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="flashcards-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
        <p className="text-muted-foreground">
          Crie e estude com flashcards personalizados. Use IA para gerar flashcards automaticamente.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="decks" data-testid="tab-decks">
            <BookOpen className="w-4 h-4 mr-2" />
            Meus Decks
          </TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            <Brain className="w-4 h-4 mr-2" />
            Para Revisar
          </TabsTrigger>
          <TabsTrigger value="create" data-testid="tab-create">
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Meus Decks de Flashcards</h2>
          </div>

          {decksLoading ? (
            <div data-testid="loading-decks">Carregando decks...</div>
          ) : !decks || decks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem nenhum deck de flashcards.
                </p>
                <Button onClick={() => setActiveTab("create")} data-testid="button-create-first-deck">
                  Criar Primeiro Deck
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {decks?.map((deck: FlashcardDeck) => (
                <Card key={deck.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`deck-card-${deck.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deck.title}</CardTitle>
                        <CardDescription>{deck.description}</CardDescription>
                      </div>
                      <Badge variant="secondary" data-testid={`deck-subject-${deck.id}`}>
                        {getSubjectName(deck.subjectId)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{deck.studiedCards}/{deck.totalCards} cards</span>
                      </div>
                      <Progress value={getProgressPercentage(deck)} className="h-2" />
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStartStudy(deck)}
                          data-testid={`button-view-deck-${deck.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Estudar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedDeck(deck)}
                          data-testid={`button-edit-deck-${deck.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteDeckMutation.mutate(deck.id)}
                          data-testid={`button-delete-deck-${deck.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Flashcards para Revisar</h2>
            <Badge variant="secondary" data-testid="review-count">
              {reviewFlashcards.length} cards
            </Badge>
          </div>

          {reviewFlashcards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Não há flashcards para revisar agora.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewFlashcards.map((flashcard: Flashcard) => (
                <Card key={flashcard.id} data-testid={`review-card-${flashcard.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{flashcard.front}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" data-testid={`button-review-${flashcard.id}`}>
                      Revisar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Manual Deck Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Criar Deck Manual
                </CardTitle>
                <CardDescription>
                  Crie um deck vazio e adicione flashcards manualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createDeckForm}>
                  <form onSubmit={createDeckForm.handleSubmit(handleCreateDeck)} className="space-y-4">
                    <FormField
                      control={createDeckForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do deck..." {...field} data-testid="input-deck-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createDeckForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do deck..." {...field} data-testid="input-deck-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createDeckForm.control}
                      name="subjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matéria (Opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-deck-subject">
                                <SelectValue placeholder="Selecione uma matéria..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma matéria</SelectItem>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createDeckMutation.isPending}
                      data-testid="button-create-deck"
                    >
                      {createDeckMutation.isPending ? "Criando..." : "Criar Deck"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* AI Deck Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Gerar com IA
                </CardTitle>
                <CardDescription>
                  Envie um arquivo e a IA criará flashcards automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...uploadFileForm}>
                  <form onSubmit={uploadFileForm.handleSubmit(handleUploadFile)} className="space-y-4">
                    <FormField
                      control={uploadFileForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Deck</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do deck..." {...field} data-testid="input-ai-deck-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadFileForm.control}
                      name="file"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel>Arquivo de Estudo</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".txt,.md,.pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onChange(file);
                              }}
                              {...field}
                              data-testid="input-file-upload"
                            />
                          </FormControl>
                          <FormDescription>
                            Suporte: TXT, MD, PDF, DOC, DOCX (máx. 10MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadFileForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do deck..." {...field} data-testid="input-ai-deck-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadFileForm.control}
                      name="subjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matéria (Opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ai-deck-subject">
                                <SelectValue placeholder="Selecione uma matéria..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma matéria</SelectItem>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadFileForm.control}
                      name="count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Flashcards</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="50" 
                              placeholder="10" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-flashcard-count" 
                            />
                          </FormControl>
                          <FormDescription>
                            Entre 1 e 50 flashcards (padrão: 10)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={uploadFileMutation.isPending}
                      data-testid="button-generate-ai-deck"
                    >
                      {uploadFileMutation.isPending ? "Gerando..." : "Gerar Flashcards com IA"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Generate from Existing Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Gerar de Materiais
                </CardTitle>
                <CardDescription>
                  Use materiais já carregados para criar flashcards com IA
                  {materials.length === 0 && (
                    <div className="mt-2 text-sm text-orange-600">
                      ⚠️ Você ainda não tem materiais. Vá para a seção "Materiais" ou "Base de Conhecimento" para adicionar conteúdo primeiro.
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...materialForm}>
                  <form onSubmit={materialForm.handleSubmit(handleGenerateFromMaterial)} className="space-y-4">
                    <FormField
                      control={materialForm.control}
                      name="materialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-material">
                                <SelectValue placeholder="Selecione um material..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {materials.length === 0 ? (
                                <SelectItem value="no-materials" disabled>
                                  Nenhum material encontrado
                                </SelectItem>
                              ) : (
                                materials.map((material) => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.title}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={materialForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Deck</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do deck..." {...field} data-testid="input-material-deck-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={materialForm.control}
                      name="count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Flashcards</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="50" 
                              placeholder="10" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-material-flashcard-count" 
                            />
                          </FormControl>
                          <FormDescription>
                            Entre 1 e 50 flashcards (padrão: 10)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={materialForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do deck..." {...field} data-testid="input-material-deck-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={materialMutation.isPending}
                      data-testid="button-generate-material-deck"
                    >
                      {materialMutation.isPending ? "Gerando..." : "Gerar de Material"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <DashboardIcon />
    </div>
  );
}