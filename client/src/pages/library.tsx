import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
// Legacy layout imports removed - using AppShell
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SubjectForm from "@/components/subjects/subject-form";
import MaterialUpload from "@/components/materials/material-upload";
import AreaForm from "@/components/knowledge-areas/area-form";
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
  ChevronRight,
  ArrowLeft,
  Folder,
  FolderOpen
} from "lucide-react";
import type { Subject, Material, KnowledgeArea } from "@shared/schema";

// Navigation state types
type ViewLevel = 'areas' | 'subjects' | 'materials';

interface NavigationState {
  level: ViewLevel;
  selectedAreaId?: string;
  selectedSubjectId?: string;
  breadcrumb: { id?: string; name: string; level: ViewLevel }[];
}

export default function Library() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Navigation state for hierarchical view
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'areas',
    breadcrumb: [{ name: 'Biblioteca', level: 'areas' }]
  });
  
  // State para filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'area' | 'subject' | 'material'>('area');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

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

  // Handle URL query parameters for creation modals
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const createParam = urlParams.get('create');
    
    if (createParam === 'subject') {
      setCreateType('subject');
      setIsCreateDialogOpen(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'area') {
      setCreateType('area');
      setIsCreateDialogOpen(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'material') {
      setCreateType('material');
      setIsCreateDialogOpen(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  // Queries para dados hierárquicos
  const { data: knowledgeAreas = [] } = useQuery<KnowledgeArea[]>({
    queryKey: ["/api/areas"],
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", navigation.selectedAreaId],
    queryFn: () => fetch(`/api/subjects?areaId=${navigation.selectedAreaId}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: isAuthenticated && navigation.level === 'subjects' && !!navigation.selectedAreaId,
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials", navigation.selectedSubjectId],
    queryFn: () => fetch(`/api/materials?subjectId=${navigation.selectedSubjectId}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: isAuthenticated && navigation.level === 'materials' && !!navigation.selectedSubjectId,
  });

  // Navigation functions
  const navigateToArea = (area: KnowledgeArea) => {
    setNavigation({
      level: 'subjects',
      selectedAreaId: area.id,
      breadcrumb: [
        { name: 'Biblioteca', level: 'areas' },
        { id: area.id, name: area.name, level: 'subjects' }
      ]
    });
  };

  const navigateToSubject = (subject: Subject) => {
    setNavigation(prev => ({
      level: 'materials',
      selectedAreaId: prev.selectedAreaId,
      selectedSubjectId: subject.id,
      breadcrumb: [
        ...prev.breadcrumb,
        { id: subject.id, name: subject.name, level: 'materials' }
      ]
    }));
  };

  const navigateBack = (targetLevel: ViewLevel) => {
    const levelIndex = navigation.breadcrumb.findIndex(item => item.level === targetLevel);
    if (levelIndex !== -1) {
      const newBreadcrumb = navigation.breadcrumb.slice(0, levelIndex + 1);
      const targetItem = newBreadcrumb[levelIndex];
      
      setNavigation({
        level: targetLevel,
        selectedAreaId: targetLevel === 'areas' ? undefined : 
                       targetLevel === 'subjects' ? targetItem.id : navigation.selectedAreaId,
        selectedSubjectId: targetLevel === 'materials' ? targetItem.id : undefined,
        breadcrumb: newBreadcrumb
      });
    }
  };

  // Get filtered data based on current view and search
  const getFilteredData = () => {
    switch (navigation.level) {
      case 'areas':
        return knowledgeAreas.filter(area => 
          !searchQuery || area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          area.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      case 'subjects':
        return subjects.filter(subject => 
          !searchQuery || subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      case 'materials':
        return materials.filter(material => 
          !searchQuery || material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          material.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      default:
        return [];
    }
  };

  const filteredData = getFilteredData();

  const handleCreateNew = (type: 'area' | 'subject' | 'material') => {
    setCreateType(type);
    setIsCreateDialogOpen(true);
  };

  const handleView = (item: any) => {
    if (navigation.level === 'areas') {
      navigateToArea(item);
    } else if (navigation.level === 'subjects') {
      navigateToSubject(item);
    }
  };

  const handleEdit = (item: any) => {
    setItemToDelete(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      let endpoint = '';
      let queryKey = '';
      
      switch (navigation.level) {
        case 'areas':
          endpoint = `/api/areas/${itemToDelete.id}`;
          queryKey = '/api/areas';
          break;
        case 'subjects':
          endpoint = `/api/subjects/${itemToDelete.id}`;
          queryKey = `/api/subjects/${navigation.selectedAreaId}`;
          break;
        case 'materials':
          endpoint = `/api/materials/${itemToDelete.id}`;
          queryKey = `/api/materials/${navigation.selectedSubjectId}`;
          break;
      }
      
      await apiRequest('DELETE', endpoint);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      
      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir item",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getIcon = () => {
    switch (navigation.level) {
      case 'areas': return Folder;
      case 'subjects': return BookOpen;
      case 'materials': return FileText;
      default: return Folder;
    }
  };

  const getTitle = () => {
    switch (navigation.level) {
      case 'areas': return 'Áreas de Conhecimento';
      case 'subjects': return 'Matérias';
      case 'materials': return 'Materiais';
      default: return 'Biblioteca';
    }
  };

  const getCreateButtonText = () => {
    switch (navigation.level) {
      case 'areas': return 'Nova Área';
      case 'subjects': return 'Nova Matéria';
      case 'materials': return 'Novo Material';
      default: return 'Adicionar';
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
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6">
          {navigation.breadcrumb.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <button
                onClick={() => navigateBack(item.level)}
                className={`text-sm font-medium hover:text-blue-600 transition-colors ${
                  index === navigation.breadcrumb.length - 1 
                    ? 'text-gray-900' 
                    : 'text-gray-500'
                }`}
                data-testid={`breadcrumb-${item.level}`}
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>

        {/* Header da Biblioteca */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <DashboardIcon />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{getTitle()}</h1>
              <p className="text-gray-500">
                {navigation.breadcrumb[navigation.breadcrumb.length - 1]?.name}
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            {navigation.level !== 'areas' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateBack(navigation.breadcrumb[navigation.breadcrumb.length - 2]?.level as ViewLevel)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleCreateNew(navigation.level === 'areas' ? 'area' : navigation.level === 'subjects' ? 'subject' : 'material')}
              data-testid="button-create"
            >
              <Plus className="w-4 h-4 mr-2" />
              {getCreateButtonText()}
            </Button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={`Buscar ${getTitle().toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 focus:border-gray-300"
              data-testid="input-search-global"
            />
          </div>
        </div>

        {/* Content Grid */}
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Nenhum resultado encontrado' : `Nenhum ${getTitle().toLowerCase()} ainda`}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Tente ajustar sua busca' 
                : `Comece criando ${getTitle().toLowerCase()}`
              }
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => handleCreateNew(navigation.level === 'areas' ? 'area' : navigation.level === 'subjects' ? 'subject' : 'material')} 
                data-testid="button-empty-create"
              >
                <Plus className="w-4 h-4 mr-2" />
                {getCreateButtonText()}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((item: any) => {
              const Icon = getIcon();
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleView(item)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium text-gray-900 truncate">
                            {item.name || item.title}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {navigation.level === 'areas' ? 'Área' : 
                             navigation.level === 'subjects' ? 'Matéria' : 'Material'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {item.category && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {item.updatedAt && new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          data-testid={`button-delete-${item.id}`}
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

        {/* Dialog para criação */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {createType === 'area' && 'Nova Área de Conhecimento'}
                {createType === 'subject' && 'Nova Matéria'}
                {createType === 'material' && 'Novo Material'}
              </DialogTitle>
            </DialogHeader>
            
            {createType === 'area' && (
              <AreaForm 
                onSuccess={() => setIsCreateDialogOpen(false)} 
              />
            )}
            
            {createType === 'subject' && (
              <SubjectForm 
                areaId={navigation.selectedAreaId}
                onSuccess={() => setIsCreateDialogOpen(false)} 
              />
            )}
            
            {createType === 'material' && (
              <MaterialUpload 
                subjectId={navigation.selectedSubjectId}
                onSuccess={() => setIsCreateDialogOpen(false)} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{itemToDelete?.name || itemToDelete?.title}"? Esta ação não pode ser desfeita.
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