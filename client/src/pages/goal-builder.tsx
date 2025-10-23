/**
 * Goal Builder - Modern 3-Step Wizard
 * Simplified from 957 lines to clean, professional UX
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  GraduationCap,
  School,
  BookOpen,
  Briefcase,
  Settings,
  ArrowRight,
  ArrowLeft,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles
} from "lucide-react";

const GOAL_TYPES = [
  {
    id: 'concurso',
    title: 'Concurso Público',
    description: 'Preparação estratégica para concursos',
    icon: Trophy,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950 hover:bg-yellow-100 dark:hover:bg-yellow-900'
  },
  {
    id: 'vestibular',
    title: 'Vestibular',
    description: 'Preparação para ENEM e vestibulares',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900'
  },
  {
    id: 'escola',
    title: 'Escola',
    description: 'Metas do ensino fundamental ao médio',
    icon: School,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900'
  },
  {
    id: 'faculdade',
    title: 'Faculdade',
    description: 'Objetivos universitários e TCC',
    icon: BookOpen,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900'
  },
  {
    id: 'profissional',
    title: 'Desenvolvimento Profissional',
    description: 'Certificações e capacitações',
    icon: Briefcase,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900'
  },
  {
    id: 'outras',
    title: 'Outras',
    description: 'Metas personalizadas',
    icon: Settings,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900'
  }
];

export default function GoalBuilder() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    deadline: '',
    dailyHours: '2',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  if (!isLoading && !isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedType = GOAL_TYPES.find(t => t.id === formData.type);
  const progress = (step / 3) * 100;

  const handleCreateGoal = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/api/goals', {
        type: formData.type,
        name: formData.name,
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        dailyStudyHours: parseInt(formData.dailyHours),
        notes: formData.notes
      });

      if (response.ok) {
        toast({ title: "Meta criada com sucesso!" });
        window.location.href = '/goals';
      } else {
        toast({ title: "Erro ao criar meta", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <UnifiedShell title="Construir Meta">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header with Progress */}
        <div className="space-y-4">
          <ModernPageHeader
            title="Construir Nova Meta"
            description="Configure sua meta em 3 passos simples"
            icon={Target}
          />
          
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1" />
            <Badge variant="outline">Passo {step}/3</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            {/* Step 1: Tipo de Meta */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Escolha o tipo de meta</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecione o tipo que melhor descreve seu objetivo
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {GOAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.id;
                    
                    return (
                      <button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`
                          p-6 rounded-lg border-2 transition-all text-left
                          ${isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                          }
                          ${type.bg}
                        `}
                        data-testid={`goal-type-${type.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg bg-background ${type.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{type.title}</h3>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!formData.type}
                    data-testid="button-next-step1"
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Detalhes */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Detalhes da meta</h2>
                  <p className="text-sm text-muted-foreground">
                    Preencha as informações básicas sobre sua meta
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-name">Nome da Meta *</Label>
                    <Input
                      id="goal-name"
                      placeholder="Ex: Passar no concurso da Receita Federal"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-goal-name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Data Limite</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        data-testid="input-deadline"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="daily-hours">Horas Diárias de Estudo</Label>
                      <Input
                        id="daily-hours"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.dailyHours}
                        onChange={(e) => setFormData({ ...formData, dailyHours: e.target.value })}
                        data-testid="input-daily-hours"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Input
                      id="notes"
                      placeholder="Adicione notas ou detalhes importantes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      data-testid="input-notes"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    data-testid="button-back-step2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!formData.name}
                    data-testid="button-next-step2"
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Revisão e Criação */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Revisar e confirmar</h2>
                  <p className="text-sm text-muted-foreground">
                    Confira os detalhes da sua meta antes de criar
                  </p>
                </div>

                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      {selectedType && (
                        <>
                          <div className={`p-2 rounded-lg bg-background ${selectedType.color}`}>
                            <selectedType.icon className="h-5 w-5" />
                          </div>
                          <span>{selectedType.title}</span>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome da Meta</Label>
                      <p className="font-medium" data-testid="preview-goal-name">{formData.name}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Limite
                        </Label>
                        <p data-testid="preview-deadline">
                          {formData.deadline 
                            ? new Date(formData.deadline).toLocaleDateString('pt-BR')
                            : 'Não definida'
                          }
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Horas Diárias
                        </Label>
                        <p data-testid="preview-daily-hours">{formData.dailyHours}h por dia</p>
                      </div>
                    </div>

                    {formData.notes && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Observações</Label>
                          <p className="text-sm" data-testid="preview-notes">{formData.notes}</p>
                        </div>
                      </>
                    )}

                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-primary mb-1">Meta pronta para começar!</p>
                          <p className="text-muted-foreground">
                            Vamos criar um plano de estudos personalizado baseado nas suas informações.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isCreating}
                    data-testid="button-back-step3"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreateGoal}
                    disabled={isCreating}
                    data-testid="button-create-goal"
                  >
                    {isCreating ? 'Criando...' : 'Criar Meta'}
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedShell>
  );
}
