import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EditalUploader } from "@/components/EditalUploader";
import { apiRequest } from "@/lib/queryClient";
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
  Settings,
  Search,
  Target,
  ExternalLink,
  CheckCircle2,
  Loader2
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

interface ConcursoResult {
  name: string;
  url: string;
  vagas?: string;
  salario?: string;
}

export default function GoalBuilder() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'select-type' | 'concurso-approach' | 'concurso-specific' | 'concurso-area' | 'concurso-found' | 'build-goal'>('select-type');
  const [concursoName, setConcursoName] = useState<string>('');
  const [searchingConcurso, setSearchingConcurso] = useState<boolean>(false);
  const [foundConcurso, setFoundConcurso] = useState<ConcursoResult | null>(null);
  const [processandoEdital, setProcessandoEdital] = useState(false);
  const [editalProcessado, setEditalProcessado] = useState<{
    editalUrl: string | null;
    cargos: Array<{
      nome: string;
      conteudoProgramatico: Array<{
        disciplina: string;
        topicos: string[];
      }>;
    }>;
    requiresManualUpload?: boolean;
    downloadError?: string;
  } | null>(null);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
    
    if (typeId === 'concurso') {
      setCurrentStep('concurso-approach');
    } else {
      setCurrentStep('build-goal');
      // TODO: Implementar próximos passos específicos para outros tipos
    }
  };

  const handleConcursoApproachSelection = (approach: 'specific' | 'area') => {
    if (approach === 'specific') {
      setCurrentStep('concurso-specific');
    } else {
      setCurrentStep('concurso-area');
    }
  };

  const handleSearchConcurso = async () => {
    if (!concursoName.trim()) return;
    
    setSearchingConcurso(true);
    
    try {
      const result = await apiRequest('POST', '/api/cebraspe/search', { 
        query: concursoName.trim() 
      });
      
      const response = await result.json();

      if (response.success && response.concurso) {
        setFoundConcurso(response.concurso);
        setCurrentStep('concurso-found');
        toast({
          title: "Concurso encontrado!",
          description: `Encontramos: ${response.concurso.name}`
        });
      } else {
        toast({
          title: "Concurso não encontrado",
          description: response.message || "Não foi possível encontrar este concurso no Cebraspe. Tente com outro nome.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar concurso:', error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar o concurso. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSearchingConcurso(false);
    }
  };

  const handleProcessarEditalAutomatico = async () => {
    if (!foundConcurso?.name) return;
    
    setProcessandoEdital(true);
    
    try {
      console.log(`🤖 Iniciando processamento automático para: ${foundConcurso.name}`);
      
      const result = await apiRequest('POST', '/api/edital/processar-automatico', {
        concursoNome: foundConcurso.name
      });
      
      const response = await result.json();
      
      if (response.success) {
        setEditalProcessado({
          editalUrl: response.editalUrl,
          cargos: response.cargos || []
        });
        
        toast({
          title: "🎉 Edital processado automaticamente!",
          description: `Encontramos ${response.cargos?.length || 0} cargo(s) com conteúdo programático estruturado.`,
        });
      } else if (response.requiresManualUpload) {
        // Definir estado para mostrar upload manual
        setEditalProcessado({
          editalUrl: response.editalUrl || null,
          cargos: [],
          requiresManualUpload: true,
          downloadError: response.message
        });
        
        toast({
          title: "📄 Upload manual necessário",
          description: response.message || "Faça upload do edital manualmente para continuar.",
          variant: "default"
        });
      } else {
        toast({
          title: "Erro no processamento",
          description: response.error || "Não foi possível processar o edital automaticamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao processar edital:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar o edital automaticamente. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessandoEdital(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'concurso-approach') {
      setCurrentStep('select-type');
      setSelectedType(null);
    } else if (currentStep === 'concurso-specific' || currentStep === 'concurso-area') {
      setCurrentStep('concurso-approach');
    } else if (currentStep === 'concurso-found') {
      setCurrentStep('concurso-specific');
      setFoundConcurso(null);
      setEditalProcessado(null);
    } else if (currentStep === 'build-goal') {
      setCurrentStep('select-type');
      setSelectedType(null);
    } else {
      setCurrentStep('select-type');
      setSelectedType(null);
    }
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
                  {currentStep === 'select-type' && 'Escolha o tipo de meta que você quer criar'}
                  {currentStep === 'concurso-approach' && 'Como você quer organizar seus estudos?'}
                  {currentStep === 'concurso-specific' && 'Digite o nome do concurso específico'}
                  {currentStep === 'concurso-area' && 'Escolha a área de estudo'}
                  {currentStep === 'concurso-found' && 'Concurso encontrado! Acesse para mais detalhes'}
                  {currentStep === 'build-goal' && `Configurando meta de ${selectedGoalType?.title}`}
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
        ) : currentStep === 'concurso-approach' ? (
          // Step 2: Escolha da Abordagem para Concurso Público
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-2xl flex items-center justify-center mx-auto">
                <Trophy className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Concurso Público
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Como você quer organizar seus estudos para concurso público?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card 
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                onClick={() => handleConcursoApproachSelection('specific')}
                data-testid="button-concurso-specific"
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                    <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    Já sei qual concurso
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm leading-relaxed mb-4">
                    Tenho um concurso específico em mente e quero focar toda minha preparação nele
                  </CardDescription>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 w-full"
                  >
                    Escolher Concurso
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                onClick={() => handleConcursoApproachSelection('area')}
                data-testid="button-concurso-area"
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                    <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    Estudar por área
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm leading-relaxed mb-4">
                    Quero me preparar para uma área específica que abrange vários concursos similares
                  </CardDescription>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 w-full"
                  >
                    Escolher Área
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button 
                variant="outline"
                onClick={handleBackStep}
                data-testid="button-back-step"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        ) : currentStep === 'concurso-specific' ? (
          // Step 3: Digitar Concurso Específico
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Qual concurso você quer focar?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Digite o nome do concurso para criarmos um plano de estudos personalizado
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Informe o Concurso</CardTitle>
                <CardDescription>
                  Ex: INSS, Polícia Federal, TRT, Banco do Brasil, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="concurso-name" className="text-sm font-medium">
                    Nome do Concurso
                  </Label>
                  <Input
                    id="concurso-name"
                    type="text"
                    placeholder="Ex: Polícia Federal - Agente"
                    value={concursoName}
                    onChange={(e) => setConcursoName(e.target.value)}
                    className="text-base"
                    data-testid="input-concurso-name"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline"
                    onClick={handleBackStep}
                    className="flex-1"
                    data-testid="button-back-approach"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleSearchConcurso}
                    disabled={!concursoName.trim() || searchingConcurso}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-continue-concurso"
                  >
                    {searchingConcurso ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        Buscar Concurso
                        <Search className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : currentStep === 'concurso-found' ? (
          // Step 4: Concurso Encontrado
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Concurso Encontrado!
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Encontramos o concurso no site do Cebraspe. Clique no link para acessar todas as informações oficiais.
              </p>
            </div>

            {foundConcurso && (
              <Card className="max-w-2xl mx-auto border-green-200 dark:border-green-800">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl text-green-700 dark:text-green-300">
                    {foundConcurso.name}
                  </CardTitle>
                  {(foundConcurso.vagas || foundConcurso.salario) && (
                    <CardDescription className="flex gap-4 justify-center text-sm">
                      {foundConcurso.vagas && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {foundConcurso.vagas}
                        </span>
                      )}
                      {foundConcurso.salario && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                          {foundConcurso.salario}
                        </span>
                      )}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleBackStep}
                      className="flex-1"
                      data-testid="button-back-search"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Buscar Outro
                    </Button>
                    <Button 
                      asChild
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      data-testid="button-access-concurso"
                    >
                      <a 
                        href={foundConcurso.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        Acessar Concurso
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                  
                  <div className="text-center pt-4 border-t space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      Gostaria de criar uma meta de estudos baseada neste concurso?
                    </p>
                    <Button 
                      onClick={() => setCurrentStep('build-goal')}
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"
                      data-testid="button-create-goal-from-concurso"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Criar Meta de Estudos
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Ou processe automaticamente o edital oficial:
                      </p>
                      <Button 
                        onClick={handleProcessarEditalAutomatico}
                        disabled={processandoEdital}
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950"
                        data-testid="button-processar-edital-automatico"
                      >
                        {processandoEdital ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Processar Edital Automaticamente
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultado do Processamento Automático */}
            {editalProcessado && !editalProcessado.requiresManualUpload && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
                    ✅ Edital Processado Automaticamente!
                  </h3>
                  <p className="text-muted-foreground">
                    Edital baixado de: <a href={editalProcessado.editalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {editalProcessado.editalUrl}
                    </a>
                  </p>
                </div>

                {editalProcessado.cargos.length > 0 && (
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-center">Conteúdo Programático Extraído</h4>
                    
                    {editalProcessado.cargos.map((cargo, cargoIndex) => (
                      <Card key={cargoIndex} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <CardTitle className="text-lg text-green-700 dark:text-green-300">
                            📋 {cargo.nome}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {cargo.conteudoProgramatico.length > 0 ? (
                            <div className="space-y-4">
                              {cargo.conteudoProgramatico.map((disciplina, discIndex) => (
                                <div key={discIndex} className="border-l-2 border-l-blue-200 pl-4">
                                  <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                    📚 {disciplina.disciplina}
                                  </h5>
                                  <ul className="space-y-1 text-sm">
                                    {disciplina.topicos.map((topico, topicoIndex) => (
                                      <li key={topicoIndex} className="flex items-start">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        <span>{topico}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic">
                              Conteúdo programático será extraído em breve...
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Seção de Upload Manual (aparece quando há falha no download ou não processou automaticamente) */}
            {foundConcurso && (!editalProcessado || editalProcessado.requiresManualUpload) && (
              <div className="max-w-4xl mx-auto">
                {/* Mensagem de falha no download automático */}
                {editalProcessado?.requiresManualUpload && (
                  <div className="text-center mb-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-center mb-2">
                      <ExternalLink className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
                      <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                        Download Automático Falhou
                      </h3>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                      {editalProcessado.downloadError}
                    </p>
                    {editalProcessado.editalUrl && (
                      <p className="text-xs text-yellow-500 dark:text-yellow-400 mb-3">
                        Você pode tentar acessar manualmente: 
                        <a href={editalProcessado.editalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          {editalProcessado.editalUrl}
                        </a>
                      </p>
                    )}
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Faça upload manual do arquivo PDF para continuar.
                    </p>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    {editalProcessado?.requiresManualUpload ? 'Upload Manual do Edital' : 'Análise Manual do Edital'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                    {editalProcessado?.requiresManualUpload 
                      ? 'Baixe o edital do link acima e faça upload do arquivo PDF aqui.'
                      : 'Se o processamento automático não funcionou, você pode fazer upload manual do edital em PDF.'
                    }
                  </p>
                </div>
                
                <EditalUploader 
                  concursoNome={foundConcurso.name}
                  onEditalProcessed={(result) => {
                    console.log('Edital processado manualmente:', result);
                    toast({
                      title: "🎉 Edital analisado!",
                      description: result.hasSingleCargo 
                        ? `Conteúdo programático extraído para ${result.cargoName}`
                        : "Edital indexado na base de conhecimento",
                    });
                  }}
                />
              </div>
            )}
          </div>
        ) : currentStep === 'concurso-area' ? (
          // Step 3: Escolha de Área
          <div className="space-y-8">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Seleção de Área
                </h3>
                <p className="text-muted-foreground mb-6">
                  A funcionalidade de seleção por área está sendo desenvolvida. Em breve você poderá 
                  escolher áreas como: Fiscal, Judiciário, Policial, Administrativo, etc.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={handleBackStep}
                    data-testid="button-back-from-area"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/goals'}
                    data-testid="button-back-to-goals-from-area"
                  >
                    Ir para Metas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Step 2: Construção da Meta (outros tipos)
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
                    onClick={handleBackStep}
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