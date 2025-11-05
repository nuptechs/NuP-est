import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Check, 
  X,
  AlertCircle,
  Loader2,
  Award,
  BarChart3
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AdaptiveAssessmentProps {
  assistantId: string;
  subjectId: string;
  topicId?: string;
}

interface AssessmentQuestion {
  questionId: string;
  question: string;
  options?: string[];
  difficulty: number;
  questionNumber: number;
  totalQuestions: number;
}

interface AssessmentResult {
  assessmentId: string;
  estimatedAbility: number;
  confidenceLevel: number;
  questionsAnswered: number;
  correctAnswers: number;
  identifiedStrengths: string[];
  identifiedWeaknesses: string[];
  recommendedStrategies: string[];
}

export default function AdaptiveAssessment({ assistantId, subjectId, topicId }: AdaptiveAssessmentProps) {
  const { toast } = useToast();
  
  const [isStarted, setIsStarted] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [currentAbility, setCurrentAbility] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Mutation para iniciar avaliação
  const startAssessment = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assessment/adaptive", {
        assistantId,
        subjectId,
        topicId,
        totalQuestions: 10,
        initialDifficulty: 0.5,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.question) {
        setAssessmentId(data.assessmentId || data.id || "");
        setCurrentQuestion(data.question);
        setIsStarted(true);
        setCurrentAbility(data.currentAbility || 0);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar avaliação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para enviar resposta
  const submitAnswer = useMutation({
    mutationFn: async (data: { assessmentId: string; questionId: string; answer: string }) => {
      const response = await apiRequest("POST", "/api/assessment/submit-answer", data);
      return await response.json();
    },
    onSuccess: (data) => {
      // Atualizar estatísticas
      setAnsweredCount(prev => prev + 1);
      if (data.isCorrect) {
        setCorrectCount(prev => prev + 1);
      }
      setCurrentAbility(data.abilityEstimate || 0);

      // Mostrar feedback
      toast({
        title: data.isCorrect ? "Correto!" : "Incorreto",
        description: data.isCorrect ? "Boa resposta!" : "Continue tentando!",
        variant: data.isCorrect ? "default" : "destructive",
      });

      // Próxima pergunta ou resultado
      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
        setSelectedAnswer("");
      } else if (data.result) {
        setAssessmentResult(data.result);
        setCurrentQuestion(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartAssessment = () => {
    startAssessment.mutate();
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      toast({
        title: "Selecione uma resposta",
        description: "Por favor, escolha uma opção antes de continuar",
        variant: "destructive",
      });
      return;
    }

    if (!currentQuestion || !assessmentId) return;

    submitAnswer.mutate({
      assessmentId: assessmentId,
      questionId: currentQuestion.questionId,
      answer: selectedAnswer,
    });
  };

  const handleRestart = () => {
    setIsStarted(false);
    setAssessmentId("");
    setCurrentQuestion(null);
    setSelectedAnswer("");
    setAssessmentResult(null);
    setCurrentAbility(0);
    setAnsweredCount(0);
    setCorrectCount(0);
  };

  // Tela inicial
  if (!isStarted && !assessmentResult) {
    return (
      <Card data-testid="card-assessment-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Avaliação Adaptativa
          </CardTitle>
          <CardDescription>
            Avaliação inteligente que se adapta ao seu nível de conhecimento usando teoria de resposta ao item (IRT)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Esta avaliação ajusta automaticamente a dificuldade das questões com base nas suas respostas,
              estimando com precisão seu nível de habilidade no tópico.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Como funciona:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Você responderá 10 questões adaptativas</li>
              <li>A dificuldade se ajusta com base no seu desempenho</li>
              <li>Ao final, você receberá uma estimativa precisa da sua habilidade</li>
              <li>Identificamos seus pontos fortes e áreas de melhoria</li>
            </ul>
          </div>

          <Button 
            onClick={handleStartAssessment} 
            disabled={startAssessment.isPending}
            className="w-full"
            data-testid="button-start-assessment"
          >
            {startAssessment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Iniciar Avaliação
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Tela de resultado
  if (assessmentResult) {
    const accuracyPercentage = (correctCount / answeredCount) * 100;
    const abilityLevel = assessmentResult.estimatedAbility < -1 ? "Iniciante" :
                         assessmentResult.estimatedAbility < 0 ? "Básico" :
                         assessmentResult.estimatedAbility < 1 ? "Intermediário" :
                         assessmentResult.estimatedAbility < 2 ? "Avançado" : "Expert";

    return (
      <div className="space-y-6" data-testid="div-assessment-result">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Avaliação Concluída!
            </CardTitle>
            <CardDescription>
              Confira seu desempenho e recomendações personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estatísticas principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Habilidade Estimada</p>
                <p className="text-3xl font-bold" data-testid="text-ability-estimate">
                  {assessmentResult.estimatedAbility.toFixed(2)}
                </p>
                <Badge className="mt-2">{abilityLevel}</Badge>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Confiança</p>
                <p className="text-3xl font-bold" data-testid="text-confidence">
                  {(assessmentResult.confidenceLevel * 100).toFixed(0)}%
                </p>
                <Progress value={assessmentResult.confidenceLevel * 100} className="mt-2" />
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Acertos</p>
                <p className="text-3xl font-bold text-green-600" data-testid="text-correct-answers">
                  {correctCount}/{answeredCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {accuracyPercentage.toFixed(0)}% de acurácia
                </p>
              </div>
            </div>

            {/* Pontos fortes */}
            {assessmentResult.identifiedStrengths.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Pontos Fortes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {assessmentResult.identifiedStrengths.map((strength, index) => (
                    <Badge key={index} variant="outline" className="bg-green-50 dark:bg-green-950">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Áreas de melhoria */}
            {assessmentResult.identifiedWeaknesses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Áreas de Melhoria
                </h3>
                <div className="flex flex-wrap gap-2">
                  {assessmentResult.identifiedWeaknesses.map((weakness, index) => (
                    <Badge key={index} variant="outline" className="bg-orange-50 dark:bg-orange-950">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Estratégias recomendadas */}
            {assessmentResult.recommendedStrategies.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Estratégias Recomendadas
                </h3>
                <div className="space-y-2">
                  {assessmentResult.recommendedStrategies.map((strategy, index) => (
                    <Alert key={index}>
                      <AlertDescription>{strategy}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleRestart} className="flex-1" data-testid="button-restart-assessment">
                <Target className="mr-2 h-4 w-4" />
                Nova Avaliação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de pergunta
  if (currentQuestion) {
    const progressPercentage = (currentQuestion.questionNumber / currentQuestion.totalQuestions) * 100;

    return (
      <div className="space-y-6">
        {/* Progresso e estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium" data-testid="text-progress">
                    {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                  </span>
                </div>
                <Progress value={progressPercentage} data-testid="progress-assessment" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Habilidade Atual</p>
                  <p className="text-2xl font-bold" data-testid="text-current-ability">
                    {currentAbility.toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dificuldade</p>
                  <p className="text-2xl font-bold" data-testid="text-difficulty">
                    {currentQuestion.difficulty.toFixed(2)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pergunta */}
        <Card data-testid="card-question">
          <CardHeader>
            <CardTitle>Questão {currentQuestion.questionNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentQuestion.question}
              </ReactMarkdown>
            </div>

            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option} 
                        id={`option-${index}`}
                        data-testid={`radio-option-${index}`}
                      />
                      <Label 
                        htmlFor={`option-${index}`} 
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            <Button
              onClick={handleSubmitAnswer}
              disabled={submitAnswer.isPending || !selectedAnswer}
              className="w-full"
              data-testid="button-submit-answer"
            >
              {submitAnswer.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Enviar Resposta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
