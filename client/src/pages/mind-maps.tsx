import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MindMapEditor } from '@/lib/mindmap';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { MindMap } from '@db/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function MindMapsPage() {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: mindMaps, isLoading } = useQuery<MindMap[]>({
    queryKey: ['/api/mindmaps'],
  });

  const createMutation = useMutation({
    mutationFn: async (mindMapData: any) => {
      return await apiRequest('/api/mindmaps', {
        method: 'POST',
        body: JSON.stringify(mindMapData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mindmaps'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/mindmaps/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mindmaps'] });
    },
  });

  const selectedMap = mindMaps?.find(m => m.id === selectedMapId);

  if (isCreating || selectedMap) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMapId(null);
              setIsCreating(false);
            }}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold">
            {isCreating ? 'Novo Mapa Mental' : selectedMap?.title}
          </h1>
        </div>
        <div className="flex-1">
          <ReactFlowProvider>
            <MindMapEditor
              title={isCreating ? 'Novo Mapa Mental' : selectedMap!.title}
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
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Mapas Mentais
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize conceitos visualmente com mapas mentais inteligentes
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} data-testid="button-create-mindmap">
          <Plus className="w-4 h-4 mr-2" />
          Novo Mapa Mental
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : mindMaps && mindMaps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mindMaps.map((map) => (
            <div
              key={map.id}
              className="border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedMapId(map.id)}
              data-testid={`card-mindmap-${map.id}`}
            >
              <h3 className="font-semibold mb-2" data-testid={`text-mindmap-title-${map.id}`}>
                {map.title}
              </h3>
              {map.description && (
                <p className="text-sm text-muted-foreground mb-3">{map.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {map.generatedFromAI && '🤖 Gerado por IA'}
                </span>
                <span>
                  {new Date(map.updatedAt!).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">
            Você ainda não criou nenhum mapa mental
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Mapa
          </Button>
        </div>
      )}
    </div>
  );
}
