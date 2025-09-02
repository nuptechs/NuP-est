import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, ArrowRight, Sparkles, BookOpen, Target, Clock, Brain, Heart, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingData {
  age?: number;
  studyProfile: string;
  learningDifficulties: string[];
  customDifficulties?: string;
  studyObjective?: string;
  studyDeadline?: Date;
  dailyStudyHours?: number;
  preferredStudyTime?: string;
  learningStyle: string;
  preferredExplanationStyle: string;
  needsMotivation: boolean;
  prefersExamples: boolean;
}

const STEPS = [
  { id: 1, title: "Perfil Básico", icon: BookOpen, color: "bg-blue-500" },
  { id: 2, title: "Dificuldades", icon: Brain, color: "bg-purple-500" },
  { id: 3, title: "Objetivos", icon: Target, color: "bg-green-500" },
  { id: 4, title: "Preferências", icon: Heart, color: "bg-pink-500" },
  { id: 5, title: "Finalizar", icon: Sparkles, color: "bg-yellow-500" },
];

const LEARNING_DIFFICULTIES = [
  { value: "none", label: "Nenhuma dificuldade específica" },
  { value: "adhd", label: "TDAH - Transtorno do Déficit de Atenção" },
  { value: "dyslexia", label: "Dislexia - Dificuldade na leitura" },
  { value: "autism", label: "Autismo - TEA" },
  { value: "dyscalculia", label: "Discalculia - Dificuldade com matemática" },
  { value: "attention_deficit", label: "Déficit de atenção" },
  { value: "reading_comprehension", label: "Dificuldade de compreensão textual" },
  { value: "math_difficulty", label: "Dificuldade com cálculos" },
  { value: "memory_issues", label: "Problemas de memória" },
  { value: "processing_speed", label: "Velocidade de processamento baixa" },
  { value: "other", label: "Outras (especificar)" },
];

