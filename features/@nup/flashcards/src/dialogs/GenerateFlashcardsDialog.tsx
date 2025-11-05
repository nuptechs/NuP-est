/**
 * GenerateFlashcardsDialog - FASE 3: Mind Map → Flashcards
 * Dialog for generating flashcards from a mind map
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@nup/api-client";
import { 
  useToast, 
  Button, 
  Label, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@nup/ui";
import { Loader2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface GenerateFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mindMapId: string;
  mindMapData: {
    nodes: any[];
    edges: any[];
  };
}

export default function GenerateFlashcardsDialog({
  open,
  onOpenChange,
  mindMapId,
  mindMapData,
}: GenerateFlashcardsDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [maxCards, setMaxCards] = useState<string>("15");

  // Fetch user's flashcard decks
  const { data: decks = [] } = useQuery<any[]>({
    queryKey: ["/api/flashcard-decks"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeckId) {
        throw new Error("Por favor, selecione um baralho");
      }

      const response = await apiRequest("POST", "/api/flashcards/generate-from-mindmap", {
        mindMapId,
        deckId: selectedDeckId,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        difficulty,
        maxCards: parseInt(maxCards),
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
      
      // Redirect to flashcards page
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Flashcards do Mapa Mental
          </DialogTitle>
          <DialogDescription>
            Use IA para criar flashcards inteligentes baseados neste mapa mental
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Deck Selection */}
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

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Nível de Dificuldade</Label>
            <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
              <SelectTrigger id="difficulty" data-testid="select-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Fácil - Conceitos básicos</SelectItem>
                <SelectItem value="medium">Médio - Balanceado</SelectItem>
                <SelectItem value="hard">Difícil - Conexões avançadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Cards */}
          <div className="space-y-2">
            <Label htmlFor="maxCards">Número de Flashcards</Label>
            <Select value={maxCards} onValueChange={setMaxCards}>
              <SelectTrigger id="maxCards" data-testid="select-max-cards">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 flashcards</SelectItem>
                <SelectItem value="15">15 flashcards</SelectItem>
                <SelectItem value="20">20 flashcards</SelectItem>
                <SelectItem value="30">30 flashcards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">ℹ️ Como funciona:</strong><br />
              A IA analisará a estrutura hierárquica do seu mapa mental e criará
              flashcards que cobrem os principais conceitos e suas relações.
            </p>
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
            disabled={!selectedDeckId || generateMutation.isPending}
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
