import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { Form, Button, Dropdown, Grid } from "semantic-ui-react";
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
    { key: 'exatas', value: 'exatas', text: 'Exatas' },
    { key: 'humanas', value: 'humanas', text: 'Humanas' },
    { key: 'biologicas', value: 'biologicas', text: 'Biológicas' }
  ];

  const priorityOptions = [
    { key: 'high', value: 'high', text: 'Alta' },
    { key: 'medium', value: 'medium', text: 'Média' },
    { key: 'low', value: 'low', text: 'Baixa' }
  ];

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)} error={Object.keys(errors).length > 0}>
      <Form.Field error={!!errors.name}>
        <label>Nome da Matéria</label>
        <input 
          placeholder="Ex: Cálculo I" 
          {...form.register("name")}
          data-testid="input-subject-name"
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
          placeholder="Breve descrição da matéria..." 
          {...form.register("description")}
          data-testid="input-subject-description"
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

      <Grid columns={2} stackable>
        <Grid.Column>
          <Form.Field error={!!errors.category}>
            <label>Categoria</label>
            <Dropdown
              selection
              placeholder="Selecione"
              options={categoryOptions}
              value={form.watch("category")}
              onChange={(e, { value }) => form.setValue("category", value as string)}
              data-testid="select-subject-category"
              style={{ 
                backgroundColor: 'var(--nup-surface)',
                border: '1px solid var(--nup-border)'
              }}
            />
            {errors.category && (
              <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
                {errors.category.message}
              </div>
            )}
          </Form.Field>
        </Grid.Column>
        
        <Grid.Column>
          <Form.Field error={!!errors.priority}>
            <label>Prioridade</label>
            <Dropdown
              selection
              placeholder="Selecione"
              options={priorityOptions}
              value={form.watch("priority")}
              onChange={(e, { value }) => form.setValue("priority", value as string)}
              data-testid="select-subject-priority"
              style={{ 
                backgroundColor: 'var(--nup-surface)',
                border: '1px solid var(--nup-border)'
              }}
            />
            {errors.priority && (
              <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
                {errors.priority.message}
              </div>
            )}
          </Form.Field>
        </Grid.Column>
      </Grid>

      <Form.Field error={!!errors.color}>
        <label>Cor</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="color" 
            {...form.register("color")}
            data-testid="input-subject-color"
            style={{ 
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid var(--nup-border)',
              height: '40px',
              width: '50px',
              cursor: 'pointer'
            }}
          />
          <input 
            placeholder="#3b82f6" 
            {...form.register("color")}
            style={{ 
              flex: 1,
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid var(--nup-border)',
              color: 'var(--nup-text)',
              padding: '8px 12px'
            }}
          />
        </div>
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
          data-testid="button-cancel-subject"
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
          data-testid="button-save-subject"
          style={{ 
            backgroundColor: 'var(--nup-primary)',
            color: 'white'
          }}
        >
          {subject ? "Atualizar" : "Criar Matéria"}
        </Button>
      </div>
    </Form>
  );
}
