import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  LogOut,
  GraduationCap,
  Briefcase,
  School,
  Trophy,
  BookOpen,
  ChevronRight,
  Sparkles,
  Settings
} from "lucide-react";

// Tipos de meta disponíveis
const GOAL_TYPES = [
  {
    id: 'concurso',
    title: 'Concurso Público',
    description: 'Preparação estratégica para concursos federais, estaduais e municipais',
    icon: Trophy,
    gradient: 'from-yellow-500 to-orange-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 'vestibular',
    title: 'Vestibular',
    description: 'Preparação completa para vestibulares e ENEM',
    icon: GraduationCap,
    gradient: 'from-purple-500 to-indigo-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'escola',
    title: 'Escola',
    description: 'Metas acadêmicas do ensino fundamental ao médio',
    icon: School,
    gradient: 'from-green-500 to-teal-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'faculdade',
    title: 'Faculdade',
    description: 'Objetivos universitários, TCC e disciplinas específicas',
    icon: BookOpen,
    gradient: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'profissional',
    title: 'Desenvolvimento Profissional',
    description: 'Certificações, cursos técnicos e capacitações profissionais',
    icon: Briefcase,
    gradient: 'from-red-500 to-pink-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  {
    id: 'outras',
    title: 'Outras',
    description: 'Metas personalizadas específicas para seus objetivos únicos',
    icon: Settings,
    gradient: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
    iconColor: 'text-slate-600 dark:text-slate-400'
  }
];

export default function GoalBuilder() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'select-type' | 'build-goal'>('select-type');

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
    setCurrentStep('build-goal');
    // TODO: Implementar próximos passos específicos para cada tipo
  };

  const selectedGoalType = GOAL_TYPES.find(type => type.id === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-border/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DashboardIcon />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/goals'}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                data-testid="button-back-goals"
              >
                <ArrowLeft className="h-4 w-4" />
                Metas
              </Button>
              <div className="border-l h-6"></div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  Construir Meta
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStep === 'select-type' 
                    ? 'Escolha o tipo de meta que você quer criar'
                    : `Configurando meta de ${selectedGoalType?.title}`
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {currentStep === 'select-type' ? (
          // Step 1: Seleção do Tipo de Meta
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Quer criar uma meta para:
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Nosso assistente de IA vai te guiar através de um processo personalizado para criar 
                a meta perfeita baseada no seu objetivo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GOAL_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.id}
                    className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                    onClick={() => handleTypeSelection(type.id)}
                    data-testid={`button-goal-type-${type.id}`}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className={`w-16 h-16 rounded-2xl ${type.bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className={`h-8 w-8 ${type.iconColor}`} />
                      </div>
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {type.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardDescription className="text-sm leading-relaxed mb-4">
                        {type.description}
                      </CardDescription>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 w-full"
                      >
                        Selecionar
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          // Step 2: Construção da Meta (TODO: Implementar fluxos específicos)
          <div className="space-y-8">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="text-center py-12">
                <div className={`w-16 h-16 rounded-2xl ${selectedGoalType?.bgColor} flex items-center justify-center mx-auto mb-4`}>
                  {selectedGoalType && <selectedGoalType.icon className={`h-8 w-8 ${selectedGoalType.iconColor}`} />}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Construindo meta de {selectedGoalType?.title}
                </h3>
                <p className="text-muted-foreground mb-6">
                  Esta funcionalidade está sendo desenvolvida. Em breve você poderá criar metas 
                  personalizadas com a ajuda da nossa IA especializada.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep('select-type')}
                    data-testid="button-back-type-selection"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/goals'}
                    data-testid="button-back-to-goals"
                  >
                    Ir para Metas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}