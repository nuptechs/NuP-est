/**
 * Flashcards - Clean, Simplified Creation & Study
 * Reduced from 774 lines to clean, professional UX
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
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
  RotateCcw
} from "lucide-react";
import type { FlashcardDeck, Flashcard, Subject, Material } from "@shared/schema";
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
    defaultValues: { title: "", description: "", subjectId: "" },
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
        totalCards: 0,
        studiedCards: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({ title: "Sucesso", description: "Deck criado!" });
      setCreateModalOpen(false);
      manualForm.reset();
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

          <ModernFlashcard
            question={currentCard.question}
            answer={currentCard.answer}
            showAnswer={showAnswer}
            onToggle={() => setShowAnswer(!showAnswer)}
          />

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
                  <FormField control={manualForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl><Input {...field} data-testid="input-title" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="subjectId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matéria (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createManual.isPending}>Criar Deck</Button>
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
                      <Badge variant="outline">{deck.totalCards} cards</Badge>
                      {deck.studiedCards > 0 && (
                        <Badge variant="secondary">{deck.studiedCards} estudados</Badge>
                      )}
                    </div>

                    {deck.totalCards > 0 && (
                      <Progress value={(deck.studiedCards / deck.totalCards) * 100} className="h-2" />
                    )}

                    <Button
                      onClick={() => handleStudy(deck)}
                      className="w-full"
                      disabled={deck.totalCards === 0}
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
