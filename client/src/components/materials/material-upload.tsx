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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Upload, Link, FileText, Video } from "lucide-react";
import type { Subject } from "@shared/schema";

interface MaterialUploadProps {
  onSuccess: () => void;
  preSelectedSubjectId?: string;
}

const formSchema = insertMaterialSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
});

export default function MaterialUpload({ onSuccess, preSelectedSubjectId }: MaterialUploadProps) {
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
      subjectId: preSelectedSubjectId || "",
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
  const selectedSubjectId = form.watch("subjectId");
  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'doc': return <FileText className="h-4 w-4" />;
      case 'txt': return <FileText className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-500';
      case 'doc': return 'bg-blue-500';
      case 'txt': return 'bg-green-500';
      case 'link': return 'bg-purple-500';
      case 'video': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com matéria selecionada */}
      {selectedSubject && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adicionando material para:</p>
                <p className="font-semibold text-primary">{selectedSubject.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Seleção de Matéria - Destaque */}
          <Card className={selectedSubject ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                1. Escolha a Matéria
                {selectedSubject && <Badge variant="outline" className="text-green-600 border-green-600">✓ Selecionada</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Em qual matéria este material se encaixa?</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 text-base" data-testid="select-material-subject">
                          <SelectValue placeholder="🎯 Selecione a matéria do material" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects?.map((subject: Subject) => (
                            <SelectItem key={subject.id} value={subject.id} className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <span className="font-medium">{subject.name}</span>
                                <Badge variant="outline" className="text-xs">{subject.category}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tipo de Material */}
          <Card className={materialType ? "border-blue-200 bg-blue-50/50" : "border-gray-200"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {getTypeIcon(materialType || '')}
                2. Tipo do Material
                {materialType && <Badge variant="outline" className="text-blue-600 border-blue-600">✓ Selecionado</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Que tipo de material você está adicionando?</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { value: 'pdf', label: 'PDF', icon: FileText },
                          { value: 'doc', label: 'Documento', icon: FileText },
                          { value: 'txt', label: 'Texto', icon: FileText },
                          { value: 'link', label: 'Link', icon: Link },
                          { value: 'video', label: 'Vídeo', icon: Video },
                        ].map((type) => {
                          const Icon = type.icon;
                          const isSelected = field.value === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => field.onChange(type.value)}
                              className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                                isSelected 
                                  ? `border-primary bg-primary/10 text-primary` 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                              <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                                {type.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Informações do Material */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                3. Detalhes do Material
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Material</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Apostila de Cálculo - Capítulo 1" 
                        className="h-12 text-base"
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
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
            </CardContent>
          </Card>

          {/* Seção de Upload/Conteúdo baseada no tipo */}
          {materialType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getTypeIcon(materialType)}
                  4. {materialType === 'link' ? 'Link do Material' : materialType === 'video' ? 'URL do Vídeo' : materialType === 'txt' ? 'Conteúdo do Texto' : 'Arquivo do Material'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {materialType && materialType !== "link" && materialType !== "video" && materialType !== "txt" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center bg-primary/5 hover:bg-primary/10 transition-colors">
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
                          <div className="space-y-3">
                            <div className={`w-16 h-16 rounded-full ${getTypeColor(materialType)} flex items-center justify-center mx-auto`}>
                              {getTypeIcon(materialType)}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-foreground">{selectedFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                                ✓ Arquivo selecionado
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload className="h-12 w-12 text-primary mx-auto" />
                            <div>
                              <p className="text-lg font-medium text-foreground mb-1">
                                Clique para selecionar seu arquivo
                              </p>
                              <p className="text-sm text-muted-foreground">
                                PDF, DOC, DOCX, TXT, MD (máx. 10MB)
                              </p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}

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
                            className="h-12 text-base"
                            {...field}
                            data-testid="input-material-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                            className="resize-none h-40 text-base"
                            {...field}
                            data-testid="input-material-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}


          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSuccess}
              data-testid="button-cancel-material"
              className="h-12 px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={uploadMutation.isPending || !selectedSubjectId}
              data-testid="button-save-material"
              className="h-12 px-8 bg-primary hover:bg-primary/90"
            >
              {uploadMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Adicionar Material
                </div>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
