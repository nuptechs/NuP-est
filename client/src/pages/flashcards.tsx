/**
 * Flashcards - Clean, Simplified Creation & Study
 * Reduced from 774 lines to clean, professional UX
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Play,
  FileText,
  Upload,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  X
} from "lucide-react";
import type { FlashcardDeck, Flashcard, Subject, Material } from "@shared/schema";

const createDeckSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  flashcards: z.array(z.object({
    front: z.string().min(1, "Pergunta é obrigatória"),
    back: z.string().min(1, "Resposta é obrigatória"),
  })).min(1, "Adicione pelo menos 1 flashcard"),
});

const uploadFileSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  file: z.instanceof(File).refine((file) => file.size > 0, "Arquivo é obrigatório"),
  count: z.number().min(1).max(50).default(10),
});

const materialSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  materialId: z.string().min(1, "Material é obrigatório"),
  count: z.number().min(1).max(50).default(10),
});

type CreateDeckFormData = z.infer<typeof createDeckSchema>;
type UploadFileFormData = z.infer<typeof uploadFileSchema>;
type MaterialFormData = z.infer<typeof materialSchema>;

export default function Flashcards() {
  const [activeView, setActiveView] = useState<'decks' | 'study'>('decks');
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMethod, setCreateMethod] = useState<'manual' | 'upload' | 'material'>('manual');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: decks = [] } = useQuery<FlashcardDeck[]>({
    queryKey: ["/api/flashcard-decks"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"],
    enabled: !!selectedDeck?.id,
  });

  // Forms
  const manualForm = useForm<CreateDeckFormData>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: { 
      title: "", 
      description: "", 
      subjectId: "",
      flashcards: [{ front: "", back: "" }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: manualForm.control,
    name: "flashcards"
  });

  const uploadForm = useForm<UploadFileFormData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: { title: "", description: "", subjectId: "", count: 10 },
  });

  const materialForm = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: { title: "", description: "", subjectId: "", materialId: "", count: 10 },
  });

  // Mutations
  const createManual = useMutation({
    mutationFn: async (data: CreateDeckFormData) => {
      const response = await apiRequest("POST", "/api/flashcard-decks", {
        ...data,
        subjectId: data.subjectId || null,
      });
      return response.json();
    },
    onSuccess: (deck) => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      const cardCount = manualForm.getValues('flashcards').length;
      toast({ 
        title: "Sucesso", 
        description: `Deck criado com ${cardCount} flashcard${cardCount > 1 ? 's' : ''}!` 
      });
      setCreateModalOpen(false);
      setWizardStep(1);
      manualForm.reset({ 
        title: "", 
        description: "", 
        subjectId: "",
        flashcards: [{ front: "", back: "" }]
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar deck", variant: "destructive" });
    },
  });

  const createFromFile = useMutation({
    mutationFn: async (data: UploadFileFormData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      if (data.subjectId) formData.append('subjectId', data.subjectId);
      formData.append('count', data.count.toString());

      const response = await fetch('/api/ai/generate-flashcards', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao processar arquivo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({ title: "Sucesso", description: "Flashcards gerados do arquivo!" });
      setCreateModalOpen(false);
      uploadForm.reset();
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao gerar flashcards", variant: "destructive" });
    },
  });

  const createFromMaterial = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const response = await apiRequest("POST", "/api/ai/generate-flashcards-from-material", {
        ...data,
        subjectId: data.subjectId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({ title: "Sucesso", description: "Flashcards gerados do material!" });
      setCreateModalOpen(false);
      materialForm.reset();
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao gerar flashcards", variant: "destructive" });
    },
  });

  const handleStudy = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setCurrentIndex(0);
    setShowAnswer(false);
    setActiveView('study');
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  // Study View
  if (activeView === 'study' && selectedDeck && flashcards.length > 0) {
    const currentCard = flashcards[currentIndex];
    const progress = ((currentIndex + 1) / flashcards.length) * 100;

    return (
      <UnifiedShell title="Estudar Flashcards">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setActiveView('decks')}
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Meus Decks
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} / {flashcards.length}
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <Card className="min-h-[300px]">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center min-h-[250px]">
                {!showAnswer ? (
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-semibold">{currentCard.front}</h3>
                    <Button onClick={() => setShowAnswer(true)} data-testid="button-show-answer">
                      Mostrar Resposta
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Pergunta:</p>
                      <h3 className="text-xl font-semibold">{currentCard.front}</h3>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Resposta:</p>
                      <p className="text-lg">{currentCard.back}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentIndex(0);
                setShowAnswer(false);
              }}
              data-testid="button-restart"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Recomeçar
            </Button>

            <Button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              data-testid="button-next"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </UnifiedShell>
    );
  }

  // Decks View
  return (
    <UnifiedShell
      title="Flashcards"
      actions={
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create">
              <Plus className="h-4 w-4 mr-2" />
              Criar Deck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Deck de Flashcards</DialogTitle>
              <DialogDescription>
                Escolha como deseja criar seu deck
              </DialogDescription>
            </DialogHeader>

            {/* Method Selection */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant={createMethod === 'manual' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('manual')}
                className="flex-col h-auto py-4"
                data-testid="button-method-manual"
              >
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-xs">Manual</span>
              </Button>
              <Button
                variant={createMethod === 'upload' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('upload')}
                className="flex-col h-auto py-4"
                data-testid="button-method-upload"
              >
                <Upload className="h-6 w-6 mb-2" />
                <span className="text-xs">Upload</span>
              </Button>
              <Button
                variant={createMethod === 'material' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('material')}
                className="flex-col h-auto py-4"
                data-testid="button-method-material"
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-xs">Material</span>
              </Button>
            </div>

            {/* Forms */}
            {createMethod === 'manual' && (
              <Form {...manualForm}>
                <form onSubmit={manualForm.handleSubmit((data) => createManual.mutate(data))} className="space-y-4">
                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${wizardStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      1
                    </div>
                    <div className="flex-1 h-1 bg-muted">
                      <div className={`h-full bg-primary transition-all ${wizardStep === 2 ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${wizardStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      2
                    </div>
                  </div>

                  {/* Step 1: Deck metadata */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <FormField control={manualForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Deck</FormLabel>
                          <FormControl><Input {...field} data-testid="input-title" placeholder="Ex: Verbos Irregulares" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={manualForm.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (opcional)</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Breve descrição do deck" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={manualForm.control} name="subjectId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matéria (opcional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecionar matéria" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button 
                        type="button" 
                        className="w-full"
                        onClick={() => {
                          const title = manualForm.getValues('title');
                          if (!title) {
                            manualForm.setError('title', { message: 'Título é obrigatório' });
                            return;
                          }
                          setWizardStep(2);
                        }}
                        data-testid="button-next-step"
                      >
                        Próximo: Adicionar Flashcards
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Flashcards */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Adicione pelo menos 1 flashcard
                        </p>
                        <Badge variant="outline">{fields.length} card{fields.length > 1 ? 's' : ''}</Badge>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-3">
                                <FormField
                                  control={manualForm.control}
                                  name={`flashcards.${index}.front`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Pergunta {index + 1}</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Digite a pergunta" data-testid={`input-question-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={manualForm.control}
                                  name={`flashcards.${index}.back`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Resposta {index + 1}</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} placeholder="Digite a resposta" rows={2} data-testid={`input-answer-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  data-testid={`button-remove-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => append({ front: "", back: "" })}
                        data-testid="button-add-flashcard"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Flashcard
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWizardStep(1)}
                          data-testid="button-back-step"
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Voltar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1" 
                          disabled={createManual.isPending}
                          data-testid="button-create-deck"
                        >
                          Criar Deck ({fields.length} card{fields.length > 1 ? 's' : ''})
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            )}

            {createMethod === 'upload' && (
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit((data) => createFromFile.mutate(data))} className="space-y-4">
                  <FormField control={uploadForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={uploadForm.control} name="file" render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Arquivo</FormLabel>
                      <FormControl>
                        <Input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => onChange(e.target.files?.[0])} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={uploadForm.control} name="count" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade (1-50)</FormLabel>
                      <FormControl><Input type="number" min={1} max={50} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createFromFile.isPending}>Gerar Flashcards</Button>
                </form>
              </Form>
            )}

            {createMethod === 'material' && (
              <Form {...materialForm}>
                <form onSubmit={materialForm.handleSubmit((data) => createFromMaterial.mutate(data))} className="space-y-4">
                  <FormField control={materialForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={materialForm.control} name="materialId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecionar material" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {materials.map((m) => (<SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={materialForm.control} name="count" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade (1-50)</FormLabel>
                      <FormControl><Input type="number" min={1} max={50} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createFromMaterial.isPending}>Gerar Flashcards</Button>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ModernPageHeader
          title="Meus Decks"
          description={`${decks.length} decks de flashcards`}
          icon={CreditCard}
        />

        {decks.length === 0 ? (
          <ModernEmptyState
            icon={CreditCard}
            title="Nenhum deck criado"
            description="Crie seu primeiro deck de flashcards para começar a estudar."
            action={{
              label: "Criar Deck",
              onClick: () => setCreateModalOpen(true)
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-md transition-shadow" data-testid={`deck-${deck.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{deck.title}</h3>
                      {deck.description && (
                        <p className="text-sm text-muted-foreground">{deck.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{deck.totalCards || 0} cards</Badge>
                      {(deck.studiedCards || 0) > 0 && (
                        <Badge variant="secondary">{deck.studiedCards} estudados</Badge>
                      )}
                    </div>

                    {(deck.totalCards || 0) > 0 && (
                      <Progress value={((deck.studiedCards || 0) / (deck.totalCards || 1)) * 100} className="h-2" />
                    )}

                    <Button
                      onClick={() => handleStudy(deck)}
                      className="w-full"
                      disabled={(deck.totalCards || 0) === 0}
                      data-testid={`button-study-${deck.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Estudar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </UnifiedShell>
  );
}
