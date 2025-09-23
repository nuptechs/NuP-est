import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Target, Clock, Brain, Heart, LayoutDashboard, User as UserIcon, Puzzle, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProfessionalShell from "@/components/ui/professional-shell";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";

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
  { id: 1, title: "Perfil Básico", icon: UserIcon, color: "blue" },
  { id: 2, title: "Dificuldades", icon: Brain, color: "purple" },
  { id: 3, title: "Objetivos", icon: Target, color: "green" },
  { id: 4, title: "Preferências", icon: Heart, color: "pink" },
  { id: 5, title: "Finalizar", icon: Sparkles, color: "yellow" },
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Detectar se está em modo de edição
  const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
  
  // Carregar dados atuais do usuário se estiver em modo de edição
  const { data: currentUserData } = useQuery<User>({
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
        customDifficulties: currentUserData.customDifficulties || undefined,
        studyObjective: currentUserData.studyObjective || undefined,
        studyDeadline: currentUserData.studyDeadline ? new Date(currentUserData.studyDeadline) : undefined,
        dailyStudyHours: currentUserData.dailyStudyHours ? Number(currentUserData.dailyStudyHours) : undefined,
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
      }, 1000);
    },
    onError: () => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: "Tente novamente em alguns instantes.",
      });
    },
    onSettled: () => {
      setIsLoading(false);
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

  const progress = (currentStep / STEPS.length) * 100;

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
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 text-primary mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditMode ? "Atualize seu perfil" : "Vamos conhecer você!"}
                </h2>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? "Revise e atualize suas informações de estudante"
                    : "Conte-nos um pouco sobre seu perfil de estudante"
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-foreground">Idade (opcional)</Label>
                <Input
                  id="age"
                  type="number"
                  value={data.age || ""}
                  onChange={(e) => updateData("age", parseInt(e.target.value) || undefined)}
                  placeholder="Ex: 18"
                  data-testid="input-age"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Como você se considera como estudante?</Label>
                <Select
                  value={data.studyProfile}
                  onValueChange={(value) => updateData("studyProfile", value)}
                  data-testid="select-study-profile"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione seu perfil" />
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
            <div className="text-center space-y-4">
              <Brain className="w-12 h-12 text-purple-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditMode ? "Atualize suas dificuldades" : "Desafios de Aprendizado"}
                </h2>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? "Revise suas dificuldades de aprendizado atuais"
                    : "Conhecer suas dificuldades nos ajuda a personalizar sua experiência"
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Marque todas as dificuldades que se aplicam a você:</Label>
              <div className="max-h-80 overflow-y-auto space-y-3 p-2 border rounded-lg">
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
                      data-testid={`checkbox-difficulty-${difficulty.value}`}
                    />
                    <Label
                      htmlFor={difficulty.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {difficulty.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {data.learningDifficulties.includes("other") && (
              <div className="space-y-2">
                <Label htmlFor="customDifficulties">Especifique outras dificuldades:</Label>
                <Input
                  id="customDifficulties"
                  value={data.customDifficulties || ""}
                  onChange={(e) => updateData("customDifficulties", e.target.value)}
                  placeholder="Descreva suas outras dificuldades..."
                  data-testid="input-custom-difficulties"
                />
              </div>
            )}
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
            <div className="text-center space-y-4">
              <Target className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditMode ? "Atualize seus objetivos" : "Seus Objetivos"}
                </h2>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? "Revise seus objetivos de estudo atuais"
                    : "Conte-nos sobre seus objetivos para personalizarmos melhor sua experiência"
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Qual é seu principal objetivo de estudos?</Label>
                <Select
                  value={data.studyObjective || ""}
                  onValueChange={(value) => updateData("studyObjective", value)}
                  data-testid="select-study-objective"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDY_OBJECTIVES.map(objective => (
                      <SelectItem key={objective} value={objective}>
                        {objective}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyStudyHours" className="text-foreground">
                  Quantas horas por dia você pretende estudar?
                </Label>
                <Select
                  value={data.dailyStudyHours?.toString() || "2"}
                  onValueChange={(value) => updateData("dailyStudyHours", parseInt(value))}
                  data-testid="select-daily-study-hours"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="2">2 horas</SelectItem>
                    <SelectItem value="3">3 horas</SelectItem>
                    <SelectItem value="4">4 horas</SelectItem>
                    <SelectItem value="5">5 horas</SelectItem>
                    <SelectItem value="6">6+ horas</SelectItem>
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
            <div className="text-center space-y-4">
              <Heart className="w-12 h-12 text-pink-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditMode ? "Atualize suas preferências" : "Preferências de Aprendizado"}
                </h2>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? "Ajuste suas preferências de aprendizado"
                    : "Como você gosta de aprender? Isso nos ajuda a criar conteúdo personalizado"
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Qual seu estilo de aprendizado?</Label>
                <Select
                  value={data.learningStyle}
                  onValueChange={(value) => updateData("learningStyle", value)}
                  data-testid="select-learning-style"
                >
                  <SelectTrigger className="w-full">
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

              <div className="space-y-2">
                <Label className="text-foreground">Como prefere receber explicações?</Label>
                <Select
                  value={data.preferredExplanationStyle}
                  onValueChange={(value) => updateData("preferredExplanationStyle", value)}
                  data-testid="select-explanation-style"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples - Explicações diretas e objetivas</SelectItem>
                    <SelectItem value="detailed">Detalhada - Explicações completas e aprofundadas</SelectItem>
                    <SelectItem value="balanced">Equilibrada - Misto entre simples e detalhada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsMotivation"
                    checked={data.needsMotivation}
                    onCheckedChange={(checked) => updateData("needsMotivation", !!checked)}
                    data-testid="checkbox-needs-motivation"
                  />
                  <Label htmlFor="needsMotivation" className="text-sm cursor-pointer">
                    Preciso de mensagens motivacionais durante os estudos
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prefersExamples"
                    checked={data.prefersExamples}
                    onCheckedChange={(checked) => updateData("prefersExamples", !!checked)}
                    data-testid="checkbox-prefers-examples"
                  />
                  <Label htmlFor="prefersExamples" className="text-sm cursor-pointer">
                    Prefiro aprender com muitos exemplos práticos
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
            <div className="text-center space-y-4">
              <Sparkles className="w-12 h-12 text-yellow-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditMode ? "Perfil Atualizado!" : "Tudo Pronto!"}
                </h2>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? "Revise suas informações antes de finalizar"
                    : "Seu perfil personalizado está quase pronto. Revise as informações abaixo:"
                  }
                </p>
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Resumo do seu perfil:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">Idade:</span>
                  <span className="ml-2 text-muted-foreground">{data.age || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Perfil:</span>
                  <span className="ml-2 text-muted-foreground">
                    {data.studyProfile === "disciplined" ? "Disciplinado" :
                     data.studyProfile === "average" ? "Moderado" : "Flexível"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Objetivo:</span>
                  <span className="ml-2 text-muted-foreground">{data.studyObjective || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Horas diárias:</span>
                  <span className="ml-2 text-muted-foreground">{data.dailyStudyHours || 2}h</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Estilo:</span>
                  <span className="ml-2 text-muted-foreground">
                    {data.learningStyle === "visual" ? "Visual" :
                     data.learningStyle === "auditory" ? "Auditivo" :
                     data.learningStyle === "kinesthetic" ? "Cinestésico" :
                     data.learningStyle === "reading_writing" ? "Leitura/Escrita" : "Misto"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Explicações:</span>
                  <span className="ml-2 text-muted-foreground">
                    {data.preferredExplanationStyle === "simple" ? "Simples" :
                     data.preferredExplanationStyle === "detailed" ? "Detalhada" : "Equilibrada"}
                  </span>
                </div>
              </div>

              {data.learningDifficulties.length > 0 && (
                <div>
                  <span className="font-medium text-foreground">Dificuldades:</span>
                  <div className="ml-2 text-muted-foreground text-xs flex flex-wrap gap-1">
                    {data.learningDifficulties.map(diff => (
                      <span key={diff} className="bg-muted px-2 py-1 rounded">
                        {LEARNING_DIFFICULTIES.find(d => d.value === diff)?.label || diff}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              Você pode alterar essas configurações a qualquer momento em seu perfil.
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <ProfessionalShell>
      {/* Dashboard Icon - Bottom Left */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        onClick={() => window.location.href = '/dashboard'}
        data-testid="button-dashboard"
      >
        <LayoutDashboard className="h-4 w-4" />
      </Button>
      
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Progress Header */}
        <div className="space-y-6">
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex justify-between">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center space-y-2 ${
                      isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`p-2 rounded-full border-2 ${
                      isActive 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : isCompleted 
                          ? 'border-green-500 bg-green-500 text-white' 
                          : 'border-muted-foreground'
                    }`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Etapa {currentStep} de {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Bem-vindo ao NuP-Study!"
                : "Vamos personalizar sua experiência de estudos"
              }
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="min-h-[500px]">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep === STEPS.length ? (
            <Button
              onClick={handleFinish}
              disabled={isLoading}
              data-testid="button-finish"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Finalizar
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              data-testid="button-next"
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </ProfessionalShell>
  );
}