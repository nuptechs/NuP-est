import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@shared/schema";

interface SubjectFormProps {
  subject?: Subject | null;
  areaId?: string;
  onSuccess: () => void;
}

const formSchema = insertSubjectSchema.omit({ userId: true }).extend({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

export default function SubjectForm({ subject, areaId, onSuccess }: SubjectFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: subject?.name || "",
      description: subject?.description || "",
      category: subject?.category || "",
      priority: subject?.priority || "medium",
      color: subject?.color || "#3b82f6",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const url = subject ? `/api/subjects/${subject.id}` : "/api/subjects";
      const method = subject ? "PATCH" : "POST";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      if (areaId) {
        queryClient.invalidateQueries({ queryKey: ["/api/subjects", areaId] });
      }
      toast({
        title: "Sucesso",
        description: subject ? "Matéria atualizada com sucesso!" : "Matéria criada com sucesso!",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar matéria",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!user) return;
    createMutation.mutate({ 
      ...data,
      areaId: areaId || null
    });
  };

  const { errors } = form.formState;
  
  const categoryOptions = [
    { value: 'exatas', label: 'Exatas' },
    { value: 'humanas', label: 'Humanas' },
    { value: 'biologicas', label: 'Biológicas' }
  ];

  const priorityOptions = [
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Média' },
    { value: 'low', label: 'Baixa' }
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground font-medium">
          Nome da Matéria
        </Label>
        <Input
          id="name"
          placeholder="Ex: Cálculo I" 
          {...form.register("name")}
          data-testid="input-subject-name"
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
          placeholder="Breve descrição da matéria..." 
          {...form.register("description")}
          data-testid="input-subject-description"
          rows={3}
          className={`resize-none ${errors.description ? "border-red-500" : ""}`}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground font-medium">
            Categoria
          </Label>
          <Select
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
            data-testid="select-subject-category"
          >
            <SelectTrigger className={errors.category ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">
              {errors.category.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-foreground font-medium">
            Prioridade
          </Label>
          <Select
            value={form.watch("priority")}
            onValueChange={(value) => form.setValue("priority", value)}
            data-testid="select-subject-priority"
          >
            <SelectTrigger className={errors.priority ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && (
            <p className="text-red-500 text-sm mt-1">
              {errors.priority.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color" className="text-foreground font-medium">
          Cor
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="color"
            type="color" 
            {...form.register("color")}
            data-testid="input-subject-color"
            className={`w-12 h-10 cursor-pointer ${errors.color ? "border-red-500" : ""}`}
          />
          <Input
            placeholder="#3b82f6" 
            {...form.register("color")}
            className={`flex-1 ${errors.color ? "border-red-500" : ""}`}
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
          data-testid="button-cancel-subject"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-save-subject"
        >
          {createMutation.isPending ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </div>
          ) : (
            subject ? "Atualizar" : "Criar Matéria"
          )}
        </Button>
      </div>
    </form>
  );
}