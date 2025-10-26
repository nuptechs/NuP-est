/**
 * Library - Clean, Hierarchical Navigation
 * Simplified from 793 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import SubjectForm from "@/components/subjects/subject-form";
import MaterialUpload from "@/components/materials/material-upload";
import MaterialDragDrop from "@/components/materials/material-drag-drop";
import AreaForm from "@/components/knowledge-areas/area-form";
import { 
  Search as SearchIcon, 
  Plus, 
  BookOpen, 
  FileText, 
  Trash2,
  Edit,
  ArrowLeft,
  Folder,
  ChevronRight
} from "lucide-react";
import UnifiedShell from "@/components/layout/unified-shell";
import type { BreadcrumbItem } from "@/components/ui/page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import type { Subject, Material, KnowledgeArea } from "@shared/schema";

type ViewLevel = 'areas' | 'subjects' | 'materials';

export default function Library() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Navigation state
  const [level, setLevel] = useState<ViewLevel>('areas');
  const [selectedAreaId, setSelectedAreaId] = useState<string>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'area' | 'subject' | 'material'>('area');
  const [editItem, setEditItem] = useState<any>(null);

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  // Handle URL params for quick actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const create = params.get('create');
    if (create === 'material' || create === 'subject' || create === 'area') {
      setCreateType(create);
      setCreateModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Queries
  const { data: areas = [] } = useQuery<KnowledgeArea[]>({
    queryKey: ["/api/areas"],
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: selectedAreaId 
      ? [`/api/subjects?areaId=${selectedAreaId}`]
      : ["/api/subjects"],
    enabled: !!selectedAreaId,
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: selectedSubjectId 
      ? [`/api/materials?subjectId=${selectedSubjectId}`]
      : ["/api/materials"],
    enabled: !!selectedSubjectId,
  });

  // Get selected subject for material color
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Navigation functions
  const navigateToSubjects = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedSubjectId(undefined);
    setLevel('subjects');
  };

  const navigateToMaterials = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setLevel('materials');
  };

  const navigateBack = () => {
    if (level === 'materials') {
      setSelectedSubjectId(undefined);
      setLevel('subjects');
    } else if (level === 'subjects') {
      setSelectedAreaId(undefined);
      setLevel('areas');
    }
  };

  const handleCreate = (type: 'area' | 'subject' | 'material') => {
    setCreateType(type);
    setEditItem(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setCreateType(level === 'areas' ? 'area' : level === 'subjects' ? 'subject' : 'material');
    setCreateModalOpen(true);
  };

  const handleDelete = async (id: string, type: ViewLevel) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;

    try {
      const endpoint = type === 'areas' ? `/api/areas/${id}` :
                       type === 'subjects' ? `/api/subjects/${id}` :
                       `/api/materials/${id}`;
      
      await apiRequest('DELETE', endpoint);
      
      // Invalidate ALL queries in hierarchy to prevent stale data
      await queryClient.invalidateQueries({ queryKey: ['/api/areas'] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/subjects')
      });
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/materials')
      });
      
      toast({ title: "Sucesso", description: "Item excluído!" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" });
    }
  };

  // Build breadcrumbs dynamically with navigation callbacks
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Handler to navigate back to areas
    const navigateToAreas = () => {
      if (isNavigating) return;
      setIsNavigating(true);
      setSelectedAreaId(undefined);
      setSelectedSubjectId(undefined);
      setLevel('areas');
      setTimeout(() => setIsNavigating(false), 100);
    };

    // Handler to navigate back to subjects
    const navigateBackToSubjects = () => {
      if (isNavigating) return;
      setIsNavigating(true);
      setSelectedSubjectId(undefined);
      setLevel('subjects');
      setTimeout(() => setIsNavigating(false), 100);
    };

    if (level === 'areas') {
      breadcrumbs.push({ label: 'Biblioteca', icon: <BookOpen className="h-4 w-4" /> });
      breadcrumbs.push({ label: 'Áreas', icon: <Folder className="h-4 w-4" /> });
    } else if (level === 'subjects') {
      const selectedArea = areas.find(a => a.id === selectedAreaId);
      breadcrumbs.push({ 
        label: 'Biblioteca', 
        icon: <BookOpen className="h-4 w-4" />,
        onClick: navigateToAreas
      });
      breadcrumbs.push({ 
        label: 'Áreas', 
        icon: <Folder className="h-4 w-4" />,
        onClick: navigateToAreas
      });
      if (selectedArea) {
        breadcrumbs.push({ 
          label: selectedArea.name, 
          icon: <Folder className="h-4 w-4" /> 
        });
      }
      breadcrumbs.push({ label: 'Disciplinas', icon: <BookOpen className="h-4 w-4" /> });
    } else if (level === 'materials') {
      const selectedArea = areas.find(a => a.id === selectedAreaId);
      breadcrumbs.push({ 
        label: 'Biblioteca', 
        icon: <BookOpen className="h-4 w-4" />,
        onClick: navigateToAreas
      });
      breadcrumbs.push({ 
        label: 'Áreas', 
        icon: <Folder className="h-4 w-4" />,
        onClick: navigateToAreas
      });
      if (selectedArea) {
        breadcrumbs.push({ 
          label: selectedArea.name,
          icon: <Folder className="h-4 w-4" />,
          onClick: navigateBackToSubjects
        });
      }
      breadcrumbs.push({ 
        label: 'Disciplinas',
        icon: <BookOpen className="h-4 w-4" />,
        onClick: navigateBackToSubjects
      });
      if (selectedSubject) {
        breadcrumbs.push({ 
          label: selectedSubject.name,
          icon: <BookOpen className="h-4 w-4" /> 
        });
      }
      breadcrumbs.push({ label: 'Materiais de Estudo', icon: <FileText className="h-4 w-4" /> });
    }

    return breadcrumbs;
  };

  // Get current data and config
  const getCurrentData = () => {
    if (level === 'areas') return areas;
    if (level === 'subjects') return subjects;
    return materials;
  };

  const getConfig = () => {
    if (level === 'areas') return {
      title: 'Áreas de Conhecimento',
      icon: Folder,
      createLabel: 'Nova Área',
      emptyTitle: 'Nenhuma área criada',
      emptyDesc: 'Comece organizando seus estudos criando áreas de conhecimento.',
    };
    if (level === 'subjects') return {
      title: 'Disciplinas',
      icon: BookOpen,
      createLabel: 'Nova Disciplina',
      emptyTitle: 'Nenhuma disciplina encontrada',
      emptyDesc: 'Adicione disciplinas (ex: Matemática, Física). Depois, clique em uma disciplina para adicionar materiais de estudo (PDFs, links, etc).',
    };
    return {
      title: 'Materiais de Estudo',
      icon: FileText,
      createLabel: 'Adicionar Material',
      emptyTitle: 'Nenhum material de estudo',
      emptyDesc: 'Adicione PDFs, documentos, links e outros materiais de estudo para esta disciplina.',
    };
  };

  const currentData = getCurrentData();
  const config = getConfig();
  const filteredData = currentData.filter((item: any) =>
    !searchQuery || 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <UnifiedShell breadcrumbs={getBreadcrumbs()}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {level !== 'areas' && (
              <Button
                variant="ghost"
                size="default"
                onClick={navigateBack}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            <Button
              onClick={() => handleCreate(level === 'areas' ? 'area' : level === 'subjects' ? 'subject' : 'material')}
              data-testid="button-create"
            >
              <Plus className="h-4 w-4 mr-2" />
              {config.createLabel}
            </Button>
          </div>
        </div>

        {/* Drag and Drop Area for Materials */}
        {level === 'materials' && (
          <MaterialDragDrop 
            subjectId={selectedSubjectId}
            onSuccess={() => {
              queryClient.invalidateQueries({ 
                predicate: (query) => 
                  Array.isArray(query.queryKey) && 
                  typeof query.queryKey[0] === 'string' &&
                  query.queryKey[0].startsWith('/api/materials')
              });
            }}
          />
        )}

        {/* Results Counter */}
        <div className="text-sm text-muted-foreground">
          <span>{filteredData.length} {level === 'areas' ? 'áreas' : level === 'subjects' ? 'disciplinas' : 'materiais'}</span>
        </div>

        {/* Content Grid */}
        {filteredData.length === 0 ? (
          <ModernEmptyState
            icon={config.icon}
            title={config.emptyTitle}
            description={config.emptyDesc}
            action={{
              label: config.createLabel,
              onClick: () => handleCreate(level === 'areas' ? 'area' : level === 'subjects' ? 'subject' : 'material')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((item: any) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() => {
                  if (level === 'areas') navigateToSubjects(item.id);
                  else if (level === 'subjects') navigateToMaterials(item.id);
                }}
                data-testid={`card-${item.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {(level === 'subjects' && item.color) || (level === 'materials' && selectedSubject?.color) ? (
                        <div 
                          className="p-2.5 rounded-lg"
                          style={{ backgroundColor: `${level === 'subjects' ? item.color : selectedSubject?.color}20` }}
                        >
                          <config.icon 
                            className="h-5 w-5" 
                            style={{ color: level === 'subjects' ? item.color : selectedSubject?.color }}
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <config.icon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {((level === 'subjects' && item.color) || (level === 'materials' && selectedSubject?.color)) && (
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: level === 'subjects' ? item.color : selectedSubject?.color }}
                            />
                          )}
                          <h3 className="font-semibold truncate">
                            {item.name || item.title}
                          </h3>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id, level)}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editItem ? 'Editar' : 'Criar'} {
                  createType === 'area' ? 'Área de Conhecimento' :
                  createType === 'subject' ? 'Disciplina' :
                  'Material de Estudo'
                }
              </DialogTitle>
            </DialogHeader>
            {createType === 'area' && (
              <AreaForm
                area={editItem}
                onSuccess={() => {
                  setCreateModalOpen(false);
                  setEditItem(null);
                  // Invalidate all hierarchy levels
                  queryClient.invalidateQueries({ queryKey: ['/api/areas'] });
                  queryClient.invalidateQueries({ 
                    predicate: (query) => 
                      Array.isArray(query.queryKey) && 
                      typeof query.queryKey[0] === 'string' &&
                      query.queryKey[0].startsWith('/api/subjects')
                  });
                }}
              />
            )}
            {createType === 'subject' && (
              <SubjectForm
                areaId={selectedAreaId}
                subject={editItem}
                onSuccess={() => {
                  setCreateModalOpen(false);
                  setEditItem(null);
                  // Invalidate subjects and materials (catches all scoped variants)
                  queryClient.invalidateQueries({ 
                    predicate: (query) => 
                      Array.isArray(query.queryKey) && 
                      typeof query.queryKey[0] === 'string' &&
                      query.queryKey[0].startsWith('/api/subjects')
                  });
                  queryClient.invalidateQueries({ 
                    predicate: (query) => 
                      Array.isArray(query.queryKey) && 
                      typeof query.queryKey[0] === 'string' &&
                      query.queryKey[0].startsWith('/api/materials')
                  });
                }}
              />
            )}
            {createType === 'material' && (
              <MaterialUpload
                subjectId={selectedSubjectId}
                material={editItem}
                onSuccess={() => {
                  setCreateModalOpen(false);
                  setEditItem(null);
                  // Invalidate all material queries (catches scoped and unscoped)
                  queryClient.invalidateQueries({ 
                    predicate: (query) => 
                      Array.isArray(query.queryKey) && 
                      typeof query.queryKey[0] === 'string' &&
                      query.queryKey[0].startsWith('/api/materials')
                  });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </UnifiedShell>
  );
}
