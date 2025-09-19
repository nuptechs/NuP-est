import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Matéria</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Cálculo I" 
                  {...field} 
                  data-testid="input-subject-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Breve descrição da matéria..."
                  className="resize-none"
                  {...field}
                  data-testid="input-subject-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-subject-category">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exatas">Exatas</SelectItem>
                      <SelectItem value="humanas">Humanas</SelectItem>
                      <SelectItem value="biologicas">Biológicas</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-subject-priority">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="color" 
                    {...field}
                    className="w-12 h-10 p-1 border border-border rounded"
                    data-testid="input-subject-color"
                  />
                  <Input 
                    placeholder="#3b82f6" 
                    {...field}
                    className="flex-1"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
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
            {createMutation.isPending 
              ? "Salvando..." 
              : subject ? "Atualizar" : "Criar Matéria"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
