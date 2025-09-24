import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  BookOpen,
  Upload,
  Play,
  Brain,
  FileText,
  Folder,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw
} from "lucide-react";
import type { FlashcardDeck, Flashcard, Subject, Material } from "@shared/schema";
import ModernFlashcard from "@/components/flashcard/ModernFlashcard";
import { cn } from "@/lib/utils";

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

export default function FlashcardsModernPage() {
  const [activeTab, setActiveTab] = useState("decks");
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
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

  // Create deck form
  const createForm = useForm<CreateDeckFormData>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
    },
  });

  // Upload file form
  const uploadForm = useForm<UploadFileFormData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      count: 10,
    },
  });

  // Material form
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
      setCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar deck de flashcards",
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: UploadFileFormData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('subjectId', data.subjectId || '');
      formData.append('count', data.count.toString());

      const response = await fetch('/api/flashcard-decks/generate-from-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar arquivo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados com sucesso a partir do arquivo!",
      });
      setUploadModalOpen(false);
      uploadForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar flashcards do arquivo",
        variant: "destructive",
      });
    },
  });

  // Generate from material mutation
  const generateFromMaterialMutation = useMutation({
    mutationFn: async (data: MaterialFlashcardFormData) => {
      const response = await apiRequest("POST", "/api/flashcard-decks/generate-from-material", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados com sucesso a partir do material!",
      });
      setMaterialModalOpen(false);
      materialForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar flashcards do material",
        variant: "destructive",
      });
    },
  });

  const handleDeckClick = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setCurrentFlashcardIndex(0);
    setShowAnswer(false);
    setActiveTab("study");
  };

  const handleNextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setShowAnswer(false);
    }
  };

  const onCreateSubmit = (data: CreateDeckFormData) => {
    createDeckMutation.mutate(data);
  };

  const onUploadSubmit = (data: UploadFileFormData) => {
    uploadFileMutation.mutate(data);
  };

  const onMaterialSubmit = (data: MaterialFlashcardFormData) => {
    generateFromMaterialMutation.mutate(data);
  };

  return (
    <ProfessionalShell
      title="Flashcards"
      subtitle="Crie e estude com flashcards inteligentes"
      breadcrumbs={[
        { label: "Estudar", href: "/study" },
        { label: "Flashcards" }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-deck">
                <Plus className="w-4 h-4 mr-2" />
                Novo Deck
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Deck</DialogTitle>
                <DialogDescription>
                  Crie um deck personalizado de flashcards para seus estudos
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do deck" {...field} data-testid="input-deck-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição <span className="text-muted-foreground">(opcional)</span></FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descrição do deck" {...field} data-testid="textarea-deck-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matéria <span className="text-muted-foreground">(opcional)</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deck-subject">
                              <SelectValue placeholder="Selecione uma matéria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateModalOpen(false)}
                      data-testid="button-cancel-deck"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createDeckMutation.isPending} data-testid="button-submit-deck">
                      {createDeckMutation.isPending ? "Criando..." : "Criar Deck"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="decks" className="flex items-center space-x-2" data-testid="tab-decks">
              <Folder className="w-4 h-4" />
              <span>Meus Decks</span>
            </TabsTrigger>
            <TabsTrigger value="study" className="flex items-center space-x-2" data-testid="tab-study">
              <Play className="w-4 h-4" />
              <span>Estudar</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center space-x-2" data-testid="tab-review">
              <RefreshCw className="w-4 h-4" />
              <span>Revisão</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decks" className="mt-6">
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-upload-file">
                      <Upload className="w-4 h-4 mr-2" />
                      Gerar do Arquivo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Gerar Flashcards do Arquivo</DialogTitle>
                      <DialogDescription>
                        Envie um arquivo e a IA criará flashcards automaticamente
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...uploadForm}>
                      <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-4">
                        <FormField
                          control={uploadForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título do Deck</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do deck" {...field} data-testid="input-upload-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={uploadForm.control}
                          name="file"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <FormLabel>Arquivo</FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.md"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onChange(file);
                                  }}
                                  data-testid="input-upload-file"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>Arquivos suportados: PDF, DOC, DOCX, TXT, MD</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={uploadForm.control}
                          name="count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Flashcards</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-upload-count"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={uploadForm.control}
                          name="subjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Matéria <span className="text-muted-foreground">(opcional)</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-upload-subject">
                                    <SelectValue placeholder="Selecione uma matéria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setUploadModalOpen(false)}
                            data-testid="button-cancel-upload"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={uploadFileMutation.isPending} data-testid="button-submit-upload">
                            {uploadFileMutation.isPending ? "Gerando..." : "Gerar Flashcards"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-generate-material">
                      <Brain className="w-4 h-4 mr-2" />
                      Gerar da Biblioteca
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Gerar Flashcards da Biblioteca</DialogTitle>
                      <DialogDescription>
                        Selecione um material da sua biblioteca para gerar flashcards
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...materialForm}>
                      <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-4">
                        <FormField
                          control={materialForm.control}
                          name="materialId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-material">
                                    <SelectValue placeholder="Selecione um material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {materials.map((material) => (
                                    <SelectItem key={material.id} value={material.id}>
                                      {material.title}
                                    </SelectItem>
                                  ))}
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
                                <Input placeholder="Nome do deck" {...field} data-testid="input-material-title" />
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
                              <FormLabel>Número de Flashcards</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-material-count"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={materialForm.control}
                          name="subjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Matéria <span className="text-muted-foreground">(opcional)</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-material-subject">
                                    <SelectValue placeholder="Selecione uma matéria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setMaterialModalOpen(false)}
                            data-testid="button-cancel-material"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={generateFromMaterialMutation.isPending} data-testid="button-submit-material">
                            {generateFromMaterialMutation.isPending ? "Gerando..." : "Gerar Flashcards"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Decks Grid */}
              {decksLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-3 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : decks.length === 0 ? (
                <Alert>
                  <BookOpen className="h-4 w-4" />
                  <AlertTitle>Nenhum deck encontrado</AlertTitle>
                  <AlertDescription>
                    Crie seu primeiro deck de flashcards para começar a estudar!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {decks.map((deck) => (
                    <ProfessionalCard
                      key={deck.id}
                      title={deck.title}
                      description={deck.description ? (
                        deck.description.length > 100 
                          ? deck.description.substring(0, 100) + '...'
                          : deck.description
                      ) : undefined}
                      subtitle={`${deck.totalCards || 0} cards • ${deck.studiedCards || 0} estudados`}
                      icon={<BookOpen className="w-5 h-5 text-primary" />}
                      footer={
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="rounded-md px-2 py-1 text-xs font-medium">
                              {deck.totalCards || 0} cards
                            </Badge>
                            {(deck.totalCards || 0) > 0 ? (
                              <Badge variant="secondary" className="rounded-md px-2 py-1 text-xs font-medium border border-border">
                                {Math.round(((deck.studiedCards || 0) / (deck.totalCards || 1)) * 100)}% completo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-md px-2 py-1 text-xs font-medium">Novo</Badge>
                            )}
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleDeckClick(deck)}
                            data-testid={`button-study-${deck.id}`}
                            className="flex-shrink-0"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Estudar
                          </Button>
                        </div>
                      }
                      className="transition-all hover:shadow-lg h-full flex flex-col"
                      data-testid={`deck-card-${deck.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="study" className="mt-6">
            {selectedDeck && flashcards.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{selectedDeck.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {currentFlashcardIndex + 1} de {flashcards.length} flashcards
                      </p>
                    </div>
                    <Badge variant="outline">
                      {Math.round(((currentFlashcardIndex + 1) / flashcards.length) * 100)}%
                    </Badge>
                  </div>
                  
                  <Progress value={((currentFlashcardIndex + 1) / flashcards.length) * 100} className="w-full" />
                </div>

                <ModernFlashcard
                  flashcards={flashcards}
                  currentIndex={currentFlashcardIndex}
                  onNext={handleNextFlashcard}
                  onPrevious={handlePreviousFlashcard}
                  onComplete={(flashcardId, difficulty) => {
                    console.log('Flashcard completed:', flashcardId, difficulty);
                  }}
                />
              </div>
            ) : (
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertTitle>Selecione um deck</AlertTitle>
                <AlertDescription>
                  Escolha um deck na aba "Meus Decks" para começar a estudar.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Flashcards para Revisão</h3>
              {reviewFlashcards.length === 0 ? (
                <Alert>
                  <RotateCcw className="h-4 w-4" />
                  <AlertTitle>Nenhum flashcard para revisão</AlertTitle>
                  <AlertDescription>
                    Continue estudando para ter cards disponíveis para revisão!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    {reviewFlashcards.length} flashcards prontos para revisão
                  </p>
                  {/* Review interface would go here */}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProfessionalShell>
  );
}