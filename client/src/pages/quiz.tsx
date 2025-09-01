import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trophy, 
  Target, 
  Lightbulb,
  RotateCcw,
  Play,
  Star,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Subject, Topic } from "@shared/schema";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  subject: string;
  points: number;
}

interface QuizConfig {
  subjectId: string;
  topicId?: string;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  questionCount: number;
  timeLimit?: number; // em minutos
}

interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: (number | null)[];
  score: number;
  timeRemaining: number;
  isCompleted: boolean;
  startTime: Date;
}

const DIFFICULTY_COLORS = {
  easy: "bg-green-500",
  medium: "bg-yellow-500", 
  hard: "bg-red-500"
};

const DIFFICULTY_LABELS = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil"
};

export default function QuizPage() {
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    subjectId: "",
    difficulty: "mixed",
    questionCount: 10,
    timeLimit: 15
  });
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar matérias
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Buscar tópicos para a matéria selecionada
  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ["/api/topics", quizConfig.subjectId],
    enabled: !!quizConfig.subjectId,
  });

  // Gerar quiz
  const generateQuizMutation = useMutation({
    mutationFn: async (config: QuizConfig) => {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao gerar quiz");
      }
      
      return response.json();
    },
    onSuccess: (questions: QuizQuestion[]) => {
      setQuizState({
        questions,
        currentQuestionIndex: 0,
        answers: new Array(questions.length).fill(null),
        score: 0,
        timeRemaining: (quizConfig.timeLimit || 15) * 60,
        isCompleted: false,
        startTime: new Date(),
      });
      setIsStarting(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o quiz. Tente novamente.",
        variant: "destructive",
      });
      setIsStarting(false);
    },
  });

  // Salvar resultado do quiz
  const saveQuizResultMutation = useMutation({
    mutationFn: async (result: any) => {
      const response = await fetch("/api/quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao salvar resultado");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Quiz concluído!",
        description: "Seu progresso foi salvo com sucesso.",
      });
    },
  });

  // Timer do quiz
  useEffect(() => {
    if (!quizState || quizState.isCompleted || !quizConfig.timeLimit) return;

    const timer = setInterval(() => {
      setQuizState(prev => {
        if (!prev || prev.timeRemaining <= 1) {
          handleFinishQuiz();
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState?.isCompleted, quizConfig.timeLimit]);

  const startQuiz = () => {
    if (!quizConfig.subjectId) {
      toast({
        title: "Selecione uma matéria",
        description: "É necessário escolher uma matéria para começar o quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    generateQuizMutation.mutate(quizConfig);
  };

  const submitAnswer = () => {
    if (!quizState || selectedAnswer === null) return;

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    // Atualizar respostas
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestionIndex] = selectedAnswer;
    
    // Atualizar pontuação
    const newScore = isCorrect ? quizState.score + currentQuestion.points : quizState.score;
    
    setQuizState(prev => ({
      ...prev!,
      answers: newAnswers,
      score: newScore,
    }));

    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (!quizState) return;

    setSelectedAnswer(null);
    setShowExplanation(false);

    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(prev => ({
        ...prev!,
        currentQuestionIndex: prev!.currentQuestionIndex + 1,
      }));
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    if (!quizState) return;

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - quizState.startTime.getTime()) / 1000);
    
    setQuizState(prev => ({ ...prev!, isCompleted: true }));

    // Salvar resultado
    const result = {
      subjectId: quizConfig.subjectId,
      topicId: quizConfig.topicId,
      totalQuestions: quizState.questions.length,
      correctAnswers: quizState.answers.filter((answer, index) => 
        answer === quizState.questions[index].correctAnswer
      ).length,
      score: quizState.score,
      duration,
      difficulty: quizConfig.difficulty,
      answers: quizState.answers,
      questions: quizState.questions.map(q => q.id),
    };

    saveQuizResultMutation.mutate(result);
  };

  const resetQuiz = () => {
    setQuizState(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizConfig(prev => ({ ...prev }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quizState) {
    // Tela de configuração do quiz
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold">Quiz de Conhecimento</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Teste seus conhecimentos e acompanhe sua evolução
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Configurar Quiz
              </CardTitle>
              <CardDescription>
                Personalize seu quiz de acordo com seus objetivos de estudo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="subject">Matéria *</Label>
                <Select value={quizConfig.subjectId} onValueChange={(value) => 
                  setQuizConfig(prev => ({ ...prev, subjectId: value, topicId: undefined }))
                }>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Selecione uma matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {topics.length > 0 && (
                <div>
                  <Label htmlFor="topic">Tópico (opcional)</Label>
                  <Select value={quizConfig.topicId || ""} onValueChange={(value) =>
                    setQuizConfig(prev => ({ ...prev, topicId: value || undefined }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tópicos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tópicos</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select value={quizConfig.difficulty} onValueChange={(value: any) =>
                  setQuizConfig(prev => ({ ...prev, difficulty: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mista - Questões variadas</SelectItem>
                    <SelectItem value="easy">Fácil - Conceitos básicos</SelectItem>
                    <SelectItem value="medium">Médio - Aplicação prática</SelectItem>
                    <SelectItem value="hard">Difícil - Análise avançada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="questionCount">Número de questões</Label>
                  <Select value={quizConfig.questionCount.toString()} onValueChange={(value) =>
                    setQuizConfig(prev => ({ ...prev, questionCount: parseInt(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 questões</SelectItem>
                      <SelectItem value="10">10 questões</SelectItem>
                      <SelectItem value="15">15 questões</SelectItem>
                      <SelectItem value="20">20 questões</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeLimit">Tempo limite</Label>
                  <Select value={quizConfig.timeLimit?.toString() || ""} onValueChange={(value) =>
                    setQuizConfig(prev => ({ ...prev, timeLimit: value ? parseInt(value) : undefined }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem limite</SelectItem>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={startQuiz} 
                disabled={isStarting || generateQuizMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-start-quiz"
              >
                {isStarting || generateQuizMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Gerando Quiz...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Quiz
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (quizState.isCompleted) {
    // Tela de resultados
    const correctAnswers = quizState.answers.filter((answer, index) => 
      answer === quizState.questions[index].correctAnswer
    ).length;
    const accuracy = Math.round((correctAnswers / quizState.questions.length) * 100);
    const maxScore = quizState.questions.reduce((sum, q) => sum + q.points, 0);
    const scorePercentage = Math.round((quizState.score / maxScore) * 100);

    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Concluído!</h1>
            <p className="text-muted-foreground">
              Parabéns por completar o desafio. Veja seus resultados abaixo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {correctAnswers}/{quizState.questions.length}
                </div>
                <p className="text-muted-foreground">Acertos</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {accuracy}%
                </div>
                <p className="text-muted-foreground">Precisão</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {quizState.score}
                </div>
                <p className="text-muted-foreground">Pontos</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Revisão das Questões</CardTitle>
              <CardDescription>
                Revise suas respostas e aprenda com os erros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quizState.questions.map((question, index) => {
                  const userAnswer = quizState.answers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium flex-1">{question.question}</h3>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge 
                            variant="outline" 
                            className={cn("text-white", DIFFICULTY_COLORS[question.difficulty])}
                          >
                            {DIFFICULTY_LABELS[question.difficulty]}
                          </Badge>
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={cn(
                              "p-2 rounded border",
                              optionIndex === question.correctAnswer && "bg-green-100 border-green-300",
                              userAnswer === optionIndex && optionIndex !== question.correctAnswer && "bg-red-100 border-red-300"
                            )}
                          >
                            {option}
                            {optionIndex === question.correctAnswer && (
                              <span className="ml-2 text-green-600 font-medium">✓ Correta</span>
                            )}
                            {userAnswer === optionIndex && optionIndex !== question.correctAnswer && (
                              <span className="ml-2 text-red-600 font-medium">✗ Sua resposta</span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-700">{question.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button onClick={resetQuiz} variant="outline" data-testid="button-new-quiz">
              <RotateCcw className="h-4 w-4 mr-2" />
              Novo Quiz
            </Button>
            <Button onClick={() => window.location.href = "/dashboard"}>
              <BookOpen className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Tela do quiz em andamento
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header com progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Questão {quizState.currentQuestionIndex + 1} de {quizState.questions.length}
            </div>
            {quizConfig.timeLimit && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={cn(
                  "font-mono",
                  quizState.timeRemaining < 60 && "text-red-500 animate-pulse"
                )}>
                  {formatTime(quizState.timeRemaining)}
                </span>
              </div>
            )}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{quizState.score} pontos</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-white", DIFFICULTY_COLORS[currentQuestion.difficulty])}
            >
              {DIFFICULTY_LABELS[currentQuestion.difficulty]} • {currentQuestion.points}pts
            </Badge>
          </div>
        </div>

        {/* Questão atual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
            <CardDescription>
              Tópico: {currentQuestion.topic}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showExplanation ? (
              <div className="space-y-4">
                <RadioGroup 
                  value={selectedAnswer?.toString()}
                  onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label 
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer py-2"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Button 
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null}
                  className="w-full"
                  data-testid="button-submit-answer"
                >
                  Confirmar Resposta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mostrar resultado */}
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  selectedAnswer === currentQuestion.correctAnswer 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedAnswer === currentQuestion.correctAnswer ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700">Correto!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-700">Incorreto</span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm mb-2">
                    <strong>Resposta correta:</strong> {currentQuestion.options[currentQuestion.correctAnswer]}
                  </p>
                  
                  {selectedAnswer !== currentQuestion.correctAnswer && (
                    <p className="text-sm text-red-600">
                      <strong>Sua resposta:</strong> {currentQuestion.options[selectedAnswer!]}
                    </p>
                  )}
                </div>

                {/* Explicação */}
                {currentQuestion.explanation && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-700 mb-1">Explicação</h4>
                        <p className="text-sm text-blue-600">{currentQuestion.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={nextQuestion}
                  className="w-full"
                  data-testid="button-next-question"
                >
                  {quizState.currentQuestionIndex < quizState.questions.length - 1 ? (
                    <>
                      Próxima Questão
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Finalizar Quiz
                      <Trophy className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}