/**
 * Knowledge Base - Master-Detail Document Management
 * Simplified from 592 lines to clean, professional UX
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Trash2,
  BookOpen,
  Calendar,
  Filter,
  Plus,
  Database
} from "lucide-react";
import type { KnowledgeBase } from "@shared/schema";

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeBase | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "",
    file: null as File | null
  });

  const { data: documents = [], isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base", categoryFilter],
    queryFn: async () => {
      const params = categoryFilter ? `?category=${encodeURIComponent(categoryFilter)}` : '';
      const response = await apiRequest("GET", `/api/knowledge-base${params}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  const { data: categories = [] } = useQuery<{category: string; count: number}[]>({
    queryKey: ["/api/knowledge-base/categories"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/knowledge-base", formData);
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setIsUploadOpen(false);
      setUploadData({ title: "", description: "", category: "", file: null });
      toast({ title: "Documento adicionado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/knowledge-base/${id}`);
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setSelectedDoc(null);
      toast({ title: "Documento removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover documento", variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!uploadData.file || !uploadData.title.trim()) {
      toast({ title: "Título e arquivo são obrigatórios", variant: "destructive" });
      return;
    }

    const fileSizeInMB = uploadData.file.size / (1024 * 1024);
    if (fileSizeInMB > 12) {
      toast({ 
        title: "Arquivo muito grande", 
        description: `Máximo 12MB. Arquivo: ${fileSizeInMB.toFixed(1)}MB`,
        variant: "destructive" 
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadData.file);
    formData.append("title", uploadData.title);
    formData.append("description", uploadData.description);
    if (uploadData.category) formData.append("category", uploadData.category);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadData({ ...uploadData, file });
  };

  return (
    <UnifiedShell title="Base de Conhecimento">
      <div className="p-6 space-y-6">
        <ModernPageHeader
          title="Base de Conhecimento"
          description="Organize e gerencie seus materiais de estudo"
          icon={BookOpen}
          actions={
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-document">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={uploadData.title}
                      onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                      placeholder="Nome do documento"
                      data-testid="input-doc-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={uploadData.description}
                      onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                      placeholder="Breve descrição..."
                      data-testid="input-doc-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={uploadData.category}
                      onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                      placeholder="Ex: Matemática"
                      data-testid="input-doc-category"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Arquivo PDF *</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      data-testid="input-doc-file"
                    />
                    <p className="text-xs text-muted-foreground">Máximo 12MB</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-document"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadMutation.isPending ? 'Processando...' : 'Fazer Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select 
            value={categoryFilter || "all"} 
            onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary">
            <Database className="h-3 w-3 mr-1" />
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Master-Detail Layout */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : documents.length === 0 ? (
          <ModernEmptyState
            icon={BookOpen}
            title="Nenhum documento encontrado"
            description="Faça upload de PDFs para começar a construir sua base de conhecimento"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document List */}
            <div className="lg:col-span-1 space-y-3">
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                  data-testid={`doc-card-${doc.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        {doc.category && (
                          <Badge variant="outline" className="mt-1 text-xs">{doc.category}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Document Detail */}
            <div className="lg:col-span-2">
              {selectedDoc ? (
                <Card className="sticky top-6">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{selectedDoc.title}</CardTitle>
                        {selectedDoc.description && (
                          <p className="text-sm text-muted-foreground mt-2">{selectedDoc.description}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(selectedDoc.id)}
                        data-testid="button-delete-document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Categoria</p>
                        <p className="font-medium">{selectedDoc.category || 'Não categorizado'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Adicionado em</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {selectedDoc.createdAt 
                            ? new Date(selectedDoc.createdAt).toLocaleDateString('pt-BR')
                            : 'Data indisponível'
                          }
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Conteúdo Extraído</p>
                      <div className="bg-muted/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap" data-testid="doc-content">
                          {selectedDoc.content 
                            ? selectedDoc.content.substring(0, 500) + (selectedDoc.content.length > 500 ? '...' : '')
                            : 'Conteúdo não disponível'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ModernEmptyState
                  icon={FileText}
                  title="Selecione um documento"
                  description="Clique em um documento da lista para visualizar os detalhes"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </UnifiedShell>
  );
}
