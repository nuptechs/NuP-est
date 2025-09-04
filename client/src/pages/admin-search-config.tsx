import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Edit, Check, X, Globe } from "lucide-react";
import type { SearchSite, InsertSearchSite, SiteSearchType } from "@shared/schema";

const SEARCH_TYPES = [
  { id: "concurso_publico", label: "Concurso Público" },
  { id: "vestibular", label: "Vestibular" },
  { id: "escola", label: "Escola" },
  { id: "faculdade", label: "Faculdade" },
  { id: "desenvolvimento_profissional", label: "Desenvolvimento Profissional" },
  { id: "outras", label: "Outras" },
] as const;

interface TableRow {
  id: string;
  name: string;
  url: string;
  description: string;
  selectedTypes: string[];
  isEditing: boolean;
  isNew: boolean;
}

export default function AdminSearchConfig() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

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

  // Efeito para converter sites existentes para o formato da tabela
  useEffect(() => {
    if (sites) {
      // Preservar apenas linhas em edição (novas)
      const editingRows = tableRows.filter(row => row.isNew && row.isEditing);
      
      const existingRows = sites.map((site: SearchSite) => ({
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description || "",
        selectedTypes: [],
        isEditing: false,
        isNew: false,
      }));
      
      setTableRows([...existingRows, ...editingRows]);
    }
  }, [sites]);

  // Efeito para atualizar os tipos selecionados nas linhas da tabela
  useEffect(() => {
    if (siteTypes) {
      setTableRows(prev => prev.map(row => ({
        ...row,
        selectedTypes: siteTypes[row.id]?.filter((t: SiteSearchType) => t.isEnabled).map((t: SiteSearchType) => t.searchType) || []
      })));
    }
  }, [siteTypes]);

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
    }
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
    }
  });

  const addNewRow = () => {
    const newRow: TableRow = {
      id: `new-${Date.now()}`,
      name: "",
      url: "",
      description: "",
      selectedTypes: [],
      isEditing: true,
      isNew: true,
    };
    setTableRows(prev => [...prev, newRow]);
  };

  const updateRow = (id: string, updates: Partial<TableRow>) => {
    setTableRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const removeRow = (id: string) => {
    const row = tableRows.find(r => r.id === id);
    if (row?.isNew) {
      // Se é uma nova linha, apenas remove da tabela
      setTableRows(prev => prev.filter(r => r.id !== id));
    } else {
      // Se é um site existente, chama a API para deletar
      deleteSiteMutation.mutate(id);
    }
  };

  const toggleRowEdit = (id: string) => {
    setTableRows(prev => prev.map(row => 
      row.id === id ? { ...row, isEditing: !row.isEditing } : row
    ));
  };

  const toggleType = (rowId: string, typeId: string) => {
    setTableRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const selectedTypes = row.selectedTypes.includes(typeId)
          ? row.selectedTypes.filter(t => t !== typeId)
          : [...row.selectedTypes, typeId];
        return { ...row, selectedTypes };
      }
      return row;
    }));
  };

  const saveRow = async (id: string) => {
    const row = tableRows.find(r => r.id === id);
    if (!row) return;

    if (!row.name.trim() || !row.url.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (row.selectedTypes.length === 0) {
      toast({
        title: "Tipos de busca",
        description: "Selecione pelo menos um tipo de busca",
        variant: "destructive",
      });
      return;
    }

    try {
      if (row.isNew) {
        await createSiteMutation.mutateAsync({
          site: {
            name: row.name,
            url: row.url,
            description: row.description || undefined,
            isActive: true,
          },
          searchTypes: row.selectedTypes,
        });
        
        toast({
          title: "✅ Site adicionado com sucesso!",
          description: `${row.name} foi configurado e o scraping iniciou automaticamente. Aguarde alguns minutos enquanto coletamos todo o conteúdo da página e suas paginações para o sistema de busca.`,
          duration: 8000, // Toast mais longo para dar tempo de ler
        });
        
        // Remover a linha editada da tabela local
        setTableRows(prev => prev.filter(r => r.id !== id));
        
        // Recarregar dados para mostrar o novo site
        queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/site-search-types"] });
      } else {
        // TODO: Implementar update para sites existentes
        updateRow(id, { isEditing: false });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar site",
        variant: "destructive",
      });
    }
  };

  const saveBulk = async () => {
    setIsBulkSaving(true);
    const newRows = tableRows.filter(row => row.isNew && row.name.trim() && row.url.trim());
    
    try {
      for (const row of newRows) {
        if (row.selectedTypes.length > 0) {
          await createSiteMutation.mutateAsync({
            site: {
              name: row.name,
              url: row.url,
              description: row.description || undefined,
              isActive: true,
            },
            searchTypes: row.selectedTypes,
          });
        }
      }
      
      toast({
        title: "✅ Sites salvos com sucesso!",
        description: `${newRows.length} sites foram configurados e o scraping automático iniciou. Aguarde alguns minutos enquanto coletamos todo o conteúdo das páginas e suas paginações para o sistema de busca.`,
        duration: 8000, // Toast mais longo para dar tempo de ler
      });
      
      // Limpar todas as linhas novas da tabela
      setTableRows(prev => prev.filter(row => !row.isNew));
      
      // Recarregar dados
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-search-types"] });
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar sites",
        variant: "destructive",
      });
    } finally {
      setIsBulkSaving(false);
    }
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

  const hasNewRows = tableRows.some(row => row.isNew);
  const newRowsCount = tableRows.filter(row => row.isNew).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
              <h1 className="text-xl font-semibold text-gray-900">Configurar Sites de Busca</h1>
              <p className="text-sm text-gray-600">Gerencie URLs e tipos de busca do sistema</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Card para URLs Configuradas */}
        {sites && sites.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                URLs Configuradas ({sites.length})
              </CardTitle>
              <CardDescription>
                Sites atualmente configurados para busca integrada. 
                <span className="text-green-600 font-medium">
                  Todos os sites passam por scraping automático completo incluindo paginações.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map((site) => {
                  const siteTypesList = siteTypes?.[site.id]?.filter(t => t.isEnabled) || [];
                  return (
                    <div key={site.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{site.name}</h3>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const row = tableRows.find(r => r.id === site.id);
                              if (row) toggleRowEdit(site.id);
                            }}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRow(site.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mb-2 break-all">{site.url}</p>
                      {site.description && (
                        <p className="text-xs text-gray-600 mb-2">{site.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {siteTypesList.map((type) => {
                          const typeInfo = SEARCH_TYPES.find(t => t.id === type.searchType);
                          return (
                            <Badge key={type.searchType} variant="secondary" className="text-xs">
                              {typeInfo?.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  Adicionar Novos Sites
                </CardTitle>
                <CardDescription>
                  Configure múltiplas URLs de busca e seus tipos. 
                  <br />
                  <span className="text-blue-600 font-medium">
                    🤖 Ao salvar, o sistema automaticamente:
                  </span>
                  <br />
                  <span className="text-sm text-gray-600">
                    • Valida se a URL está acessível<br />
                    • Coleta todo o conteúdo da página<br />
                    • Navega pelas paginações (até 50 páginas)<br />
                    • Processa e envia para o sistema de busca<br />
                    • Torna o conteúdo disponível para pesquisas
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={addNewRow}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-add-row"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Linha
                </Button>
                {hasNewRows && (
                  <Button 
                    onClick={saveBulk}
                    disabled={isBulkSaving}
                    className="flex items-center gap-2"
                    data-testid="button-save-all"
                  >
                    <Save className="h-4 w-4" />
                    {isBulkSaving ? "Salvando..." : `Salvar Todos (${newRowsCount})`}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] w-[15%]">Nome</TableHead>
                    <TableHead className="min-w-[200px] w-[25%]">URL</TableHead>
                    <TableHead className="min-w-[120px] w-[15%]">Descrição</TableHead>
                    <TableHead className="min-w-[200px] w-[30%]">Tipos de Busca</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Mostrar apenas linhas em edição (novas) */}
                  {tableRows.filter(row => row.isNew).map((row) => (
                    <TableRow key={row.id} className="bg-blue-50">
                      {/* Nome */}
                      <TableCell className="p-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          placeholder="Nome do site"
                          className="h-8 text-sm"
                          data-testid={`input-name-${row.id}`}
                        />
                      </TableCell>
                      
                      {/* URL */}
                      <TableCell className="p-2">
                        <Input
                          value={row.url}
                          onChange={(e) => updateRow(row.id, { url: e.target.value })}
                          placeholder="https://exemplo.com"
                          className="h-8 text-sm"
                          data-testid={`input-url-${row.id}`}
                        />
                      </TableCell>
                      
                      {/* Descrição */}
                      <TableCell className="p-2">
                        <Input
                          value={row.description}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          placeholder="Descrição opcional"
                          className="h-8 text-sm"
                          data-testid={`input-description-${row.id}`}
                        />
                      </TableCell>
                      
                      {/* Tipos de Busca */}
                      <TableCell className="p-2">
                        <div className="grid grid-cols-1 gap-1 max-w-[200px]">
                          {SEARCH_TYPES.map((type) => (
                            <label
                              key={type.id}
                              className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                            >
                              <Checkbox
                                checked={row.selectedTypes.includes(type.id)}
                                onCheckedChange={() => toggleType(row.id, type.id)}
                                className="h-3 w-3 flex-shrink-0"
                                data-testid={`checkbox-${type.id}-${row.id}`}
                              />
                              <span className="text-xs leading-none">{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </TableCell>
                      
                      {/* Ações */}
                      <TableCell className="p-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveRow(row.id)}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            data-testid={`button-save-${row.id}`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRow(row.id)}
                            className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            data-testid={`button-cancel-${row.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Mostrar mensagem quando não há linhas de edição */}
                  {tableRows.filter(row => row.isNew).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Plus className="h-8 w-8 text-gray-400" />
                          <p>Clique em "Adicionar Linha" para incluir um novo site</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {hasNewRows && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{newRowsCount} nova(s) linha(s)</strong> adicionada(s). 
                  Clique em "Salvar Todos" para confirmar as configurações.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}