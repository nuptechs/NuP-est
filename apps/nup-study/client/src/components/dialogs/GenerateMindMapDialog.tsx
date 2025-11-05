/**
 * GenerateMindMapDialog - FASE 3: Flashcards → Mind Map
 * Dialog for generating mind map from flashcards
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@nup/ui";
import { useLocation } from "wouter";

interface GenerateMindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  deckTitle: string;
}

export default function GenerateMindMapDialog({
  open,
  onOpenChange,
  deckId,
  deckTitle,
}: GenerateMindMapDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState<string>(`Mapa Mental - ${deckTitle}`);
  const [layout, setLayout] = useState<"horizontal" | "vertical" | "radial">("horizontal");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mindmaps/generate-from-flashcards", {
        deckId,
        title,
        layout,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Mapa mental gerado com sucesso!",
        description: "Redirecionando para visualizar o mapa...",
      });
      
      // Store the mind map ID to auto-open after redirect
      if (data.mindMap && data.mindMap.id) {
        sessionStorage.setItem("openMindMapId", data.mindMap.id);
      }
      
      // Redirect to mind maps page
      setTimeout(() => {
        setLocation("/mind-maps");
        onOpenChange(false);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar mapa mental",
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
            Gerar Mapa Mental dos Flashcards
          </DialogTitle>
          <DialogDescription>
            Crie um mapa mental hierárquico a partir dos flashcards deste baralho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do Mapa Mental</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conceitos de Biologia"
              data-testid="input-title"
            />
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="layout">Layout</Label>
            <Select value={layout} onValueChange={(v: any) => setLayout(v)}>
              <SelectTrigger id="layout" data-testid="select-layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal - Esquerda para Direita</SelectItem>
                <SelectItem value="vertical">Vertical - Cima para Baixo</SelectItem>
                <SelectItem value="radial">Radial - Centralizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">ℹ️ Como funciona:</strong><br />
              A IA analisará os flashcards e organizará os conceitos em uma
              estrutura hierárquica visual, facilitando a compreensão das relações
              entre os tópicos.
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
            disabled={!title.trim() || generateMutation.isPending}
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
                Gerar Mapa Mental
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
