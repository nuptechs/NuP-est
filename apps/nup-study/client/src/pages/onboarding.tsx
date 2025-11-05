/**
 * Onboarding - Modern 5-Step Wizard
 * Simplified from 669 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Target,
  Brain,
  Heart,
  UserIcon,
  CheckCircle
} from "lucide-react";
import type { User } from "@shared/schema";

interface OnboardingData {
  age?: number;
  studyProfile: string;
  learningDifficulties: string[];
  customDifficulties?: string;
  studyObjective?: string;
  dailyStudyHours?: number;
  preferredStudyTime?: string;
  learningStyle: string;
  preferredExplanationStyle: string;
  needsMotivation: boolean;
  prefersExamples: boolean;
}

const LEARNING_DIFFICULTIES = [
  { value: "none", label: "Nenhuma dificuldade específica" },
  { value: "adhd", label: "TDAH - Transtorno do Déficit de Atenção" },
  { value: "dyslexia", label: "Dislexia" },
  { value: "autism", label: "Autismo - TEA" },
  { value: "dyscalculia", label: "Discalculia" },
  { value: "memory_issues", label: "Problemas de memória" },
  { value: "other", label: "Outras (especificar)" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    studyProfile: "average",
    learningDifficulties: [],
    learningStyle: "mixed",
    preferredExplanationStyle: "balanced",
    needsMotivation: false,
    prefersExamples: true,
  });

  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
  
  const { data: currentUserData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isEditMode && isAuthenticated,
  });

  useEffect(() => {
    if (isEditMode && currentUserData) {
      const userData = currentUserData as any;
      setData({
        age: userData.age || undefined,
        studyProfile: userData.studyProfile || "average",
        learningDifficulties: userData.learningDifficulties || [],
        customDifficulties: userData.customDifficulties || undefined,
        studyObjective: userData.studyObjective || undefined,
        dailyStudyHours: userData.dailyStudyHours ? Number(userData.dailyStudyHours) : undefined,
        preferredStudyTime: userData.preferredStudyTime || "flexible",
        learningStyle: userData.learningStyle || "mixed",
        preferredExplanationStyle: userData.preferredExplanationStyle || "balanced",
        needsMotivation: userData.needsMotivation || false,
        prefersExamples: userData.prefersExamples !== false,
      });
    }
  }, [isEditMode, currentUserData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: OnboardingData) => {
      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileData, onboardingCompleted: true }),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Perfil configurado com sucesso!" });
      setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
    },
    onError: () => {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    },
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDifficulty = (value: string) => {
    setData(prev => ({
      ...prev,
      learningDifficulties: prev.learningDifficulties.includes(value)
        ? prev.learningDifficulties.filter(d => d !== value)
        : [...prev.learningDifficulties, value]
    }));
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-purple/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isEditMode ? "Atualizar Perfil" : "Configure seu Perfil"}
            </CardTitle>
            <span className="text-sm text-muted-foreground">Passo {step}/5</span>
          </div>
          <Progress value={progress} />
        </CardHeader>

        <CardContent className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Perfil Básico */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <UserIcon className="w-10 h-10 text-primary mx-auto" />
                  <h2 className="text-xl font-semibold">Perfil Básico</h2>
                  <p className="text-sm text-muted-foreground">Conte-nos sobre você</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Idade (opcional)</Label>
                    <Input
                      id="age"
                      type="number"
                      value={data.age || ""}
                      onChange={(e) => updateData("age", parseInt(e.target.value) || undefined)}
                      placeholder="Ex: 18"
                      data-testid="input-age"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Como você se considera como estudante?</Label>
                    <Select value={data.studyProfile} onValueChange={(v) => updateData("studyProfile", v)}>
                      <SelectTrigger data-testid="select-study-profile">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="average">Médio</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Dificuldades */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Brain className="w-10 h-10 text-purple-600 mx-auto" />
                  <h2 className="text-xl font-semibold">Dificuldades de Aprendizado</h2>
                  <p className="text-sm text-muted-foreground">Ajude-nos a personalizar sua experiência</p>
                </div>

                <div className="space-y-3">
                  {LEARNING_DIFFICULTIES.map((difficulty) => (
                    <div key={difficulty.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/20">
                      <Checkbox
                        id={difficulty.value}
                        checked={data.learningDifficulties.includes(difficulty.value)}
                        onCheckedChange={() => toggleDifficulty(difficulty.value)}
                        data-testid={`checkbox-difficulty-${difficulty.value}`}
                      />
                      <Label htmlFor={difficulty.value} className="flex-1 cursor-pointer">{difficulty.label}</Label>
                    </div>
                  ))}

                  {data.learningDifficulties.includes("other") && (
                    <Input
                      placeholder="Descreva suas dificuldades..."
                      value={data.customDifficulties || ""}
                      onChange={(e) => updateData("customDifficulties", e.target.value)}
                      data-testid="input-custom-difficulties"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Objetivos */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Target className="w-10 h-10 text-green-600 mx-auto" />
                  <h2 className="text-xl font-semibold">Objetivos de Estudo</h2>
                  <p className="text-sm text-muted-foreground">Qual é sua meta principal?</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Objetivo Principal</Label>
                    <Select value={data.studyObjective} onValueChange={(v) => updateData("studyObjective", v)}>
                      <SelectTrigger data-testid="select-objective">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENEM">ENEM</SelectItem>
                        <SelectItem value="Vestibular">Vestibular</SelectItem>
                        <SelectItem value="Concurso Público">Concurso Público</SelectItem>
                        <SelectItem value="Certificação">Certificação</SelectItem>
                        <SelectItem value="Reforço">Reforço Escolar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Horas de Estudo Diárias</Label>
                    <Select value={data.dailyStudyHours?.toString()} onValueChange={(v) => updateData("dailyStudyHours", parseInt(v))}>
                      <SelectTrigger data-testid="select-daily-hours">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hora</SelectItem>
                        <SelectItem value="2">2 horas</SelectItem>
                        <SelectItem value="3">3 horas</SelectItem>
                        <SelectItem value="4">4 horas</SelectItem>
                        <SelectItem value="6">6 horas</SelectItem>
                        <SelectItem value="8">8 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Preferências */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Heart className="w-10 h-10 text-pink-600 mx-auto" />
                  <h2 className="text-xl font-semibold">Preferências de Aprendizado</h2>
                  <p className="text-sm text-muted-foreground">Como você aprende melhor?</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Estilo de Aprendizado</Label>
                    <Select value={data.learningStyle} onValueChange={(v) => updateData("learningStyle", v)}>
                      <SelectTrigger data-testid="select-learning-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual">Visual</SelectItem>
                        <SelectItem value="auditory">Auditivo</SelectItem>
                        <SelectItem value="kinesthetic">Cinestésico</SelectItem>
                        <SelectItem value="mixed">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Explicação Preferido</Label>
                    <Select value={data.preferredExplanationStyle} onValueChange={(v) => updateData("preferredExplanationStyle", v)}>
                      <SelectTrigger data-testid="select-explanation-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simples e Direto</SelectItem>
                        <SelectItem value="detailed">Detalhado</SelectItem>
                        <SelectItem value="balanced">Equilibrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="motivation"
                        checked={data.needsMotivation}
                        onCheckedChange={(v) => updateData("needsMotivation", v)}
                        data-testid="checkbox-motivation"
                      />
                      <Label htmlFor="motivation">Preciso de mensagens motivacionais</Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="examples"
                        checked={data.prefersExamples}
                        onCheckedChange={(v) => updateData("prefersExamples", v)}
                        data-testid="checkbox-examples"
                      />
                      <Label htmlFor="examples">Prefiro aprender com exemplos práticos</Label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Finalizar */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-4">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                  <div>
                    <h2 className="text-2xl font-semibold">Tudo Pronto!</h2>
                    <p className="text-muted-foreground mt-2">
                      Seu perfil está configurado para uma experiência personalizada
                    </p>
                  </div>
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6 space-y-2 text-sm">
                    <p><strong>Perfil:</strong> {data.studyProfile}</p>
                    <p><strong>Objetivo:</strong> {data.studyObjective || "Não definido"}</p>
                    <p><strong>Horas Diárias:</strong> {data.dailyStudyHours || "Não definido"}h</p>
                    <p><strong>Estilo:</strong> {data.learningStyle}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} data-testid="button-next">
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => updateProfileMutation.mutate(data)}
                disabled={updateProfileMutation.isPending}
                data-testid="button-finish"
              >
                {updateProfileMutation.isPending ? 'Salvando...' : 'Finalizar'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
