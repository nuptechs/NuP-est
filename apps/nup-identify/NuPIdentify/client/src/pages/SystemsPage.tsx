import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Code2, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface System {
  id: string;
  name: string;
  description: string;
  apiUrl: string;
  webhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemFunction {
  id: string;
  systemId: string;
  functionKey: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
}

export default function SystemsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFunctionsDialogOpen, setIsFunctionsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [systemToDelete, setSystemToDelete] = useState<System | null>(null);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    apiUrl: "",
    webhookUrl: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systems, isLoading } = useQuery<System[]>({
    queryKey: ["/api/systems"],
  });

  const { data: systemFunctions } = useQuery<{ functions: SystemFunction[]; byCategory: Record<string, SystemFunction[]> }>({
    queryKey: [`/api/systems/${selectedSystem?.id}/functions`],
    enabled: !!selectedSystem && isFunctionsDialogOpen,
  });

  const createSystemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar sistema");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sistema criado",
        description: "Sistema registrado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar sistema",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/systems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar sistema");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      setIsEditDialogOpen(false);
      setSelectedSystem(null);
      resetForm();
      toast({
        title: "Sistema atualizado",
        description: "Informações atualizadas com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar sistema",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/systems/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao deletar sistema");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      setIsDeleteDialogOpen(false);
      setSystemToDelete(null);
      toast({
        title: "Sistema deletado",
        description: "Sistema removido com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar sistema",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      apiUrl: "",
      webhookUrl: "",
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (system: System) => {
    setSelectedSystem(system);
    setFormData({
      id: system.id,
      name: system.name,
      description: system.description,
      apiUrl: system.apiUrl,
      webhookUrl: system.webhookUrl || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewFunctions = (system: System) => {
    setSelectedSystem(system);
    setIsFunctionsDialogOpen(true);
  };

  const handleDeleteClick = (system: System) => {
    setSystemToDelete(system);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (systemToDelete) {
      deleteSystemMutation.mutate(systemToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando sistemas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistemas Integrados</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os sistemas que integram com NuPIdentity
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Sistema
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Novo Sistema</DialogTitle>
              <DialogDescription>
                Adicione um novo sistema ao NuPIdentity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="id">ID do Sistema</Label>
                <Input
                  id="id"
                  placeholder="nup-crm"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identificador único (kebab-case)
                </p>
              </div>
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="NuP-CRM - Sistema de CRM"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Sistema de gestão de relacionamento com clientes"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input
                  id="apiUrl"
                  placeholder="https://crm.nuptechs.com"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="webhookUrl">URL do Webhook (opcional)</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://crm.nuptechs.com/webhooks/identity"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createSystemMutation.mutate(formData)}
                disabled={!formData.id || !formData.name || createSystemMutation.isPending}
              >
                {createSystemMutation.isPending ? "Criando..." : "Criar Sistema"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!systems || systems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Code2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum sistema registrado ainda.
              <br />
              Clique em "Novo Sistema" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <Card key={system.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{system.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {system.id}
                      </code>
                    </CardDescription>
                  </div>
                  <Badge variant={system.isActive ? "default" : "secondary"}>
                    {system.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {system.description || "Sem descrição"}
                </p>
                
                {system.apiUrl && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">API:</span>{" "}
                    <code className="bg-muted px-1 rounded">{system.apiUrl}</code>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewFunctions(system)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Funções
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(system)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(system)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sistema</DialogTitle>
            <DialogDescription>
              Atualize as informações do sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-id">ID do Sistema</Label>
              <Input
                id="edit-id"
                value={formData.id}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-apiUrl">URL da API</Label>
              <Input
                id="edit-apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-webhookUrl">URL do Webhook</Label>
              <Input
                id="edit-webhookUrl"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedSystem) {
                  updateSystemMutation.mutate({
                    id: selectedSystem.id,
                    data: {
                      name: formData.name,
                      description: formData.description,
                      apiUrl: formData.apiUrl,
                      webhookUrl: formData.webhookUrl,
                    },
                  });
                }
              }}
              disabled={updateSystemMutation.isPending}
            >
              {updateSystemMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFunctionsDialogOpen} onOpenChange={setIsFunctionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Funções - {selectedSystem?.name}</DialogTitle>
            <DialogDescription>
              Permissões sincronizadas do sistema
            </DialogDescription>
          </DialogHeader>
          
          {systemFunctions?.byCategory && Object.keys(systemFunctions.byCategory).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(systemFunctions.byCategory).map(([category, functions]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="grid gap-2">
                    {functions.map((func) => (
                      <Card key={func.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{func.name}</div>
                            <code className="text-xs text-muted-foreground">
                              {func.functionKey}
                            </code>
                            {func.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {func.description}
                              </p>
                            )}
                            {func.endpoint && (
                              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                                {func.endpoint}
                              </code>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 text-sm text-muted-foreground">
                Total: {systemFunctions.functions.length} funções
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma função sincronizada ainda.</p>
              <p className="text-xs mt-2">
                Use o endpoint POST /api/systems/{selectedSystem?.id}/sync-functions
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar o sistema <strong>{systemToDelete?.name}</strong>.
              <br />
              <br />
              Esta ação irá remover:
              <ul className="list-disc list-inside mt-2">
                <li>O sistema e todas as suas configurações</li>
                <li>Todas as funções/permissões associadas</li>
                <li>Vínculos com organizações</li>
              </ul>
              <br />
              <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, deletar sistema
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
