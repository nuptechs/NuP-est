import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@nup/ui";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKnowledgeAreaSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { KnowledgeArea } from "@shared/schema";

interface AreaFormProps {
  area?: KnowledgeArea | null;
  onSuccess: () => void;
}

const formSchema = insertKnowledgeAreaSchema.omit({ userId: true }).extend({
  name: z.string().min(1, "Nome é obrigatório"),
});

export default function AreaForm({ area, onSuccess }: AreaFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: area?.name || "",
      description: area?.description || "",
      color: area?.color || "#3b82f6",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const url = area ? `/api/areas/${area.id}` : "/api/areas";
      const method = area ? "PATCH" : "POST";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      toast({
        title: "Sucesso",
        description: area ? "Área atualizada com sucesso!" : "Área criada com sucesso!",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar área",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!user) return;
    createMutation.mutate({ 
      ...data,
    });
  };

  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground font-medium">
          Nome da Área
        </Label>
        <Input
          id="name"
          placeholder="Ex: Ciências Exatas" 
          {...form.register("name")}
          data-testid="input-area-name"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground font-medium">
          Descrição
        </Label>
        <Textarea
          id="description"
          placeholder="Descreva esta área de conhecimento..." 
          {...form.register("description")}
          data-testid="textarea-area-description"
          rows={3}
          className={`resize-none ${errors.description ? "border-red-500" : ""}`}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color" className="text-foreground font-medium">
          Cor
        </Label>
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-10 rounded-md border-2 border-border shadow-sm transition-all"
            style={{ backgroundColor: form.watch("color") }}
          />
          <Input
            id="color"
            type="color" 
            {...form.register("color")}
            data-testid="input-area-color"
            className="flex-1 h-10 cursor-pointer"
          />
        </div>
        {errors.color && (
          <p className="text-red-500 text-sm mt-1">
            {errors.color.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-border">
        <Button 
          type="button" 
          variant="outline"
          onClick={onSuccess}
          data-testid="button-cancel-area"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-submit-area"
        >
          {createMutation.isPending ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </div>
          ) : (
            area ? "Atualizar" : "Criar Área"
          )}
        </Button>
      </div>
    </form>
  );
}