/**
 * GenerateFlashcardsFromMaterialDialog
 * 
 * Dialog for generating flashcards from study materials with granular section selection
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, FileText, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@nup/ui";
import { useLocation } from "wouter";
import { useDocumentOutline } from "@/hooks/useDocumentOutline";
import { OutlineSectionSelector } from "@/components/OutlineSectionSelector";

interface GenerateFlashcardsFromMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  materialTitle: string;
}

export default function GenerateFlashcardsFromMaterialDialog({
  open,
  onOpenChange,
  materialId,
  materialTitle,
}: GenerateFlashcardsFromMaterialDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [maxCards, setMaxCards] = useState<string>("15");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [useFullDocument, setUseFullDocument] = useState(true);

  const { data: decks = [] } = useQuery<any[]>({
    queryKey: ["/api/flashcard-decks"],
  });

  const { 
    data: outlineData, 
    isLoading: isLoadingOutline,
    error: outlineError 
  } = useDocumentOutline(materialId);

  const hasOutline = outlineData?.hasOutline && outlineData?.outline?.structure?.length > 0;

  useEffect(() => {
    if (hasOutline && outlineData?.outline?.structure) {
      const allIds = getAllNodeIds(outlineData.outline.structure);
      setSelectedSections(allIds);
      setUseFullDocument(false);
    }
  }, [hasOutline, outlineData]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeckId) {
        throw new Error("Por favor, selecione um baralho");
      }

      if (!useFullDocument && selectedSections.length === 0) {
        throw new Error("Selecione pelo menos uma seção ou use o documento completo");
      }

      const response = await apiRequest("POST", "/api/flashcards/generate-from-material", {
        materialId,
        deckId: selectedDeckId,
        difficulty,
        maxCards: parseInt(maxCards),
        selectedSections: useFullDocument ? null : selectedSections,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Flashcards gerados com sucesso!",
        description: `${data.count} flashcards foram criados. Redirecionando...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      
      setTimeout(() => {
        setLocation("/flashcards");
        onOpenChange(false);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar flashcards",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  function getAllNodeIds(nodes: any[]): string[] {
    const ids: string[] = [];
    
    function traverse(node: any) {
      ids.push(node.id);
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
    
    for (const node of nodes) {
      traverse(node);
    }
    
    return ids;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Flashcards do Material
          </DialogTitle>
          <DialogDescription>
            {materialTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deck">Baralho de Destino</Label>
            <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
              <SelectTrigger id="deck" data-testid="select-deck">
                <SelectValue placeholder="Selecione um baralho" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((deck: any) => (
                  <SelectItem key={deck.id} value={deck.id}>
                    {deck.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {decks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Você precisa criar um baralho primeiro
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Conteúdo a Gerar</Label>
            <Tabs 
              value={useFullDocument ? "full" : "sections"} 
              onValueChange={(v) => setUseFullDocument(v === "full")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="full" data-testid="tab-full-document">
                  <FileText className="w-4 h-4 mr-2" />
                  Documento Completo
                </TabsTrigger>
                <TabsTrigger 
                  value="sections" 
                  disabled={!hasOutline}
                  data-testid="tab-select-sections"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Selecionar Seções
                </TabsTrigger>
              </TabsList>

              <TabsContent value="full" className="mt-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Flashcards serão gerados a partir de todo o conteúdo do material.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="sections" className="mt-4 space-y-3">
                {isLoadingOutline ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : outlineError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Erro ao carregar estrutura do documento. Use o documento completo.
                    </AlertDescription>
                  </Alert>
                ) : hasOutline && outlineData?.outline ? (
                  <>
                    <Alert>
                      <BookOpen className="h-4 w-4" />
                      <AlertDescription>
                        Selecione os capítulos e seções específicas para gerar flashcards direcionados.
                      </AlertDescription>
                    </Alert>
                    <OutlineSectionSelector
                      nodes={outlineData.outline.structure}
                      selectedSections={selectedSections}
                      onSelectionChange={setSelectedSections}
                    />
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Este material não possui uma estrutura de capítulos detectada.
                      Use o documento completo.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificuldade</Label>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger id="difficulty" data-testid="select-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCards">Quantidade</Label>
              <Select value={maxCards} onValueChange={setMaxCards}>
                <SelectTrigger id="maxCards" data-testid="select-max-cards">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 cards</SelectItem>
                  <SelectItem value="15">15 cards</SelectItem>
                  <SelectItem value="20">20 cards</SelectItem>
                  <SelectItem value="30">30 cards</SelectItem>
                  <SelectItem value="50">50 cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generateMutation.isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={
              !selectedDeckId || 
              generateMutation.isPending || 
              (!useFullDocument && selectedSections.length === 0)
            }
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Flashcards
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
