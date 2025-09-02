import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import MaterialUpload from "@/components/materials/material-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Material, Subject } from "@shared/schema";

export default function Materials() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: materials, isLoading: materialsLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials", selectedSubject === "all" ? undefined : selectedSubject],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Sucesso",
        description: "Material excluído com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir material",
        variant: "destructive",
      });
    },
  });

  const handleMaterialUploaded = () => {
    setIsUploadOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
  };

  const handleDeleteMaterial = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este material?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return "fa-file-pdf";
      case "doc":
      case "docx":
        return "fa-file-word";
      case "txt":
      case "md":
        return "fa-file-alt";
      case "video":
        return "fa-video";
      case "link":
        return "fa-link";
      default:
        return "fa-file";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400";
      case "doc":
      case "docx":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400";
      case "txt":
      case "md":
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400";
      case "video":
        return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400";
      case "link":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const filteredMaterials = materials?.filter((material: Material) => {
    if (selectedSubject === "all") return true;
    return material.subjectId === selectedSubject;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Materiais" 
          subtitle="Gerencie seus materiais de estudo e recursos"
        />
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Seus Materiais</h2>
              <p className="text-muted-foreground">
                {filteredMaterials?.length || 0} material{filteredMaterials?.length !== 1 ? 's' : ''} encontrado{filteredMaterials?.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-48" data-testid="select-subject-filter">
                  <SelectValue placeholder="Filtrar por matéria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as matérias</SelectItem>
                  {subjects?.map((subject: Subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" data-testid="button-upload-material">
                    + Novo Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <MaterialUpload onSuccess={handleMaterialUploaded} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {materialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMaterials?.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-file-alt text-muted-foreground text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {selectedSubject === "all" ? "Nenhum material encontrado" : "Nenhum material para esta matéria"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {selectedSubject === "all" 
                    ? "Comece adicionando seus primeiros materiais de estudo"
                    : "Adicione materiais para esta matéria específica"
                  }
                </p>
                <Button onClick={() => setIsUploadOpen(true)} data-testid="button-add-first-material">
                  + Adicionar material
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials?.map((material: Material) => {
                const subject = subjects?.find((s: Subject) => s.id === material.subjectId);
                return (
                  <Card key={material.id} className="hover-lift transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 line-clamp-1">
                            {material.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {material.description || "Sem descrição"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMaterial(material.id)}
                          data-testid={`button-delete-material-${material.id}`}
                        >
                          <i className="fas fa-trash text-xs text-destructive"></i>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={getTypeColor(material.type)}>
                            <i className={`fas ${getTypeIcon(material.type)} mr-1`}></i>
                            {material.type.toUpperCase()}
                          </Badge>
                          {subject && (
                            <Badge variant="outline" style={{ borderColor: subject.color || undefined, color: subject.color || undefined }}>
                              {subject.name}
                            </Badge>
                          )}
                        </div>
                        
                        {material.url && (
                          <a 
                            href={material.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline block truncate"
                            data-testid={`link-material-${material.id}`}
                          >
                            <i className="fas fa-external-link-alt mr-1"></i>
                            Acessar material
                          </a>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Adicionado em {new Date(material.createdAt!).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
