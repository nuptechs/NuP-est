import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import UnifiedShell from "@/components/layout/unified-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, BookOpen, Sparkles } from "lucide-react";
import type { Material } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function DidacticMaterialPage() {
  const { toast } = useToast();
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: materials, isLoading: loadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const handleGenerate = async () => {
    if (!title) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira um título para a apresentação",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMaterial) {
      toast({
        title: "Material não selecionado",
        description: "Selecione um material para gerar a apresentação",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const response = await fetch("/api/didactic-material/generate-ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          materialId: selectedMaterial,
          theme,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao gerar apresentação");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Apresentação gerada!",
        description: "O download começou automaticamente",
      });

      setTitle("");
      setSelectedMaterial("");
    } catch (error: any) {
      console.error("Error generating presentation:", error);
      toast({
        title: "Erro ao gerar apresentação",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedMaterialData = materials?.find(m => m.id === selectedMaterial);

  return (
    <UnifiedShell title="Material Didático">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Gerador de Material Didático
          </h1>
          <p className="text-muted-foreground">
            Transforme seus materiais de estudo em apresentações PowerPoint profissionais
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Criar Apresentação PowerPoint
              </CardTitle>
              <CardDescription>
                Gere apresentações adaptadas ao seu perfil de aprendizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Apresentação *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Introdução à Física Quântica"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-presentation-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material de Origem *</Label>
                {loadingMaterials ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando materiais...
                  </div>
                ) : !materials || materials.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 border border-dashed rounded-lg">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Nenhum material encontrado</p>
                      <p className="text-xs text-muted-foreground">
                        Adicione materiais na Biblioteca primeiro
                      </p>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger data-testid="select-material">
                      <SelectValue placeholder="Selecione um material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem 
                          key={material.id} 
                          value={material.id}
                          data-testid={`material-option-${material.id}`}
                        >
                          {material.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedMaterialData && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Material Selecionado:</p>
                  <p className="text-sm text-muted-foreground">{selectedMaterialData.title}</p>
                  {selectedMaterialData.description && (
                    <p className="text-xs text-muted-foreground">{selectedMaterialData.description}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="theme">Tema Visual</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profissional (Azul/Cinza)</SelectItem>
                    <SelectItem value="vibrant">Vibrante (Roxo/Rosa)</SelectItem>
                    <SelectItem value="minimalist">Minimalista (Preto/Branco)</SelectItem>
                    <SelectItem value="academic">Acadêmico (Azul Escuro)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  O tema se adapta automaticamente às suas dificuldades de aprendizado
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !materials || materials.length === 0}
                  className="flex-1"
                  data-testid="button-generate-ppt"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar Apresentação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Selecione um material</p>
                    <p className="text-muted-foreground">
                      Escolha um material da sua biblioteca como base para a apresentação
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Personalize o visual</p>
                    <p className="text-muted-foreground">
                      Escolha um tema que se adapta às suas necessidades de aprendizado
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Baixe e use</p>
                    <p className="text-muted-foreground">
                      Sua apresentação será gerada e baixada automaticamente
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UnifiedShell>
  );
}
