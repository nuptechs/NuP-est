import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMaterialSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Link, Video, File as FileIcon } from "lucide-react";
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
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/materials", subjectId] });
      }
      
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

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) return;

    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description || "");
    formData.append("subjectId", data.subjectId || "");
    formData.append("type", data.type);
    
    if (data.url) formData.append("url", data.url);
    if (data.content) formData.append("content", data.content);
    if (selectedFile) formData.append("file", selectedFile);

    uploadMutation.mutate(formData);
  };

  const { errors } = form.formState;
  const materialType = form.watch("type");

  const materialTypeOptions = [
    { value: "pdf", label: "Arquivo PDF", icon: FileText },
    { value: "txt", label: "Texto", icon: FileText },
    { value: "link", label: "Link/URL", icon: Link },
    { value: "video", label: "Vídeo", icon: Video },
    { value: "file", label: "Arquivo", icon: FileIcon },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-foreground font-medium">
          Título
        </Label>
        <Input
          id="title"
          placeholder="Nome do material" 
          {...form.register("title")}
          data-testid="input-material-title"
          className={errors.title ? "border-red-500" : ""}
        />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground font-medium">
          Descrição
        </Label>
        <Textarea
          id="description"
          placeholder="Breve descrição do material..."
          {...form.register("description")}
          data-testid="input-material-description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Matéria</Label>
          <Select
            value={form.watch("subjectId")}
            onValueChange={(value) => form.setValue("subjectId", value)}
            data-testid="select-material-subject"
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma matéria" />
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Tipo</Label>
          <Select
            value={form.watch("type")}
            onValueChange={(value) => form.setValue("type", value)}
            data-testid="select-material-type"
          >
            <SelectTrigger className={errors.type ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {materialTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">
              {errors.type.message}
            </p>
          )}
        </div>
      </div>

      {/* File Upload */}
      {(materialType === "pdf" || materialType === "file") && (
        <div className="space-y-2">
          <Label htmlFor="file" className="text-foreground font-medium">
            Arquivo
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : "Selecione um arquivo"}
                  </span>
                  <input
                    id="file"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    data-testid="input-material-file"
                    accept={materialType === "pdf" ? ".pdf" : "*/*"}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL Input */}
      {(materialType === "link" || materialType === "video") && (
        <div className="space-y-2">
          <Label htmlFor="url" className="text-foreground font-medium">
            URL
          </Label>
          <Input
            id="url"
            placeholder="https://exemplo.com"
            type="url"
            {...form.register("url")}
            data-testid="input-material-url"
            className={errors.url ? "border-red-500" : ""}
          />
          {errors.url && (
            <p className="text-red-500 text-sm mt-1">
              {errors.url.message}
            </p>
          )}
        </div>
      )}

      {/* Content Input */}
      {materialType === "txt" && (
        <div className="space-y-2">
          <Label htmlFor="content" className="text-foreground font-medium">
            Conteúdo
          </Label>
          <Textarea
            id="content"
            placeholder="Cole ou digite o conteúdo aqui..."
            {...form.register("content")}
            data-testid="input-material-content"
            rows={6}
            className={errors.content ? "border-red-500" : ""}
          />
          {errors.content && (
            <p className="text-red-500 text-sm mt-1">
              {errors.content.message}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-6 border-t border-border">
        <Button 
          type="button" 
          variant="outline"
          onClick={onSuccess}
          data-testid="button-cancel-material"
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={uploadMutation.isPending}
          data-testid="button-save-material"
          className="flex-1"
        >
          {uploadMutation.isPending ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </div>
          ) : (
            "Adicionar"
          )}
        </Button>
      </div>
    </form>
  );
}