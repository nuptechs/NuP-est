import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Plus, 
  BookOpen,
  Calendar,
  FileIcon,
  Database
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KnowledgeBase } from "@shared/schema";

export default function KnowledgeBasePage() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "",
    file: null as File | null
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch knowledge base documents
  const { data: documents = [], isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base"],
  });
  
  // Fetch knowledge base categories
  const { data: categories = [] } = useQuery<{category: string; count: number}[]>({
    queryKey: ["/api/knowledge-base/categories"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/knowledge-base", formData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setShowUploadForm(false);
      setUploadData({ title: "", description: "", category: "", file: null });
      toast({
        title: "Sucesso",
        description: "Documento processado e adicionado à base de conhecimento!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao processar o documento",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/knowledge-base/${id}`);
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({
        title: "Documento removido",
        description: "O documento foi removido da base de conhecimento.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover documento",
        variant: "destructive",
      });
    },
  });

  // Reprocess embeddings mutation
  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/knowledge-base/reprocess-embeddings");
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Embeddings Reprocessados ✨",
        description: `${data.processed} documentos processados com ${data.totalChunks} chunks. ${data.errors} erros.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao reprocessar embeddings.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadData.file || !uploadData.title.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Título e arquivo PDF são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadData.file);
    formData.append("title", uploadData.title);
    formData.append("description", uploadData.description);
    if (uploadData.category) {
      formData.append("category", uploadData.category);
    }

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Base de Conhecimento</h1>
            <p className="text-sm text-gray-600">Adicione PDFs para que a IA use como referência</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-reprocess-embeddings"
          >
            <BookOpen className="w-4 h-4" />
            {reprocessMutation.isPending ? "Processando..." : "Gerar Embeddings"}
          </Button>
          <Button 
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2"
            data-testid="button-add-document"
          >
            <Plus className="w-4 h-4" />
            Adicionar PDF
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Adicionar Documento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input
                placeholder="Nome do documento..."
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                data-testid="input-document-title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
              <Textarea
                placeholder="Descreva o conteúdo do documento..."
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                data-testid="input-document-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <Select 
                value={uploadData.category} 
                onValueChange={(value) => setUploadData({ ...uploadData, category: value })}
              >
                <SelectTrigger data-testid="select-document-category">
                  <SelectValue placeholder="Selecione uma categoria..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Direito Constitucional">Direito Constitucional</SelectItem>
                  <SelectItem value="Direito Administrativo">Direito Administrativo</SelectItem>
                  <SelectItem value="Direito Civil">Direito Civil</SelectItem>
                  <SelectItem value="Direito Penal">Direito Penal</SelectItem>
                  <SelectItem value="Direito Processual">Direito Processual</SelectItem>
                  <SelectItem value="Matemática">Matemática</SelectItem>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Química">Química</SelectItem>
                  <SelectItem value="Biologia">Biologia</SelectItem>
                  <SelectItem value="História">História</SelectItem>
                  <SelectItem value="Geografia">Geografia</SelectItem>
                  <SelectItem value="Literatura">Literatura</SelectItem>
                  <SelectItem value="Filosofia">Filosofia</SelectItem>
                  <SelectItem value="Sociologia">Sociologia</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Arquivo PDF</label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                data-testid="input-document-file"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !uploadData.file || !uploadData.title.trim()}
                data-testid="button-upload-document"
              >
                {uploadMutation.isPending ? "Processando..." : "Adicionar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUploadForm(false)}
                data-testid="button-cancel-upload"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando documentos...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
            <p className="text-gray-500 mb-4">
              Adicione PDFs à sua base de conhecimento para que a IA possa dar respostas mais precisas.
            </p>
            <Button onClick={() => setShowUploadForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar primeiro documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileIcon className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" data-testid={`document-title-${doc.id}`}>
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </span>
                        <span>{formatFileSize(doc.fileSize || 0)}</span>
                        <span>{doc.filename}</span>
                      </div>
                      {doc.category && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Database className="w-3 h-3 mr-1" />
                            {doc.category}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className="text-xs">
                      PDF
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-${doc.id}`}
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

      {/* Info Box */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona?</p>
              <p>
                Quando você faz perguntas ao assistente de IA, ele busca automaticamente por informações relevantes 
                nos PDFs que você adicionou aqui, fornecendo respostas mais precisas e baseadas no seu conteúdo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}