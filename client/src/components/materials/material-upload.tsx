import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMaterialSchema } from "@shared/schema";
import { z } from "zod";
import { Form, Button, Dropdown, Grid } from "semantic-ui-react";
import { Upload, FileText, Link, Video, File } from "lucide-react";
import type { Subject } from "@shared/schema";

interface MaterialUploadProps {
  onSuccess: () => void;
  subjectId?: string;
}

const formSchema = insertMaterialSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
});

export default function MaterialUpload({ onSuccess, subjectId }: MaterialUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: subjectId || "",
      type: "",
      url: "",
      content: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/materials", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to upload material");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate general materials query
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      
      // If we have a subjectId, also invalidate the specific subject's materials
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/materials", subjectId] });
      }
      
      // Invalidate all materials queries with any subjectId
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/materials"
      });
      
      toast({
        title: "Sucesso",
        description: "Material adicionado com sucesso!",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar material: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!user) return;
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });

    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!form.getValues("title")) {
        form.setValue("title", file.name.split('.')[0]);
      }
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension) {
        form.setValue("type", extension);
      }
    }
  };

  const materialType = form.watch("type");
  const { errors } = form.formState;
  
  const subjectOptions = subjects?.map(subject => ({
    key: subject.id,
    value: subject.id,
    text: subject.name
  })) || [];

  const typeOptions = [
    { key: 'pdf', value: 'pdf', text: '📄 PDF' },
    { key: 'doc', value: 'doc', text: '📝 Documento' },
    { key: 'txt', value: 'txt', text: '📃 Texto' },
    { key: 'link', value: 'link', text: '🔗 Link' },
    { key: 'video', value: 'video', text: '🎥 Vídeo' }
  ];

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)} error={Object.keys(errors).length > 0}>
      <Grid columns={2} stackable>
        <Grid.Column>
          <Form.Field error={!!errors.subjectId}>
            <label>Matéria</label>
            <Dropdown
              selection
              placeholder="Selecione a matéria"
              options={subjectOptions}
              value={form.watch("subjectId")}
              onChange={(e, { value }) => form.setValue("subjectId", value as string)}
              data-testid="select-material-subject"
              style={{ 
                backgroundColor: 'var(--nup-surface)',
                border: '1px solid var(--nup-border)'
              }}
            />
            {errors.subjectId && (
              <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
                {errors.subjectId.message}
              </div>
            )}
          </Form.Field>
        </Grid.Column>
        
        <Grid.Column>
          <Form.Field error={!!errors.type}>
            <label>Tipo</label>
            <Dropdown
              selection
              placeholder="Tipo do material"
              options={typeOptions}
              value={form.watch("type")}
              onChange={(e, { value }) => form.setValue("type", value as string)}
              data-testid="select-material-type"
              style={{ 
                backgroundColor: 'var(--nup-surface)',
                border: '1px solid var(--nup-border)'
              }}
            />
            {errors.type && (
              <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
                {errors.type.message}
              </div>
            )}
          </Form.Field>
        </Grid.Column>
      </Grid>

      <Form.Field error={!!errors.title}>
        <label>Título</label>
        <input 
          placeholder="Nome do material"
          {...form.register("title")}
          data-testid="input-material-title"
          style={{ 
            backgroundColor: 'var(--nup-surface)',
            border: '1px solid var(--nup-border)',
            color: 'var(--nup-text)',
            padding: '12px'
          }}
        />
        {errors.title && (
          <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
            {errors.title.message}
          </div>
        )}
      </Form.Field>

      <Form.Field error={!!errors.description}>
        <label>Descrição</label>
        <textarea 
          placeholder="Descrição do conteúdo (opcional)"
          {...form.register("description")}
          data-testid="input-material-description"
          rows={3}
          style={{ 
            backgroundColor: 'var(--nup-surface)',
            border: '1px solid var(--nup-border)',
            color: 'var(--nup-text)',
            resize: 'vertical',
            padding: '12px'
          }}
        />
        {errors.description && (
          <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
            {errors.description.message}
          </div>
        )}
      </Form.Field>

      {/* Upload de Arquivo */}
      {materialType && materialType !== "link" && materialType !== "video" && materialType !== "txt" && (
        <Form.Field>
          <label>Arquivo</label>
          <div style={{
            border: '2px dashed var(--nup-border)',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--nup-surface)'
          }}>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.md"
              style={{ display: 'none' }}
              id="file-upload"
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
              {selectedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <File style={{ width: '32px', height: '32px', color: 'var(--nup-primary)' }} />
                  <p style={{ fontWeight: '500', color: 'var(--nup-text)' }}>{selectedFile.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--nup-gray-600)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload style={{ width: '32px', height: '32px', color: 'var(--nup-gray-400)' }} />
                  <p style={{ fontSize: '14px', color: 'var(--nup-gray-600)' }}>
                    Clique para selecionar arquivo
                  </p>
                </div>
              )}
            </label>
          </div>
        </Form.Field>
      )}

      {/* URL para links e vídeos */}
      {(materialType === "link" || materialType === "video") && (
        <Form.Field error={!!errors.url}>
          <label>URL</label>
          <input 
            placeholder="https://exemplo.com"
            type="url"
            {...form.register("url")}
            data-testid="input-material-url"
            style={{ 
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid var(--nup-border)',
              color: 'var(--nup-text)',
              padding: '12px'
            }}
          />
          {errors.url && (
            <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
              {errors.url.message}
            </div>
          )}
        </Form.Field>
      )}

      {/* Conteúdo de texto */}
      {materialType === "txt" && (
        <Form.Field error={!!errors.content}>
          <label>Conteúdo</label>
          <textarea 
            placeholder="Cole ou digite o conteúdo aqui..."
            {...form.register("content")}
            data-testid="input-material-content"
            rows={6}
            style={{ 
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid var(--nup-border)',
              color: 'var(--nup-text)',
              resize: 'vertical',
              padding: '12px'
            }}
          />
          {errors.content && (
            <div style={{ color: 'var(--nup-error)', fontSize: '12px', marginTop: '4px' }}>
              {errors.content.message}
            </div>
          )}
        </Form.Field>
      )}

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        paddingTop: '24px',
        borderTop: '1px solid var(--nup-border)',
        marginTop: '24px'
      }}>
        <Button 
          type="button" 
          basic
          onClick={onSuccess}
          data-testid="button-cancel-material"
          style={{ 
            flex: 1,
            color: 'var(--nup-text)',
            borderColor: 'var(--nup-border)'
          }}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          primary
          loading={uploadMutation.isPending}
          disabled={uploadMutation.isPending}
          data-testid="button-save-material"
          style={{ 
            flex: 1,
            backgroundColor: 'var(--nup-primary)',
            color: 'white'
          }}
        >
          {uploadMutation.isPending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </Form>
  );
}
