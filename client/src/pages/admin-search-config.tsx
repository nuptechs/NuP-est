import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Globe, Search } from "lucide-react";
import type { SearchSite, InsertSearchSite, SiteSearchType } from "@shared/schema";

const SEARCH_TYPES = [
  { id: "concurso_publico", label: "Concurso Público" },
  { id: "vestibular", label: "Vestibular" },
  { id: "escola", label: "Escola" },
  { id: "faculdade", label: "Faculdade" },
  { id: "desenvolvimento_profissional", label: "Desenvolvimento Profissional" },
  { id: "outras", label: "Outras" },
] as const;

export default function AdminSearchConfig() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<InsertSearchSite>({
    name: "",
    url: "",
    description: "",
    isActive: true,
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Buscar sites existentes
  const { data: sites, isLoading } = useQuery<SearchSite[]>({
    queryKey: ["/api/admin/search-sites"],
    enabled: isAuthenticated,
  });

  // Buscar tipos de busca por site
  const { data: siteTypes } = useQuery<Record<string, SiteSearchType[]>>({
    queryKey: ["/api/admin/site-search-types"],
    enabled: isAuthenticated,
  });

  // Mutação para criar novo site
  const createSiteMutation = useMutation({
    mutationFn: async (data: { site: InsertSearchSite; searchTypes: string[] }) => {
      const response = await fetch("/api/admin/search-sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site adicionado",
        description: "Site de busca configurado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-search-types"] });
      setIsAddingNew(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar site",
        variant: "destructive",
      });
    },
  });

  // Mutação para deletar site
  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const response = await fetch(`/api/admin/search-sites/${siteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site removido",
        description: "Site de busca removido com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-search-types"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover site",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      description: "",
      isActive: true,
    });
    setSelectedTypes([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (selectedTypes.length === 0) {
      toast({
        title: "Tipos de busca",
        description: "Selecione pelo menos um tipo de busca",
        variant: "destructive",
      });
      return;
    }

    createSiteMutation.mutate({
      site: formData,
      searchTypes: selectedTypes,
    });
  };

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Configurar Buscas</h1>
              <p className="text-sm text-gray-600">Gerencie sites e tipos de busca do sistema</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Botão adicionar novo */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Sites de Busca</h2>
            <Button 
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2"
              data-testid="button-add-site"
            >
              <Plus className="h-4 w-4" />
              Adicionar Site
            </Button>
          </div>

          {/* Formulário para novo site */}
          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>Novo Site de Busca</CardTitle>
                <CardDescription>
                  Configure um novo site para realizar buscas automatizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Site</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Cebraspe"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-site-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL do Site</Label>
                      <Input
                        id="url"
                        placeholder="Ex: https://www.cebraspe.org.br"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        data-testid="input-site-url"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o que este site oferece..."
                      value={formData.description || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      data-testid="input-site-description"
                    />
                  </div>

                  <div>
                    <Label>Tipos de Busca</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {SEARCH_TYPES.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={type.id}
                            checked={selectedTypes.includes(type.id)}
                            onCheckedChange={() => handleTypeToggle(type.id)}
                            data-testid={`checkbox-${type.id}`}
                          />
                          <Label htmlFor={type.id} className="text-sm">
                            {type.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createSiteMutation.isPending}
                      data-testid="button-save-site"
                    >
                      {createSiteMutation.isPending ? "Salvando..." : "Salvar Site"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setIsAddingNew(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de sites existentes */}
          <div className="grid gap-4">
            {sites?.map((site) => {
              const types = siteTypes?.[site.id] || [];
              const enabledTypes = types.filter(t => t.isEnabled);
              
              return (
                <Card key={site.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <h3 className="font-semibold text-gray-900">{site.name}</h3>
                          {!site.isActive && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{site.url}</p>
                        {site.description && (
                          <p className="text-sm text-gray-500 mb-3">{site.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {enabledTypes.map((type) => {
                            const typeInfo = SEARCH_TYPES.find(t => t.id === type.searchType);
                            return (
                              <span
                                key={type.id}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                              >
                                {typeInfo?.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSiteMutation.mutate(site.id)}
                        disabled={deleteSiteMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${site.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {sites?.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum site configurado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Adicione sites para realizar buscas automatizadas de concursos, vestibulares e mais.
                  </p>
                  <Button onClick={() => setIsAddingNew(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Site
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}