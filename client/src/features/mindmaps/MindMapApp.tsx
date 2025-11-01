import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MindMapEditor } from './components/MindMapEditor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, Filter, Sparkles } from 'lucide-react';
import type { MindMap, Subject } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import GenerateFlashcardsDialog from '@/components/dialogs/GenerateFlashcardsDialog';

/**
 * MindMapApp - Entry Point for Mind Maps Feature Module
 * 
 * This is a fully encapsulated feature module that can be:
 * - Extracted to another application
 * - Removed without leaving residues
 * - Used as an independent package
 */
export default function MindMapApp() {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterSubjectId, setFilterSubjectId] = useState<string | 'all'>('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const { data: mindMaps, isLoading } = useQuery<MindMap[]>({
    queryKey: ['/api/mindmaps'],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
  });

  const createMutation = useMutation({
    mutationFn: async (mindMapData: any) => {
      const res = await apiRequest('POST', '/api/mindmaps', mindMapData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mindmaps'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PATCH', `/api/mindmaps/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mindmaps'] });
    },
  });

  const selectedMap = mindMaps?.find(m => m.id === selectedMapId);
  
  // Filter mind maps by subject
  const filteredMindMaps = mindMaps?.filter(map => 
    filterSubjectId === 'all' || map.subjectId === filterSubjectId
  );

  if (isCreating || selectedMap) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMapId(null);
              setIsCreating(false);
            }}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1">
            {isCreating ? 'Novo Mapa Mental' : selectedMap?.title}
          </h1>
          
          {/* FASE 3: Generate Flashcards Button */}
          {!isCreating && selectedMap && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerateDialog(true)}
              data-testid="button-generate-flashcards"
              className="hidden sm:flex"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Flashcards
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <ReactFlowProvider>
            <MindMapEditor
              title={isCreating ? 'Novo Mapa Mental' : selectedMap!.title}
              initialData={isCreating ? null : selectedMap ? {
                ...selectedMap,
                nodes: (selectedMap.content as any)?.nodes || [],
                edges: (selectedMap.content as any)?.edges || [],
                config: (selectedMap.content as any)?.config,
              } : null}
              className="w-full h-full"
              onSave={(data) => {
                if (isCreating) {
                  createMutation.mutate({
                    title: data.title,
                    content: { nodes: data.nodes, edges: data.edges, config: data.config },
                    generatedFromAI: false,
                  });
                } else if (selectedMapId) {
                  updateMutation.mutate({
                    id: selectedMapId,
                    data: {
                      content: { nodes: data.nodes, edges: data.edges, config: data.config },
                    },
                  });
                }
              }}
            />
          </ReactFlowProvider>
        </div>
        
        {/* FASE 3: Generate Flashcards Dialog */}
        {selectedMap && (
          <GenerateFlashcardsDialog
            open={showGenerateDialog}
            onOpenChange={setShowGenerateDialog}
            mindMapId={selectedMap.id}
            mindMapData={{
              nodes: (selectedMap.content as any)?.nodes || [],
              edges: (selectedMap.content as any)?.edges || [],
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate" data-testid="text-page-title">
            Mapas Mentais
          </h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">
            Organize conceitos visualmente com mapas mentais inteligentes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {subjects && subjects.length > 0 && (
            <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-subject-filter">
                <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Filtrar por matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto" data-testid="button-create-mindmap">
            <Plus className="w-4 h-4 mr-2" />
            <span className="sm:inline">Novo Mapa Mental</span>
            <span className="hidden">Novo</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredMindMaps && filteredMindMaps.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredMindMaps.map((map) => (
            <div
              key={map.id}
              className="border border-border rounded-lg p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]"
              onClick={() => setSelectedMapId(map.id)}
              data-testid={`card-mindmap-${map.id}`}
            >
              <h3 className="font-semibold mb-2 text-sm sm:text-base line-clamp-2" data-testid={`text-mindmap-title-${map.id}`}>
                {map.title}
              </h3>
              {map.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{map.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate mr-2">
                  {map.generatedFromAI && '🤖 IA'}
                </span>
                <span className="flex-shrink-0">
                  {new Date(map.updatedAt!).toLocaleDateString('pt-BR', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg px-4">
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Você ainda não criou nenhum mapa mental
          </p>
          <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Mapa
          </Button>
        </div>
      )}
    </div>
  );
}
