import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Lightbulb, 
  Check, 
  X, 
  RefreshCw, 
  Send,
  Eye,
  Loader2,
  Sparkles
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AdaptiveQuestionsProps {
  assistantId: string;
  subjectId: string;
  topicId?: string;
}

interface GeneratedQuestion {
  questionId?: string;
  question: string;
  difficulty: string;
  questionType: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

interface HintResponse {
  hint: string;
  hintLevel: number;
  revealPercentage: number;
}

export default function AdaptiveQuestions({ assistantId, subjectId, topicId }: AdaptiveQuestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Mutation para gerar pergunta
  const generateQuestion = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assistant/question", {
        assistantId,
        subjectId,
        topicId,
        difficulty: currentQuestion ? currentQuestion.difficulty : undefined,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentQuestion(data);
      setUserAnswer("");
      setCurrentHintLevel(0);
      setHints([]);
      setShowExplanation(false);
      setExplanation("");
      setIsCorrect(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar pergunta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para obter dica
  const getHint = useMutation({
    mutationFn: async () => {
      if (!currentQuestion) return null;
      
      const response = await apiRequest("POST", "/api/assistant/hint", {
        assistantId,
        questionId: currentQuestion.questionId || `q-${Date.now()}`,
        currentAnswer: userAnswer,
        hintLevel: currentHintLevel + 1,
      });
      return await response.json();
    },
    onSuccess: (data: HintResponse) => {
      if (data) {
        setHints([...hints, data.hint]);
        setCurrentHintLevel(data.hintLevel);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao obter dica",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para obter explicação
  const getExplanation = useMutation({
    mutationFn: async (wasCorrect: boolean) => {
      if (!currentQuestion) return null;
      
      const response = await apiRequest("POST", "/api/assistant/explanation", {
        assistantId,
        questionContent: currentQuestion.question,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer || "",
        wasCorrect,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data?.explanation) {
        setExplanation(data.explanation);
        setShowExplanation(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao obter explicação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para registrar interação
  const logInteraction = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/profile/interaction", data);
      return await response.json();
    },
  });

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      toast({
        title: "Resposta vazia",
        description: "Por favor, digite sua resposta antes de enviar",
        variant: "destructive",
      });
      return;
    }

    if (!currentQuestion) return;

    // Verificar se a resposta está correta (comparação simples)
    const correct = userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer?.toLowerCase().trim();
    setIsCorrect(correct);
    setQuestionCount(questionCount + 1);
    if (correct) setCorrectCount(correctCount + 1);

    // Obter explicação
    getExplanation.mutate(correct);

    // Registrar interação para atualizar perfil
    logInteraction.mutate({
      assistantId,
      interactionType: "question",
      interactionData: {
        questionDifficulty: currentQuestion.difficulty,
        wasCorrect: correct,
        hintsUsed: currentHintLevel,
      },
      engagement: currentHintLevel === 0 ? "high" : currentHintLevel <= 2 ? "medium" : "low",
      comprehension: correct ? "high" : "medium",
    });
  };

  const handleNextQuestion = () => {
    generateQuestion.mutate();
  };

  const handleRequestHint = () => {
    if (currentHintLevel >= 4) {
      toast({
        title: "Limite de dicas",
        description: "Você já usou todas as dicas disponíveis",
      });
      return;
    }
    getHint.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Perguntas</p>
                <p className="text-2xl font-bold" data-testid="text-question-count">{questionCount}</p>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acertos</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-correct-count">{correctCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
                <p className="text-2xl font-bold" data-testid="text-accuracy-rate">
                  {questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0}%
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
            {questionCount > 0 && (
              <Progress 
                value={(correctCount / questionCount) * 100} 
                className="mt-2"
                data-testid="progress-accuracy"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Área da pergunta */}
      {!currentQuestion ? (
        <Card data-testid="card-no-question">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pronto para começar?</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Clique no botão abaixo para gerar sua primeira pergunta adaptativa
            </p>
            <Button 
              onClick={handleNextQuestion} 
              disabled={generateQuestion.isPending}
              data-testid="button-generate-question"
            >
              {generateQuestion.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Pergunta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-question">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pergunta Adaptativa</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" data-testid="badge-difficulty">
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="outline" data-testid="badge-question-type">
                  {currentQuestion.questionType}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pergunta */}
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentQuestion.question}
              </ReactMarkdown>
            </div>

            {/* Opções (se houver) */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Opções:</p>
                <ul className="list-disc list-inside space-y-1">
                  {currentQuestion.options.map((option, index) => (
                    <li key={index} className="text-sm">{option}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dicas */}
            {hints.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Dicas ({hints.length}/4):
                </p>
                {hints.map((hint, index) => (
                  <Alert key={index} data-testid={`alert-hint-${index + 1}`}>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Dica {index + 1}:</strong> {hint}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Campo de resposta */}
            {isCorrect === null && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sua Resposta:</label>
                  <Textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Digite sua resposta aqui..."
                    rows={4}
                    data-testid="textarea-answer"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitAnswer}
                    className="flex-1"
                    data-testid="button-submit-answer"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Resposta
                  </Button>
                  
                  <Button
                    onClick={handleRequestHint}
                    variant="outline"
                    disabled={currentHintLevel >= 4 || getHint.isPending}
                    data-testid="button-request-hint"
                  >
                    {getHint.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Dica ({currentHintLevel}/4)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Resultado e Explicação */}
            {isCorrect !== null && (
              <div className="space-y-4">
                <Alert variant={isCorrect ? "default" : "destructive"} data-testid="alert-result">
                  {isCorrect ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>{isCorrect ? "Correto!" : "Incorreto"}</strong> - {isCorrect ? "Parabéns!" : `A resposta correta é: ${currentQuestion.correctAnswer}`}
                  </AlertDescription>
                </Alert>

                {showExplanation && explanation && (
                  <Card data-testid="card-explanation">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Explicação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {explanation}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleNextQuestion}
                  className="w-full"
                  disabled={generateQuestion.isPending}
                  data-testid="button-next-question"
                >
                  {generateQuestion.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Próxima Pergunta
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
