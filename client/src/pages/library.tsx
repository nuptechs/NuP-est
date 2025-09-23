import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SubjectForm from "@/components/subjects/subject-form";
import MaterialUpload from "@/components/materials/material-upload";
import AreaForm from "@/components/knowledge-areas/area-form";
import { 
  Search as SearchIcon, 
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
// Professional components
import ProfessionalShell from "@/components/ui/professional-shell";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { ProfessionalStats } from "@/components/ui/professional-stats";
// import { 
//   ResponsiveHeader, 
//   ResponsiveButton, 
//   ResponsiveGrid, 
//   ResponsiveStatCard, 
//   ResponsiveSearch 
// } from "@/components/ui/responsive-components";
// import { useResponsiveText, responsiveTexts } from "@/hooks/useResponsiveText";
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'area' | 'subject' | 'material'>('area');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      setIsCreateModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'area') {
      setCreateType('area');
      setIsCreateModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (createParam === 'material') {
      setCreateType('material');
      setIsCreateModalOpen(true);
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
    if (level === 'subjects' && id && name) {
      // Reset to areas level, then add subjects level
      const baseBreadcrumb = [{ name: 'Biblioteca', level: 'areas' as ViewLevel }];
      setNavigation({
        level: 'subjects',
        selectedAreaId: id,
        selectedSubjectId: undefined,
        breadcrumb: [...baseBreadcrumb, { id, name, level: 'subjects' }]
      });
    } else if (level === 'materials' && id && name) {
      // Keep current breadcrumb up to subjects level, then add materials level
      const currentBreadcrumb = navigation.breadcrumb.filter(item => 
        item.level === 'areas' || item.level === 'subjects'
      );
      setNavigation({
        ...navigation,
        level: 'materials',
        selectedSubjectId: id,
        breadcrumb: [...currentBreadcrumb, { id, name, level: 'materials' }]
      });
    } else {
      // Reset to areas level
      setNavigation({
        level: 'areas',
        selectedAreaId: undefined,
        selectedSubjectId: undefined,
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
    setIsCreateModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
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
      setIsDeleteModalOpen(false);
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

  // const { getResponsiveText } = useResponsiveText();

  const getTitle = () => {
    switch (navigation.level) {
      case 'areas': return 'Áreas de Conhecimento';
      case 'subjects': return 'Matérias';
      case 'materials': return 'Materiais';
      default: return 'Biblioteca';
    }
  };

  // Helper functions for text content
  const getCreateButtonText = () => {
    switch (navigation.level) {
      case 'areas': return 'Nova Área';
      case 'subjects': return 'Nova Matéria';
      case 'materials': return 'Novo Material';
      default: return 'Adicionar';
    }
  };

  const getSearchPlaceholder = () => {
    switch (navigation.level) {
      case 'areas': return 'Buscar áreas...';
      case 'subjects': return 'Buscar matérias...';
      case 'materials': return 'Buscar materiais...';
      default: return 'Buscar...';
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

  const isCurrentLoading = () => {
    switch (navigation.level) {
      case 'areas': return areasLoading;
      case 'subjects': return subjectsLoading;
      case 'materials': return materialsLoading;
      default: return false;
    }
  };

  const currentData = getCurrentData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProfessionalShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Biblioteca" }
      ]}
    >
        {/* Action Buttons */}
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-3">
              <Button 
                onClick={() => handleCreateNew('material')}
                data-testid="button-upload-material"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </Button>
              <Button 
                onClick={() => handleCreateNew(navigation.level === 'areas' ? 'area' : navigation.level === 'subjects' ? 'subject' : 'material')}
                data-testid="button-create-new"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{navigation.level === 'areas' ? 'Nova Área' : navigation.level === 'subjects' ? 'Nova Matéria' : 'Novo Material'}</span>
              </Button>
            </div>
          </div>
        </div>
          
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              {navigation.breadcrumb.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {index < navigation.breadcrumb.length - 1 ? (
                      <BreadcrumbLink 
                        onClick={() => navigateBack(crumb.level)}
                        className="cursor-pointer hover:text-primary"
                      >
                        {crumb.name}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < navigation.breadcrumb.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={navigation.level === 'areas' ? 'Buscar áreas...' : navigation.level === 'subjects' ? 'Buscar matérias...' : 'Buscar materiais...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Overview - only show on areas level */}
        {navigation.level === 'areas' && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Visão Geral</h2>
              <p className="text-sm text-muted-foreground">Estatísticas da sua biblioteca</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {areasLoading ? (
                <>
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </>
              ) : (
                <>
                  <ProfessionalStats
                    icon={<Folder className="w-5 h-5" />}
                    value={knowledgeAreas.length}
                    title="Áreas"
                    variant="info"
                    data-testid="stat-areas"
                  />
                  <ProfessionalStats
                    icon={<BookOpen className="w-5 h-5" />}
                    value={subjects.length}
                    title="Matérias"
                    variant="success"
                    data-testid="stat-subjects"
                  />
                  <ProfessionalStats
                    icon={<FileText className="w-5 h-5" />}
                    value="0"
                    title="Materiais"
                    variant="warning"
                    data-testid="stat-materials"
                  />
                  <ProfessionalStats
                    icon={<Database className="w-5 h-5" />}
                    value="100%"
                    title="Organização"
                    variant="default"
                    data-testid="stat-organization"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div>
          <div className="mb-6" data-testid="content-header">
            <h2 className="text-lg font-semibold text-foreground mb-1">{getTitle()}</h2>
            <p className="text-sm text-muted-foreground">
              {currentData.length} {navigation.level === 'areas' ? 'áreas' : navigation.level === 'subjects' ? 'matérias' : 'materiais'} encontrada{currentData.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="mt-4">
            {isCurrentLoading() ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : currentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center" data-testid={`empty-${navigation.level}`}>
                <div className="w-16 h-16 mb-4 text-muted-foreground">
                  {React.createElement(getIcon(), { className: "w-full h-full" })}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma {navigation.level === 'areas' ? 'área' : navigation.level === 'subjects' ? 'matéria' : 'material'} encontrada
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Comece criando sua primeira {navigation.level === 'areas' ? 'área de conhecimento' : navigation.level === 'subjects' ? 'matéria' : 'material de estudo'}.
                </p>
                <Button onClick={() => handleCreateNew(navigation.level === 'areas' ? 'area' : navigation.level === 'subjects' ? 'subject' : 'material')}>
                  {getCreateButtonText()}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentData
                  .filter((item: any) => 
                    searchQuery === '' || 
                    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item: any) => (
                    <Card key={item.id} className="transition-all duration-200 hover:shadow-md cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              {React.createElement(getIcon(), { className: "w-5 h-5" })}
                            </div>
                            <div>
                              <h3 className="font-semibold text-base mb-1">
                                {item.name || item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                            
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              data-testid={`button-edit-${item.id}`}
                              title={`Editar ${item.name || item.title}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              data-testid={`button-delete-${item.id}`}
                              title={`Excluir ${item.name || item.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          </div>
                          
                        {/* Item specific info */}
                        <div className="mb-4">
                          {navigation.level === 'subjects' && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <Badge variant="secondary">{item.category}</Badge>
                              <span>Prioridade {item.priority}</span>
                            </div>
                          )}
                          
                          {navigation.level === 'materials' && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <Badge variant="outline">{item.type}</Badge>
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
                            className="w-full"
                            onClick={() => {
                              if (navigation.level === 'areas') {
                                navigateToLevel('subjects', item.id, item.name);
                              } else {
                                navigateToLevel('materials', item.id, item.name);
                              }
                            }}
                            data-testid={`button-navigate-${item.id}`}
                          >
                            {navigation.level === 'areas' ? 'Ver Matérias' : 'Ver Materiais'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        <Dialog 
          open={isCreateModalOpen} 
          onOpenChange={setIsCreateModalOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {createType === 'area' && 'Nova Área de Conhecimento'}
                {createType === 'subject' && 'Nova Matéria'}
                {createType === 'material' && 'Novo Material'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {createType === 'area' && (
                <AreaForm 
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/areas'] });
                  }} 
                />
              )}
              {createType === 'subject' && (
                <SubjectForm 
                  areaId={navigation.selectedAreaId}
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
                  }} 
                />
              )}
              {createType === 'material' && (
                <MaterialUpload 
                  subjectId={navigation.selectedSubjectId}
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
                  }} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Item</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {navigation.level === 'areas' && itemToEdit && (
                <AreaForm 
                  area={itemToEdit}
                  onSuccess={() => {
                    setIsEditModalOpen(false);
                    setItemToEdit(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/areas'] });
                  }} 
                />
              )}
              {navigation.level === 'subjects' && itemToEdit && (
                <SubjectForm 
                  subject={itemToEdit}
                  onSuccess={() => {
                    setIsEditModalOpen(false);
                    setItemToEdit(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
                  }} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog 
          open={isDeleteModalOpen} 
          onOpenChange={setIsDeleteModalOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja excluir "{itemToDelete?.name || itemToDelete?.title}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Alert className="my-4">
              <AlertDescription>
                Esta ação não pode ser desfeita.
              </AlertDescription>
            </Alert>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                data-testid="button-confirm-delete"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </ProfessionalShell>
  );
}