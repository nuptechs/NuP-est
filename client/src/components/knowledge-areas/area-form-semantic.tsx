import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKnowledgeAreaSchema } from "@shared/schema";
import { z } from "zod";
import { Form, Button } from "semantic-ui-react";
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
    <Form onSubmit={form.handleSubmit(onSubmit)} error={Object.keys(errors).length > 0}>
      <Form.Field error={!!errors.name}>
        <label>Nome da Área</label>
        <input 
          placeholder="Ex: Ciências Exatas" 
          {...form.register("name")}
          data-testid="input-area-name"
          style={{ 
            backgroundColor: 'var(--nup-surface)',
            border: '1px solid var(--nup-border)',
            color: 'var(--nup-text)'
          }}
        />
        {errors.name && (
          <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
            {errors.name.message}
          </div>
        )}
      </Form.Field>

      <Form.Field error={!!errors.description}>
        <label>Descrição</label>
        <textarea 
          placeholder="Descreva esta área de conhecimento..." 
          {...form.register("description")}
          data-testid="textarea-area-description"
          rows={3}
          style={{ 
            backgroundColor: 'var(--nup-surface)',
            border: '1px solid var(--nup-border)',
            color: 'var(--nup-text)',
            resize: 'vertical'
          }}
        />
        {errors.description && (
          <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
            {errors.description.message}
          </div>
        )}
      </Form.Field>

      <Form.Field error={!!errors.color}>
        <label>Cor</label>
        <input 
          type="color" 
          {...form.register("color")}
          data-testid="input-area-color"
          style={{ 
            backgroundColor: 'var(--nup-surface)',
            border: '1px solid var(--nup-border)',
            height: '40px',
            cursor: 'pointer'
          }}
        />
        {errors.color && (
          <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
            {errors.color.message}
          </div>
        )}
      </Form.Field>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '12px', 
        paddingTop: '24px',
        borderTop: '1px solid var(--nup-border)',
        marginTop: '24px'
      }}>
        <Button 
          type="button" 
          basic
          onClick={onSuccess}
          data-testid="button-cancel-area"
          style={{ 
            color: 'var(--nup-text)',
            borderColor: 'var(--nup-border)'
          }}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          primary
          loading={createMutation.isPending}
          disabled={createMutation.isPending}
          data-testid="button-submit-area"
          style={{ 
            backgroundColor: 'var(--nup-primary)',
            color: 'white'
          }}
        >
          {area ? "Atualizar" : "Criar Área"}
        </Button>
      </div>
    </Form>
  );
}