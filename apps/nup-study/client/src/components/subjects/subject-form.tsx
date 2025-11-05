import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { Subject, KnowledgeArea } from "@shared/schema";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SubjectFormProps {
  subject?: Subject | null;
  areaId?: string;
  onSuccess: () => void;
}

const formSchema = insertSubjectSchema.omit({ userId: true }).extend({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  areaId: z.string().min(1, "Área é obrigatória"),
});

export default function SubjectForm({ subject, areaId, onSuccess }: SubjectFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para sugestão de categoria
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar áreas disponíveis
  const { data: areas = [] } = useQuery<KnowledgeArea[]>({
    queryKey: ["/api/areas"],
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: subject?.name || "",
      description: subject?.description || "",
      category: subject?.category || "",
      priority: subject?.priority || "medium",
      color: subject?.color || "#3b82f6",
      areaId: subject?.areaId || areaId || "",
    },
  });
  
  // Auto-sugestão de categoria baseada no nome da matéria
  useEffect(() => {
    const subjectName = form.watch("name");
    const currentCategory = form.watch("category");
    
    // Só sugerir se:
    // 1. Nome tem pelo menos 3 caracteres
    // 2. Categoria ainda não foi preenchida (é nova matéria)
    // 3. Não está editando uma matéria existente
    if (subjectName && subjectName.length >= 3 && !currentCategory && !subject) {
      // Debounce para evitar chamadas excessivas
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(async () => {
        setIsSuggesting(true);
        try {
          const response = await fetch('/api/subjects/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subjectName }),
          });
          
          if (response.ok) {
            const suggestion = await response.json();
            
            // Só auto-preencher se confiança for alta (> 70%)
            if (suggestion.confidence > 0.7) {
              setSuggestedCategory(suggestion.category);
              form.setValue("category", suggestion.category);
              setIsAutoFilled(true);
            }
          }
        } catch (error) {
          console.error("Erro ao sugerir categoria:", error);
        } finally {
          setIsSuggesting(false);
        }
      }, 800); // Aguardar 800ms após parar de digitar
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form.watch("name"), form.watch("category"), subject]);

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
        description: subject ? "Disciplina atualizada com sucesso!" : "Disciplina criada com sucesso!",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar disciplina",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!user) return;
    createMutation.mutate(data);
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
        <Label className="text-foreground font-medium">
          Área de Conhecimento *
        </Label>
        <Select
          value={form.watch("areaId")}
          onValueChange={(value) => form.setValue("areaId", value)}
          data-testid="select-subject-area"
        >
          <SelectTrigger className={errors.areaId ? "border-red-500" : ""}>
            <SelectValue placeholder="Selecione uma área" />
          </SelectTrigger>
          <SelectContent>
            {areas.length === 0 ? (
              <SelectItem value="__none__" disabled>
                Nenhuma área cadastrada
              </SelectItem>
            ) : (
              areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.areaId && (
          <p className="text-red-500 text-sm mt-1">
            {errors.areaId.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground font-medium">
          Nome da Disciplina *
        </Label>
        <Input
          id="name"
          placeholder="Ex: Matemática, Física, História..." 
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
          placeholder="Breve descrição da disciplina..." 
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
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-medium">
              Categoria *
            </Label>
            {isSuggesting && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Sugerindo...
              </div>
            )}
            {isAutoFilled && !isSuggesting && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Sugerido pela IA
              </div>
            )}
          </div>
          <Select
            value={form.watch("category")}
            onValueChange={(value) => {
              form.setValue("category", value);
              setIsAutoFilled(false); // Usuário mudou manualmente
            }}
            data-testid="select-subject-category"
          >
            <SelectTrigger className={errors.category ? "border-red-500" : ""}>
              <SelectValue placeholder="Digite o nome primeiro" />
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
          <p className="text-xs text-muted-foreground">
            {!subject && "Digite o nome da matéria para sugestão automática"}
          </p>
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
            subject ? "Atualizar" : "Criar Disciplina"
          )}
        </Button>
      </div>
    </form>
  );
}