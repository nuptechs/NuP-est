import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  ArrowLeft,
  Folder,
  FolderOpen
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
import TeamsShell from "@/components/layout/teams-shell";
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
  const [itemToEdit, setItemToEdit] = useState<any>(null);
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
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'area') {
      setCreateType('area');
      setIsCreateDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'material') {
      setCreateType('material');
      setIsCreateDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        handleCreateNew('material');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Queries para dados hierárquicos
  const { data: knowledgeAreas = [], isLoading: areasLoading } = useQuery<KnowledgeArea[]>({
    queryKey: ["/api/areas"],
    enabled: isAuthenticated,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", navigation.selectedAreaId],
    enabled: isAuthenticated && navigation.level === 'subjects' && !!navigation.selectedAreaId,
  });

  const { data: materials = [], isLoading: materialsLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials", navigation.selectedSubjectId],
    enabled: isAuthenticated && navigation.level === 'materials' && !!navigation.selectedSubjectId,
  });

  // Helper functions
  const navigateToLevel = (level: ViewLevel, id?: string, name?: string) => {
    const newBreadcrumb = [...navigation.breadcrumb];
    
    if (level === 'subjects' && id && name) {
      setNavigation({
        level: 'subjects',
        selectedAreaId: id,
        breadcrumb: [...newBreadcrumb, { id, name, level: 'subjects' }]
      });
    } else if (level === 'materials' && id && name) {
      setNavigation({
        ...navigation,
        level: 'materials',
        selectedSubjectId: id,
        breadcrumb: [...newBreadcrumb, { id, name, level: 'materials' }]
      });
    } else {
      setNavigation({
        level: 'areas',
        breadcrumb: [{ name: 'Biblioteca', level: 'areas' }]
      });
    }
  };

  const navigateBack = (targetLevel: ViewLevel) => {
    const breadcrumbIndex = navigation.breadcrumb.findIndex(item => item.level === targetLevel);
    
    if (breadcrumbIndex !== -1) {
      const newBreadcrumb = navigation.breadcrumb.slice(0, breadcrumbIndex + 1);
      const targetItem = navigation.breadcrumb[breadcrumbIndex];
      
      setNavigation({
        level: targetLevel,
        selectedAreaId: targetLevel === 'subjects' ? targetItem.id : undefined,
        selectedSubjectId: targetLevel === 'materials' ? targetItem.id : navigation.selectedSubjectId,
        breadcrumb: newBreadcrumb
      });
    }
  };

  const handleCreateNew = (type: 'area' | 'subject' | 'material') => {
    setCreateType(type);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setItemToEdit(item);
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

      if (navigation.level === 'areas') {
        endpoint = `/api/areas/${itemToDelete.id}`;
        queryKey = '/api/areas';
      } else if (navigation.level === 'subjects') {
        endpoint = `/api/subjects/${itemToDelete.id}`;
        queryKey = `/api/subjects`;
      } else {
        endpoint = `/api/materials/${itemToDelete.id}`;
        queryKey = `/api/materials`;
      }

      await apiRequest('DELETE', endpoint);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (navigation.selectedAreaId) {
        queryClient.invalidateQueries({ queryKey: [queryKey, navigation.selectedAreaId] });
      }
      if (navigation.selectedSubjectId) {
        queryClient.invalidateQueries({ queryKey: [queryKey, navigation.selectedSubjectId] });
      }
      
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

  const getSubtitle = () => {
    switch (navigation.level) {
      case 'areas': return 'Organize seus estudos por áreas de conhecimento';
      case 'subjects': return 'Gerencie as matérias desta área';
      case 'materials': return 'Visualize e organize seus materiais de estudo';
      default: return 'Sua biblioteca de conhecimento';
    }
  };

  const getCurrentData = () => {
    switch (navigation.level) {
      case 'areas': return knowledgeAreas;
      case 'subjects': return subjects;
      case 'materials': return materials;
      default: return [];
    }
  };

  const getCurrentLoading = () => {
    switch (navigation.level) {
      case 'areas': return areasLoading;
      case 'subjects': return subjectsLoading;
      case 'materials': return materialsLoading;
      default: return false;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Dynamic TeamsShell props
  const breadcrumbs = navigation.breadcrumb.map((item, index) => ({
    label: item.name,
    onClick: index < navigation.breadcrumb.length - 1 ? () => navigateBack(item.level) : undefined
  }));

  const primaryActions = (
    <div className="flex gap-2">
      {navigation.level !== 'areas' && (
        <Button 
          variant="outline"
          size="sm"
          onClick={() => {
            if (navigation.level === 'subjects') {
              navigateBack('areas');
            } else if (navigation.level === 'materials') {
              navigateBack('subjects');
            }
          }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      )}
      <Button 
        onClick={() => handleCreateNew(createType)}
        size="sm"
        disabled={
          (navigation.level === 'subjects' && !navigation.selectedAreaId) ||
          (navigation.level === 'materials' && !navigation.selectedSubjectId)
        }
        data-testid={`button-create-${createType}`}
      >
        <Plus className="w-4 h-4 mr-2" />
        {getCreateButtonText()}
      </Button>
    </div>
  );

  const currentData = getCurrentData();
  const isCurrentLoading = getCurrentLoading();

  return (
    <TeamsShell 
      title={getTitle()} 
      subtitle={getSubtitle()}
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={`Buscar ${navigation.level === 'areas' ? 'áreas' : navigation.level === 'subjects' ? 'matérias' : 'materiais'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Stats Overview */}
        {navigation.level === 'areas' && (
          <div>
            <SectionHeader 
              title="Estatísticas"
              description="Visão geral da sua biblioteca"
              data-testid="stats-header"
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {areasLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  <StatCard
                    icon={<Folder className="w-8 h-8" />}
                    value={knowledgeAreas.length}
                    label="Áreas"
                    variant="info"
                    data-testid="stat-areas"
                  />
                  <StatCard
                    icon={<BookOpen className="w-8 h-8" />}
                    value={subjects.length}
                    label="Matérias"
                    variant="success"
                    data-testid="stat-subjects"
                  />
                  <StatCard
                    icon={<FileText className="w-8 h-8" />}
                    value="0"
                    label="Materiais"
                    variant="warning"
                    data-testid="stat-materials"
                  />
                  <StatCard
                    icon={<Database className="w-8 h-8" />}
                    value="100%"
                    label="Organização"
                    variant="primary"
                    data-testid="stat-organization"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div>
          <SectionHeader 
            title={getTitle()}
            description={`${currentData.length} ${navigation.level === 'areas' ? 'áreas' : navigation.level === 'subjects' ? 'matérias' : 'materiais'} encontrada${currentData.length !== 1 ? 's' : ''}`}
            data-testid="content-header"
          />
          
          <div className="mt-4">
            {isCurrentLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : currentData.length === 0 ? (
              <EmptyState
                icon={React.createElement(getIcon(), { className: "w-12 h-12" })}
                title={`Nenhuma ${navigation.level === 'areas' ? 'área' : navigation.level === 'subjects' ? 'matéria' : 'material'} encontrada`}
                description={`Comece criando sua primeira ${navigation.level === 'areas' ? 'área de conhecimento' : navigation.level === 'subjects' ? 'matéria' : 'material de estudo'}.`}
                action={{
                  label: getCreateButtonText(),
                  onClick: () => handleCreateNew(createType)
                }}
                data-testid={`empty-${navigation.level}`}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentData
                  .filter((item: any) => 
                    searchQuery === '' || 
                    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item: any) => (
                    <Card key={item.id} className="surface-elevated hover-lift transition-fast">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              {React.createElement(getIcon(), { className: "h-5 w-5" })}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {item.name || item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              data-testid={`button-edit-${item.id}`}
                              aria-label={`Editar ${item.name || item.title}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              data-testid={`button-delete-${item.id}`}
                              aria-label={`Excluir ${item.name || item.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Item specific info */}
                        <div className="space-y-2">
                          {navigation.level === 'subjects' && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="capitalize">{item.category}</span>
                              <span>Prioridade {item.priority}</span>
                            </div>
                          )}
                          
                          {navigation.level === 'materials' && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="capitalize">{item.type}</span>
                              {item.uploadDate && (
                                <span>
                                  {new Date(item.uploadDate).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Navigation action */}
                        {(navigation.level === 'areas' || navigation.level === 'subjects') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            onClick={() => {
                              if (navigation.level === 'areas') {
                                navigateToLevel('subjects', item.id, item.name);
                                setCreateType('subject');
                              } else if (navigation.level === 'subjects') {
                                navigateToLevel('materials', item.id, item.name);
                                setCreateType('material');
                              }
                            }}
                            data-testid={`button-open-${item.id}`}
                          >
                            {navigation.level === 'areas' ? 'Ver Matérias' : 'Ver Materiais'}
                          </Button>
                        )}
                        
                        {navigation.level === 'materials' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            onClick={() => {
                              // Open material for viewing
                              if (item.filePath) {
                                window.open(`/api/materials/${item.id}/view`, '_blank');
                              }
                            }}
                            data-testid={`button-view-${item.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {navigation.level === 'areas' && 'Nova Área de Conhecimento'}
              {navigation.level === 'subjects' && 'Nova Matéria'}
              {navigation.level === 'materials' && 'Novo Material'}
            </DialogTitle>
            <DialogDescription>
              {navigation.level === 'areas' && 'Crie uma nova área para organizar suas matérias'}
              {navigation.level === 'subjects' && 'Adicione uma nova matéria nesta área'}
              {navigation.level === 'materials' && 'Faça upload de um novo material de estudo'}
            </DialogDescription>
          </DialogHeader>
          
          {navigation.level === 'areas' && (
            <AreaForm 
              onSuccess={() => setIsCreateDialogOpen(false)} 
            />
          )}
          
          {navigation.level === 'subjects' && (
            <SubjectForm 
              areaId={navigation.selectedAreaId}
              onSuccess={() => setIsCreateDialogOpen(false)} 
            />
          )}
          
          {navigation.level === 'materials' && (
            <MaterialUpload 
              subjectId={navigation.selectedSubjectId}
              onSuccess={() => setIsCreateDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {navigation.level === 'areas' && 'Editar Área de Conhecimento'}
              {navigation.level === 'subjects' && 'Editar Matéria'}
              {navigation.level === 'materials' && 'Editar Material'}
            </DialogTitle>
            <DialogDescription>
              {navigation.level === 'areas' && 'Atualize as informações desta área de conhecimento'}
              {navigation.level === 'subjects' && 'Modifique os dados desta matéria'}
              {navigation.level === 'materials' && 'Altere as informações deste material de estudo'}
            </DialogDescription>
          </DialogHeader>
          
          {navigation.level === 'areas' && itemToEdit && (
            <AreaForm 
              area={itemToEdit}
              onSuccess={() => setIsEditDialogOpen(false)} 
            />
          )}
          
          {navigation.level === 'subjects' && itemToEdit && (
            <SubjectForm 
              areaId={navigation.selectedAreaId}
              subject={itemToEdit}
              onSuccess={() => setIsEditDialogOpen(false)} 
            />
          )}
          
          {navigation.level === 'materials' && itemToEdit && (
            <MaterialUpload 
              subjectId={navigation.selectedSubjectId}
              onSuccess={() => setIsEditDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
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
    </TeamsShell>
  );
}