import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import UnifiedShell from "@/components/layout/unified-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Loader2, BookOpen, Sparkles, Upload, FileUp } from "lucide-react";
import type { Material } from "@shared/schema";

export default function DidacticMaterialPage() {
  const { toast } = useToast();
  const [contentSource, setContentSource] = useState<"library" | "upload" | "text">("library");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: materials, isLoading: loadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!title) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira um título para a apresentação",
        variant: "destructive",
      });
      return;
    }

    if (contentSource === "library" && !selectedMaterial) {
      toast({
        title: "Material não selecionado",
        description: "Selecione um material ou escolha outra fonte de conteúdo",
        variant: "destructive",
      });
      return;
    }

    if (contentSource === "upload" && !uploadedFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Faça upload de um arquivo ou escolha outra fonte de conteúdo",
        variant: "destructive",
      });
      return;
    }

    if (contentSource === "text" && !textContent.trim()) {
      toast({
        title: "Conteúdo vazio",
        description: "Digite algum conteúdo ou escolha outra fonte",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const formData = new FormData();
      formData.append("title", title);
      formData.append("theme", theme);

      if (contentSource === "library" && selectedMaterial) {
        formData.append("materialId", selectedMaterial);
      } else if (contentSource === "upload" && uploadedFile) {
        formData.append("file", uploadedFile);
      } else if (contentSource === "text" && textContent) {
        formData.append("textContent", textContent);
      }

      const response = await fetch("/api/didactic-material/generate-ppt", {
        method: "POST",
        credentials: "include",
        body: formData,
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
      setUploadedFile(null);
      setTextContent("");
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
                <Label>Fonte de Conteúdo *</Label>
                <Tabs 
                  value={contentSource} 
                  onValueChange={(v) => setContentSource(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="library" data-testid="tab-library">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Biblioteca
                    </TabsTrigger>
                    <TabsTrigger value="upload" data-testid="tab-upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger value="text" data-testid="tab-text">
                      <FileText className="w-4 h-4 mr-2" />
                      Texto
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="library" className="space-y-4 mt-4">
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
                            Adicione materiais na Biblioteca ou use outra fonte
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
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
                        {selectedMaterialData && (
                          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <p className="text-sm font-medium">Material Selecionado:</p>
                            <p className="text-sm text-muted-foreground">{selectedMaterialData.title}</p>
                            {selectedMaterialData.description && (
                              <p className="text-xs text-muted-foreground">{selectedMaterialData.description}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Arquivo</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          data-testid="input-file-upload"
                          className="cursor-pointer"
                        />
                      </div>
                      {uploadedFile && (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <FileUp className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{uploadedFile.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Suporta: PDF, Word, Excel, CSV, TXT
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="text-content">Conteúdo</Label>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          IA vai aprimorar automaticamente
                        </span>
                      </div>
                      <Textarea
                        id="text-content"
                        placeholder="Cole ou digite o conteúdo aqui. Você pode incluir comandos como: 'foque em conceitos básicos', 'adicione exemplos práticos', etc."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={10}
                        data-testid="textarea-content"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        A IA irá analisar, estruturar e aprimorar o conteúdo automaticamente
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

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
                  disabled={isGenerating}
                  className="flex-1"
                  data-testid="button-generate-ppt"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando apresentação...
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
                    <p className="font-medium">Escolha a fonte de conteúdo</p>
                    <p className="text-muted-foreground">
                      Use material da biblioteca, faça upload de arquivo, ou cole texto direto
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
                      Escolha um tema que se adapta automaticamente ao seu perfil de aprendizado
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
                      Sua apresentação será gerada (com IA aprimorando o conteúdo se necessário) e baixada automaticamente
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
