import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Form,
  Input,
  Modal,
  Message,
  Breadcrumb,
  Icon,
  Loader,
  Dimmer,
  Label,
  Segment,
  Search
} from 'semantic-ui-react';
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
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
import FloatingSettings from "@/components/FloatingSettings";
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
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-bg)' }}>
        <Dimmer active>
          <Loader size="large">Carregando...</Loader>
        </Dimmer>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-bg)', padding: 'var(--spacing-lg)' }}>
      <Container>
        {/* Header Section */}
        <div className="mb-xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
            <div>
              <Header as="h1" style={{ fontSize: '32px', fontWeight: '600', color: 'var(--nup-gray-800)', marginBottom: 'var(--spacing-xs)' }}>
                Biblioteca
              </Header>
              <p style={{ color: 'var(--nup-gray-600)', fontSize: '16px' }}>
                Organize seus materiais de estudo por áreas e matérias
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button 
                primary
                icon="upload"
                content="Upload Material"
                onClick={() => handleCreateNew('material')}
                data-testid="button-upload-material"
              />
              <Button 
                secondary
                icon="plus"
                content={getCreateButtonText()}
                onClick={() => handleCreateNew(createType)}
                data-testid="button-create-new"
              />
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <Breadcrumb size="large">
              {navigation.breadcrumb.map((crumb, index) => (
                <React.Fragment key={index}>
                  <Breadcrumb.Section
                    as={index < navigation.breadcrumb.length - 1 ? 'a' : 'span'}
                    onClick={index < navigation.breadcrumb.length - 1 ? () => navigateBack(crumb.level) : undefined}
                    style={{ 
                      cursor: index < navigation.breadcrumb.length - 1 ? 'pointer' : 'default',
                      color: index < navigation.breadcrumb.length - 1 ? 'var(--nup-secondary)' : 'var(--nup-gray-800)'
                    }}
                  >
                    {crumb.name}
                  </Breadcrumb.Section>
                  {index < navigation.breadcrumb.length - 1 && <Breadcrumb.Divider icon="right angle" />}
                </React.Fragment>
              ))}
            </Breadcrumb>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <Input
              icon="search"
              placeholder={`Buscar ${navigation.level === 'areas' ? 'áreas' : navigation.level === 'subjects' ? 'matérias' : 'materiais'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fluid
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Stats Overview - only show on areas level */}
        {navigation.level === 'areas' && (
          <div className="mb-xl">
            <SectionHeader 
              title="Visão Geral"
              description="Estatísticas da sua biblioteca"
              data-testid="stats-header"
            />
            
            <Grid columns={4} stackable style={{ marginTop: 'var(--spacing-md)' }}>
              {areasLoading ? (
                <>
                  <Grid.Column><SkeletonCard /></Grid.Column>
                  <Grid.Column><SkeletonCard /></Grid.Column>
                  <Grid.Column><SkeletonCard /></Grid.Column>
                  <Grid.Column><SkeletonCard /></Grid.Column>
                </>
              ) : (
                <>
                  <Grid.Column>
                    <StatCard
                      icon={<Folder style={{ width: '32px', height: '32px' }} />}
                      value={knowledgeAreas.length}
                      label="Áreas"
                      variant="info"
                      data-testid="stat-areas"
                    />
                  </Grid.Column>
                  <Grid.Column>
                    <StatCard
                      icon={<BookOpen style={{ width: '32px', height: '32px' }} />}
                      value={subjects.length}
                      label="Matérias"
                      variant="success"
                      data-testid="stat-subjects"
                    />
                  </Grid.Column>
                  <Grid.Column>
                    <StatCard
                      icon={<FileText style={{ width: '32px', height: '32px' }} />}
                      value="0"
                      label="Materiais"
                      variant="warning"
                      data-testid="stat-materials"
                    />
                  </Grid.Column>
                  <Grid.Column>
                    <StatCard
                      icon={<Database style={{ width: '32px', height: '32px' }} />}
                      value="100%"
                      label="Organização"
                      variant="primary"
                      data-testid="stat-organization"
                    />
                  </Grid.Column>
                </>
              )}
            </Grid>
          </div>
        )}

        {/* Content Grid */}
        <div>
          <SectionHeader 
            title={getTitle()}
            description={`${currentData.length} ${navigation.level === 'areas' ? 'áreas' : navigation.level === 'subjects' ? 'matérias' : 'materiais'} encontrada${currentData.length !== 1 ? 's' : ''}`}
            data-testid="content-header"
          />
          
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            {isCurrentLoading() ? (
              <Grid columns={3} stackable>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
                <Grid.Column><SkeletonCard /></Grid.Column>
              </Grid>
            ) : currentData.length === 0 ? (
              <EmptyState
                icon={React.createElement(getIcon(), { style: { width: '48px', height: '48px' } })}
                title={`Nenhuma ${navigation.level === 'areas' ? 'área' : navigation.level === 'subjects' ? 'matéria' : 'material'} encontrada`}
                description={`Comece criando sua primeira ${navigation.level === 'areas' ? 'área de conhecimento' : navigation.level === 'subjects' ? 'matéria' : 'material de estudo'}.`}
                action={{
                  label: getCreateButtonText(),
                  onClick: () => handleCreateNew(createType)
                }}
                data-testid={`empty-${navigation.level}`}
              />
            ) : (
              <Grid columns={3} stackable>
                {currentData
                  .filter((item: any) => 
                    searchQuery === '' || 
                    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item: any) => (
                    <Grid.Column key={item.id}>
                      <Card className="transition-smooth hover-lift">
                        <Card.Content style={{ padding: 'var(--spacing-xl)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                              <div style={{
                                padding: 'var(--spacing-sm)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                color: 'var(--nup-secondary)'
                              }}>
                                {React.createElement(getIcon(), { style: { width: '20px', height: '20px' } })}
                              </div>
                              <div>
                                <Header as="h3" style={{ marginBottom: 'var(--spacing-xs)' }}>
                                  {item.name || item.title}
                                </Header>
                                {item.description && (
                                  <p style={{ fontSize: '14px', color: 'var(--nup-gray-600)' }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                              <Button
                                basic
                                icon="edit"
                                size="mini"
                                onClick={() => handleEdit(item)}
                                data-testid={`button-edit-${item.id}`}
                                title={`Editar ${item.name || item.title}`}
                              />
                              <Button
                                basic
                                icon="trash"
                                size="mini"
                                onClick={() => handleDelete(item)}
                                data-testid={`button-delete-${item.id}`}
                                title={`Excluir ${item.name || item.title}`}
                              />
                            </div>
                          </div>
                          
                          {/* Item specific info */}
                          <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            {navigation.level === 'subjects' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', fontSize: '14px', color: 'var(--nup-gray-600)' }}>
                                <Label color="blue" size="small">{item.category}</Label>
                                <span>Prioridade {item.priority}</span>
                              </div>
                            )}
                            
                            {navigation.level === 'materials' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', fontSize: '14px', color: 'var(--nup-gray-600)' }}>
                                <Label color="green" size="small">{item.type}</Label>
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
                              fluid
                              primary
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
                        </Card.Content>
                      </Card>
                    </Grid.Column>
                  ))}
              </Grid>
            )}
          </div>
        </div>

        {/* Create Modal */}
        <Modal 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)}
          size="small"
        >
          <Modal.Header>
            {createType === 'area' && 'Nova Área de Conhecimento'}
            {createType === 'subject' && 'Nova Matéria'}
            {createType === 'material' && 'Novo Material'}
          </Modal.Header>
          <Modal.Content>
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
          </Modal.Content>
        </Modal>

        {/* Edit Modal */}
        <Modal 
          open={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)}
          size="small"
        >
          <Modal.Header>Editar Item</Modal.Header>
          <Modal.Content>
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
          </Modal.Content>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal 
          open={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)}
          size="small"
        >
          <Modal.Header>Confirmar Exclusão</Modal.Header>
          <Modal.Content>
            <p>Tem certeza de que deseja excluir "{itemToDelete?.name || itemToDelete?.title}"?</p>
            <Message warning>
              <p>Esta ação não pode ser desfeita.</p>
            </Message>
          </Modal.Content>
          <Modal.Actions>
            <Button content="Cancelar" onClick={() => setIsDeleteModalOpen(false)} />
            <Button 
              negative
              content="Excluir"
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            />
          </Modal.Actions>
        </Modal>
      </Container>
      <FloatingSettings />
    </div>
  );
}