const STUDY_OBJECTIVES = [
  "ENEM", "Vestibular", "Concurso Público", "Pós-graduação", "Certificação Profissional",
  "Aprendizado Pessoal", "Reforço Escolar", "Preparação para Prova", "Outro"
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    studyProfile: "average",
    learningDifficulties: [],
    learningStyle: "mixed",
    preferredExplanationStyle: "balanced",
    needsMotivation: false,
    prefersExamples: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Detectar se está em modo de edição
  const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
  
  // Carregar dados atuais do usuário se estiver em modo de edição
  const { data: currentUserData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isEditMode && isAuthenticated,
  });

  // Pré-preencher dados quando carregar em modo de edição
  useEffect(() => {
    if (isEditMode && currentUserData) {
      setData({
        age: currentUserData.age || undefined,
        studyProfile: currentUserData.studyProfile || "average",
        learningDifficulties: currentUserData.learningDifficulties || [],
        customDifficulties: currentUserData.customDifficulties,
        studyObjective: currentUserData.studyObjective,
        studyDeadline: currentUserData.studyDeadline ? new Date(currentUserData.studyDeadline) : undefined,
        dailyStudyHours: currentUserData.dailyStudyHours,
        preferredStudyTime: currentUserData.preferredStudyTime || "flexible",
        learningStyle: currentUserData.learningStyle || "mixed",
        preferredExplanationStyle: currentUserData.preferredExplanationStyle || "balanced",
        needsMotivation: currentUserData.needsMotivation || false,
        prefersExamples: currentUserData.prefersExamples !== false, // default true
      });
    }
  }, [isEditMode, currentUserData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: OnboardingData) => {
      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profileData,
          onboardingCompleted: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Força atualização do cache do usuário
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Perfil configurado com sucesso!",
        description: "Agora você terá uma experiência de estudo personalizada.",
      });
      
      // Aguarda um momento para garantir que o estado seja atualizado
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    },
    onError: () => {
      toast({
        title: "Erro ao salvar perfil",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setIsLoading(true);
    updateProfileMutation.mutate(data);
  };

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <BookOpen className="h-12 w-12 text-blue-500 mx-auto" />
              <h2 className="text-2xl font-bold">
                {isEditMode ? "Atualize seu perfil" : "Vamos conhecer você!"}
              </h2>
              <p className="text-muted-foreground">
                {isEditMode 
                  ? "Revise e atualize suas informações de estudante"
                  : "Conte-nos um pouco sobre seu perfil de estudante"
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="age">Idade (opcional)</Label>
                <Input
                  id="age"
                  type="number"
                  value={data.age || ""}
                  onChange={(e) => updateData("age", parseInt(e.target.value) || undefined)}
                  placeholder="Ex: 18"
                />
              </div>

              <div>
                <Label>Como você se considera como estudante?</Label>
                <Select value={data.studyProfile} onValueChange={(value) => updateData("studyProfile", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disciplined">Disciplinado - Tenho rotina fixa e sigo cronogramas</SelectItem>
                    <SelectItem value="average">Moderado - Estudo quando possível</SelectItem>
                    <SelectItem value="undisciplined">Flexível - Prefiro estudar quando sinto vontade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Brain className="h-12 w-12 text-purple-500 mx-auto" />
              <h2 className="text-2xl font-bold">
                {isEditMode ? "Atualize suas dificuldades" : "Desafios de Aprendizado"}
              </h2>
              <p className="text-muted-foreground">
                {isEditMode 
                  ? "Revise suas dificuldades de aprendizado atuais"
                  : "Conhecer suas dificuldades nos ajuda a personalizar sua experiência"
                }
              </p>
            </div>

            <div className="space-y-4">
              <Label>Marque todas as dificuldades que se aplicam a você:</Label>
              <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                {LEARNING_DIFFICULTIES.map((difficulty) => (
                  <div key={difficulty.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={difficulty.value}
                      checked={data.learningDifficulties.includes(difficulty.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateData("learningDifficulties", [...data.learningDifficulties, difficulty.value]);
                        } else {
                          updateData("learningDifficulties", data.learningDifficulties.filter(d => d !== difficulty.value));
                        }
                      }}
                    />
                    <Label htmlFor={difficulty.value} className="text-sm leading-5">
                      {difficulty.label}
                    </Label>
                  </div>
                ))}
              </div>

              {data.learningDifficulties.includes("other") && (
                <div>
                  <Label htmlFor="customDifficulties">Descreva suas dificuldades específicas:</Label>
                  <Textarea
                    id="customDifficulties"
                    value={data.customDifficulties || ""}
                    onChange={(e) => updateData("customDifficulties", e.target.value)}
                    placeholder="Descreva suas dificuldades específicas..."
                  />
                </div>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Target className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">
                {isEditMode ? "Atualize seus objetivos" : "Seus Objetivos"}
              </h2>
              <p className="text-muted-foreground">
                {isEditMode 
                  ? "Revise seus objetivos e metas de estudo"
                  : "Vamos alinhar seus estudos com seus objetivos"
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Qual é seu principal objetivo de estudos?</Label>
                <Select value={data.studyObjective || ""} onValueChange={(value) => updateData("studyObjective", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDY_OBJECTIVES.map((objective) => (
                      <SelectItem key={objective} value={objective}>
                        {objective}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Você tem uma data limite? (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !data.studyDeadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {data.studyDeadline ? format(data.studyDeadline, "dd/MM/yyyy") : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={data.studyDeadline}
                      onSelect={(date) => updateData("studyDeadline", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Quantas horas por dia você pode estudar?</Label>
                <div className="px-3 py-2">
                  <Slider
                    value={[data.dailyStudyHours || 2]}
                    onValueChange={([value]) => updateData("dailyStudyHours", value)}
                    max={12}
                    min={0.5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>30min</span>
                    <span className="font-medium text-foreground">
                      {data.dailyStudyHours || 2}h
                    </span>
                    <span>12h</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Qual seu horário preferido para estudar?</Label>
                <Select value={data.preferredStudyTime || ""} onValueChange={(value) => updateData("preferredStudyTime", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Manhã (6h - 12h)</SelectItem>
                    <SelectItem value="afternoon">Tarde (12h - 18h)</SelectItem>
                    <SelectItem value="evening">Noite (18h - 22h)</SelectItem>
                    <SelectItem value="late_night">Madrugada (22h - 6h)</SelectItem>
                    <SelectItem value="flexible">Flexível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Heart className="h-12 w-12 text-pink-500 mx-auto" />
              <h2 className="text-2xl font-bold">
                {isEditMode ? "Atualize suas preferências" : "Suas Preferências"}
              </h2>
              <p className="text-muted-foreground">
                {isEditMode 
                  ? "Revise como você prefere aprender e estudar"
                  : "Como você prefere aprender?"
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Qual seu estilo de aprendizado?</Label>
                <Select value={data.learningStyle} onValueChange={(value) => updateData("learningStyle", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual - Prefiro gráficos, diagramas e imagens</SelectItem>
                    <SelectItem value="auditory">Auditivo - Prefiro ouvir explicações e discussões</SelectItem>
                    <SelectItem value="kinesthetic">Cinestésico - Aprendo fazendo e praticando</SelectItem>
                    <SelectItem value="reading_writing">Leitura/Escrita - Prefiro textos e anotações</SelectItem>
                    <SelectItem value="mixed">Misto - Combino diferentes estilos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Como prefere as explicações?</Label>
                <Select value={data.preferredExplanationStyle} onValueChange={(value) => updateData("preferredExplanationStyle", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples - Linguagem clara e direta</SelectItem>
                    <SelectItem value="detailed">Detalhada - Explicações completas e minuciosas</SelectItem>
                    <SelectItem value="practical">Prática - Focada em aplicações reais</SelectItem>
                    <SelectItem value="theoretical">Teórica - Com fundamentos e conceitos</SelectItem>
                    <SelectItem value="balanced">Equilibrada - Mix de teoria e prática</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsMotivation"
                    checked={data.needsMotivation}
                    onCheckedChange={(checked) => updateData("needsMotivation", checked)}
                  />
                  <Label htmlFor="needsMotivation">
                    Preciso de motivação e encorajamento constante
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prefersExamples"
                    checked={data.prefersExamples}
                    onCheckedChange={(checked) => updateData("prefersExamples", checked)}
                  />
                  <Label htmlFor="prefersExamples">
                    Prefiro aprender com exemplos práticos
                  </Label>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 text-yellow-500 mx-auto" />
              <h2 className="text-2xl font-bold">Tudo Pronto!</h2>
              <p className="text-muted-foreground">
                Seu perfil personalizado está configurado
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Resumo do seu perfil:</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Idade:</span>
                  <span className="ml-2">{data.age || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-medium">Perfil:</span>
                  <span className="ml-2">
                    {data.studyProfile === "disciplined" ? "Disciplinado" :
                     data.studyProfile === "average" ? "Moderado" : "Flexível"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Objetivo:</span>
                  <span className="ml-2">{data.studyObjective || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-medium">Horas diárias:</span>
                  <span className="ml-2">{data.dailyStudyHours || 2}h</span>
                </div>
                <div>
                  <span className="font-medium">Estilo:</span>
                  <span className="ml-2">
                    {data.learningStyle === "visual" ? "Visual" :
                     data.learningStyle === "auditory" ? "Auditivo" :
                     data.learningStyle === "kinesthetic" ? "Cinestésico" :
                     data.learningStyle === "reading_writing" ? "Leitura/Escrita" : "Misto"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Dificuldades:</span>
                  <span className="ml-2">
                    {data.learningDifficulties.length > 0 ? 
                      data.learningDifficulties.length === 1 && data.learningDifficulties[0] === "none" ? 
                        "Nenhuma" : `${data.learningDifficulties.length} selecionadas`
                      : "Nenhuma"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Você pode alterar essas configurações a qualquer momento em seu perfil.
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Home Icon - Top Left */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation('/')}
        className="fixed top-4 left-4 z-50 p-2 h-8 w-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 shadow-md"
        data-testid="button-home"
      >
        <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </Button>
      
      <div className="container mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                    currentStep >= step.id ? step.color : "bg-gray-300",
                    currentStep === step.id && "ring-4 ring-white shadow-lg scale-110"
                  )}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-1 w-16 mx-2",
                      currentStep > step.id ? "bg-green-400" : "bg-gray-300"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Etapa {currentStep} de {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Bem-vindo ao NuP-Study!
              </CardTitle>
              <CardDescription className="text-lg">
                Vamos personalizar sua experiência de estudos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between pt-6 mt-6 border-t">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>

                {currentStep < STEPS.length ? (
                  <Button onClick={nextStep} className="flex items-center gap-2">
                    Próximo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleFinish}
                    disabled={isLoading || updateProfileMutation.isPending}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isLoading || updateProfileMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Finalizar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}