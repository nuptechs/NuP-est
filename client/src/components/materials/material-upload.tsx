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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Matéria</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11" data-testid="select-material-subject">
                      <SelectValue placeholder="Selecione a matéria" />
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
                <FormLabel className="text-base font-medium">Tipo</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11" data-testid="select-material-type">
                      <SelectValue placeholder="Tipo do material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">📄 PDF</SelectItem>
                      <SelectItem value="doc">📝 Documento</SelectItem>
                      <SelectItem value="txt">📃 Texto</SelectItem>
                      <SelectItem value="link">🔗 Link</SelectItem>
                      <SelectItem value="video">🎥 Vídeo</SelectItem>
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Título</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nome do material"
                  className="h-11"
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
              <FormLabel className="text-base font-medium">Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição do conteúdo (opcional)"
                  className="resize-none h-20"
                  {...field}
                  data-testid="input-material-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Upload de Arquivo */}
        {materialType && materialType !== "link" && materialType !== "video" && materialType !== "txt" && (
          <div className="space-y-3">
            <label className="text-base font-medium">Arquivo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                {selectedFile ? (
                  <div className="space-y-2">
                    <File className="h-8 w-8 mx-auto text-green-600" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar arquivo
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* URL para links e vídeos */}
        {(materialType === "link" || materialType === "video") && (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={`https://exemplo.com`}
                    type="url"
                    className="h-11"
                    {...field}
                    data-testid="input-material-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Conteúdo de texto */}
        {materialType === "txt" && (
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Conteúdo</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Cole ou digite o conteúdo aqui..."
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


        <div className="flex gap-3 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            data-testid="button-cancel-material"
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={uploadMutation.isPending}
            data-testid="button-save-material"
            className="flex-1 h-11"
          >
            {uploadMutation.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
