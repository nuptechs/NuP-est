/**
 * Admin Search Config - Search Sites Management
 * Simplified from 548 lines to clean, professional UX
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@nup/ui";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe, Settings } from "lucide-react";
import type { SearchSite } from "@shared/schema";

export default function AdminSearchConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    description: ''
  });

  const { data: sites = [], isLoading } = useQuery<SearchSite[]>({
    queryKey: ["/api/admin/search-sites"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSite) => {
      const response = await fetch("/api/admin/search-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: data, searchTypes: ['concurso_publico'] }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
      setIsCreateOpen(false);
      setNewSite({ name: '', url: '', description: '' });
      toast({ title: "Site adicionado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar site", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const response = await fetch(`/api/admin/search-sites/${siteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-sites"] });
      toast({ title: "Site removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover site", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newSite.name.trim() || !newSite.url.trim()) {
      toast({ title: "Nome e URL são obrigatórios", variant: "destructive" });
      return;
    }
    createMutation.mutate(newSite);
  };

  return (
    <UnifiedShell title="Configuração de Busca">
      <div className="p-6 space-y-6">
        <ModernPageHeader
          title="Sites de Busca"
          description="Gerencie os sites externos para busca integrada"
          icon={Settings}
          actions={
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-site">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Site de Busca</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newSite.name}
                      onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                      placeholder="Ex: PCI Concursos"
                      data-testid="input-site-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      value={newSite.url}
                      onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-site-url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={newSite.description}
                      onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                      placeholder="Breve descrição..."
                      data-testid="input-site-description"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                      data-testid="button-create-site"
                    >
                      {createMutation.isPending ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sites.length === 0 ? (
              <div className="p-12">
                <ModernEmptyState
                  icon={Globe}
                  title="Nenhum site configurado"
                  description="Adicione sites externos para busca integrada"
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {site.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {site.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {site.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(site.id)}
                          data-testid={`button-delete-${site.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedShell>
  );
}
