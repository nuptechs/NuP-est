import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMaterialSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Subject } from "@shared/schema";

interface MaterialUploadProps {
  onSuccess: () => void;
}

const formSchema = insertMaterialSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
});

export default function MaterialUpload({ onSuccess }: MaterialUploadProps) {
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
      subjectId: "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
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
    
    Object.entries({...data, userId: user.id}).forEach(([key, value]) => {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Material</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Apostila de Cálculo - Capítulo 1" 
                  {...field}
                  data-testid="input-material-title"
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
                  placeholder="Descreva o conteúdo do material..."
                  className="resize-none"
                  {...field}
                  data-testid="input-material-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matéria</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-material-subject">
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject: Subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-material-type">
                      <SelectValue placeholder="Tipo do material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="doc">Documento</SelectItem>
                      <SelectItem value="txt">Texto</SelectItem>
                      <SelectItem value="link">Link/URL</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* File Upload */}
        {materialType && materialType !== "link" && materialType !== "video" && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Arquivo do Material
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="hidden"
                    id="file-upload"
                    data-testid="input-file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <i className="fas fa-file text-primary text-2xl"></i>
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <i className="fas fa-cloud-upload-alt text-muted-foreground text-2xl"></i>
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar um arquivo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, TXT, MD (máx. 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* URL Input for links and videos */}
        {(materialType === "link" || materialType === "video") && (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do {materialType === "video" ? "Vídeo" : "Link"}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={`https://exemplo.com/${materialType === "video" ? "video" : "artigo"}`}
                    type="url"
                    {...field}
                    data-testid="input-material-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Text Content for manual entry */}
        {materialType === "txt" && (
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conteúdo do Texto</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Cole ou digite o conteúdo do material aqui..."
                    className="resize-none h-32"
                    {...field}
                    data-testid="input-material-content"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            data-testid="button-cancel-material"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={uploadMutation.isPending}
            data-testid="button-save-material"
          >
            {uploadMutation.isPending 
              ? "Salvando..." 
              : subject ? "Atualizar" : "Adicionar Material"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
