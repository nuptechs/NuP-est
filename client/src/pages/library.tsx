import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InteractiveProgressUpload } from "@/components/upload/InteractiveProgressUpload";
import SubjectForm from "@/components/subjects/subject-form";
import MaterialUpload from "@/components/materials/material-upload";
import { 
  Search, 
  Plus, 
  BookOpen, 
  FileText, 
  Database, 
  Trash2,
  Edit,
  Eye,
  Upload,
  Filter,
  X
} from "lucide-react";
import type { Subject, Material, KnowledgeBase } from "@shared/schema";

// Resource view model para unificar os três tipos
type ResourceType = 'subjects' | 'materials' | 'knowledge-base' | 'all';

interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  description?: string;
  category?: string;
  subject?: string;
  tags?: string[];
  updatedAt?: string;
  meta?: any;
}

export default function Library() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // State para filtros e busca
  const [activeTab, setActiveTab] = useState<ResourceType>('all');
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'subject' | 'material' | 'kb'>('subject');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  // Auth redirect
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

  // Handle deep links e query params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const typeParam = urlParams.get('type') as ResourceType;
    if (typeParam && ['subjects', 'materials', 'knowledge-base'].includes(typeParam)) {
      setActiveTab(typeParam);
    }
  }, [location]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-testid="input-search-global"]')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        handleCreateNew('material');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Queries para dados
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    enabled: isAuthenticated,
  });

  const { data: knowledgeBase = [] } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base"],
    enabled: isAuthenticated,
  });

  // Mapear dados para Resource model
  const mapSubjectsToResources = (subjects: Subject[]): Resource[] => 
    subjects.map(subject => ({
      id: subject.id,
      type: 'subjects' as ResourceType,
      title: subject.name,
      description: subject.description || undefined,
      category: subject.category,
      updatedAt: typeof subject.createdAt === 'string' ? subject.createdAt : subject.createdAt?.toString(),
      meta: { priority: subject.priority }
    }));

  const mapMaterialsToResources = (materials: Material[]): Resource[] => 
    materials.map(material => ({
      id: material.id,
      type: 'materials' as ResourceType,
      title: material.title,
      description: material.description || undefined,
      subject: material.subjectId || undefined,
      updatedAt: typeof material.createdAt === 'string' ? material.createdAt : material.createdAt?.toString(),
      meta: { type: material.type, filePath: material.filePath }
    }));

  const mapKnowledgeBaseToResources = (kb: KnowledgeBase[]): Resource[] => 
    kb.map(doc => ({
      id: doc.id,
      type: 'knowledge-base' as ResourceType,
      title: doc.title,
      description: doc.description || undefined,
      category: doc.category,
      updatedAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt?.toISOString(),
      meta: { filename: doc.filename, content: doc.content }
    }));

  // Combinar todos os recursos
  const allResources: Resource[] = [
    ...mapSubjectsToResources(subjects),
    ...mapMaterialsToResources(materials),
    ...mapKnowledgeBaseToResources(knowledgeBase)
  ];

  // Filtrar recursos
  const filteredResources = allResources.filter(resource => {
    // Filtro por tab
    if (activeTab !== 'all' && resource.type !== activeTab) return false;
    
    // Filtro por busca
    if (searchQuery && !resource.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !resource.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Filtro por categoria
    if (selectedCategory !== 'all' && resource.category !== selectedCategory) return false;
    
    return true;
  });

  // Categorias únicas para filtro
  const allCategories = Array.from(new Set(
    allResources.map(r => r.category).filter(Boolean)
  ));

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'subjects': return BookOpen;
      case 'materials': return FileText;
      case 'knowledge-base': return Database;
      default: return FileText;
    }
  };

  const getResourceTypeLabel = (type: ResourceType) => {
    switch (type) {
      case 'subjects': return 'Matéria';
      case 'materials': return 'Material';
      case 'knowledge-base': return 'Conhecimento';
      default: return '';
    }
  };

  const handleCreateNew = (type: 'subject' | 'material' | 'kb') => {
    setCreateType(type);
    setIsCreateDialogOpen(true);
  };

  const handleView = (resource: Resource) => {
    setSelectedResource(resource);
    // TODO: Implementar visualização de detalhes
  };

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (resource: Resource) => {
    setResourceToDelete(resource);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;
    
    try {
      let endpoint = '';
      switch (resourceToDelete.type) {
        case 'subjects':
          endpoint = `/api/subjects/${resourceToDelete.id}`;
          break;
        case 'materials':
          endpoint = `/api/materials/${resourceToDelete.id}`;
          break;
        case 'knowledge-base':
          endpoint = `/api/knowledge-base/${resourceToDelete.id}`;
          break;
      }
      
      await apiRequest('DELETE', endpoint);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/${resourceToDelete.type}`] });
      
      toast({
        title: "Sucesso",
        description: `${getResourceTypeLabel(resourceToDelete.type)} excluído com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir item",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setResourceToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500 text-lg font-light">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Header title="Biblioteca" subtitle="Central de conteúdo unificada" />
      <MobileNav />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header da Biblioteca */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <DashboardIcon />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Biblioteca</h1>
              <p className="text-gray-500">Central de conteúdo unificada</p>
            </div>
          </div>

          {/* Botões de ação rápida */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCreateNew('subject')}
              data-testid="button-create-subject"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Nova Matéria
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCreateNew('material')}
              data-testid="button-create-material"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Material
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCreateNew('kb')}
              data-testid="button-create-knowledge"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conhecimento
            </Button>
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca global */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar em toda biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-200 focus:border-gray-300"
                data-testid="input-search-global"
              />
            </div>

            {/* Filtro de categoria */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {allCategories.map(category => (
                  <SelectItem key={category} value={category || ''}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs de tipo de conteúdo */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ResourceType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="all" data-testid="tab-all">
              Tudo ({allResources.length})
            </TabsTrigger>
            <TabsTrigger value="subjects" data-testid="tab-subjects">
              Matérias ({subjects.length})
            </TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">
              Materiais ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" data-testid="tab-knowledge">
              Conhecimento ({knowledgeBase.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Grid de recursos */}
            {filteredResources.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum conteúdo ainda'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? 'Tente ajustar sua busca ou filtros' 
                    : 'Comece criando suas primeiras matérias e materiais'
                  }
                </p>
                {!searchQuery && (
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => handleCreateNew('subject')} data-testid="button-empty-create-subject">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Criar Matéria
                    </Button>
                    <Button variant="outline" onClick={() => handleCreateNew('material')} data-testid="button-empty-upload-material">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Material
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource) => {
                  const Icon = getResourceIcon(resource.type);
                  return (
                    <Card key={`${resource.type}-${resource.id}`} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-medium text-gray-900 truncate">
                                {resource.title}
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {getResourceTypeLabel(resource.type)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {resource.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {resource.description}
                          </p>
                        )}

                        {resource.category && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            <Badge variant="outline" className="text-xs">
                              {resource.category}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {resource.updatedAt && new Date(resource.updatedAt).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleView(resource)}
                              data-testid={`button-view-${resource.type}-${resource.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(resource)}
                              data-testid={`button-edit-${resource.type}-${resource.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(resource)}
                              data-testid={`button-delete-${resource.type}-${resource.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog para criação */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {createType === 'subject' && 'Nova Matéria'}
                {createType === 'material' && 'Upload de Material'}
                {createType === 'kb' && 'Adicionar Conhecimento'}
              </DialogTitle>
            </DialogHeader>
            
            {createType === 'subject' && (
              <SubjectForm onSuccess={() => setIsCreateDialogOpen(false)} />
            )}
            
            {createType === 'material' && (
              <MaterialUpload onSuccess={() => setIsCreateDialogOpen(false)} />
            )}
            
            {createType === 'kb' && (
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Funcionalidade de upload de conhecimento em desenvolvimento
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-close-kb-upload"
                >
                  Fechar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{resourceToDelete?.title}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}