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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Folder,
  ChevronRight,
  File,
  FileSpreadsheet,
  Video,
  Image as ImageIcon,
  Code,
  Link as LinkIcon
} from "lucide-react";
import UnifiedShell from "@/components/layout/unified-shell";
import type { BreadcrumbItem } from "@/components/ui/page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import type { Subject, Material, KnowledgeArea } from "@shared/schema";

// Import file type images
import pdfIcon from '@assets/generated_images/PDF_document_icon_a22dd6f8.png';
import docIcon from '@assets/generated_images/Word_document_icon_534ed330.png';
import xlsIcon from '@assets/generated_images/Excel_spreadsheet_icon_bf6d77af.png';
import videoIcon from '@assets/generated_images/Video_file_icon_c6cdebff.png';
import imageIcon from '@assets/generated_images/Image_file_icon_5c042d96.png';
import codeIcon from '@assets/generated_images/Code_file_icon_102bdd8d.png';
import textIcon from '@assets/generated_images/Text_file_icon_353f8ea6.png';
import linkIcon from '@assets/generated_images/Link_file_icon_00a08f77.png';

type ViewLevel = 'areas' | 'subjects' | 'materials';

// Get icon for material type
const getMaterialIcon = (materialType?: string) => {
  switch (materialType) {
    case 'pdf':
      return FileText;
    case 'document':
      return File;
    case 'spreadsheet':
      return FileSpreadsheet;
    case 'video':
      return Video;
    case 'image':
      return ImageIcon;
    case 'code':
      return Code;
    case 'link':
      return LinkIcon;
    case 'text':
      return FileText;
    default:
      return FileText;
  }
};

// Get image for material type
const getMaterialImage = (materialType?: string) => {
  switch (materialType) {
    case 'pdf':
      return pdfIcon;
    case 'document':
      return docIcon;
    case 'spreadsheet':
      return xlsIcon;
    case 'video':
      return videoIcon;
    case 'image':
      return imageIcon;
    case 'code':
      return codeIcon;
    case 'text':
      return textIcon;
    case 'link':
      return linkIcon;
    default:
      return pdfIcon;
  }
};

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
  
  // Delete confirmation state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ item: any; type: ViewLevel } | null>(null);

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

  const handleDelete = (item: any, type: ViewLevel) => {
    setItemToDelete({ item, type });
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    const { item, type } = itemToDelete;
    const itemName = item.name || item.title;
    const itemType = type === 'areas' ? 'área' : type === 'subjects' ? 'disciplina' : 'material';

    try {
      const endpoint = type === 'areas' ? `/api/areas/${item.id}` :
                       type === 'subjects' ? `/api/subjects/${item.id}` :
                       `/api/materials/${item.id}`;
      
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
      
      toast({ 
        title: "Sucesso", 
        description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${itemName}" excluído(a) com sucesso!` 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: `Falha ao excluir ${itemType}`, 
        variant: "destructive" 
      });
    } finally {
      setConfirmDeleteOpen(false);
      setItemToDelete(null);
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
      breadcrumbs.push({ label: 'Home', href: '/dashboard' });
      breadcrumbs.push({ label: 'Biblioteca', icon: <BookOpen className="h-4 w-4" /> });
      breadcrumbs.push({ label: 'Áreas', icon: <Folder className="h-4 w-4" /> });
    } else if (level === 'subjects') {
      const selectedArea = areas.find(a => a.id === selectedAreaId);
      
      breadcrumbs.push({ label: 'Home', href: '/dashboard' });
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
      breadcrumbs.push({ label: 'Home', href: '/dashboard' });
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

        {/* Content Grid/List */}
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
          <div className={level === 'materials' 
            ? "space-y-3" 
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          }>
            {filteredData.map((item: any) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() => {
                  if (level === 'areas') {
                    navigateToSubjects(item.id);
                  } else if (level === 'subjects') {
                    navigateToMaterials(item.id);
                  }
                }}
                data-testid={`card-${item.id}`}
              >
                <CardContent className="p-6">
                  {level === 'materials' ? (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <img 
                          src={getMaterialImage(item.type)} 
                          alt={`${item.type} icon`}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item, level)}
                            data-testid={`button-delete-${item.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {(level === 'subjects' && item.color) ? (
                            <div 
                              className="p-2.5 rounded-lg flex-shrink-0"
                              style={{ backgroundColor: `${item.color}20` }}
                            >
                              <config.icon 
                                className="h-5 w-5" 
                                style={{ color: item.color }}
                              />
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                              <config.icon className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {(level === 'subjects' && item.color) && (
                                <div 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                              )}
                              <h3 className="font-semibold truncate">
                                {item.name || item.title}
                              </h3>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
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
                          onClick={() => handleDelete(item, level)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Confirmar exclusão"
          description={
            itemToDelete
              ? `Tem certeza que deseja excluir ${
                  itemToDelete.type === 'areas' ? 'área' :
                  itemToDelete.type === 'subjects' ? 'disciplina' :
                  'material'
                } "${itemToDelete.item.name || itemToDelete.item.title}"?`
              : ''
          }
          onConfirm={confirmDelete}
          confirmText="Excluir"
          cancelText="Cancelar"
        />
      </div>
    </UnifiedShell>
  );
}
