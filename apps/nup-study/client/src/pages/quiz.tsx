/**
 * Quiz - Modern Interactive Assessment
 * Simplified from 927 lines to clean, professional UX
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import UnifiedShell from "@/components/layout/unified-shell";
import ModernPageHeader from "@/components/ui/modern-page-header";
import ModernEmptyState from "@/components/ui/modern-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Play,
  RotateCcw,
  Lightbulb,
  Target,
  Home
} from "lucide-react";
import type { Subject } from "@shared/schema";
import type { BreadcrumbItem } from "@/components/ui/page-header";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  score: number;
  timeRemaining: number;
  isCompleted: boolean;
  startTime: Date;
}

export default function QuizPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, difficulty, questionCount }),
      });
      if (!response.ok) throw new Error("Failed to generate quiz");
      return response.json();
    },
    onSuccess: (questions: QuizQuestion[]) => {
      setQuizState({
        questions,
        currentIndex: 0,
        answers: new Array(questions.length).fill(null),
        score: 0,
        timeRemaining: 900,
        isCompleted: false,
        startTime: new Date(),
      });
    },
    onError: () => {
      toast({ title: "Erro ao gerar quiz", variant: "destructive" });
    },
  });

  const saveResultMutation = useMutation({
    mutationFn: async (result: any) => {
      const response = await fetch("/api/quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!response.ok) throw new Error("Failed to save result");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Quiz concluído e salvo!" });
    },
  });

  // Timer
  useEffect(() => {
    if (!quizState || quizState.isCompleted) return;

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
  }, [quizState?.isCompleted]);

  const startQuiz = () => {
    if (!subjectId) {
      toast({ title: "Selecione uma matéria", variant: "destructive" });
      return;
    }
    generateQuizMutation.mutate();
  };

  const submitAnswer = () => {
    if (!quizState || selectedAnswer === null) return;

    const currentQ = quizState.questions[quizState.currentIndex];
    const isCorrect = selectedAnswer === currentQ.correctAnswer;
    
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentIndex] = selectedAnswer;
    
    setQuizState(prev => ({
      ...prev!,
      answers: newAnswers,
      score: isCorrect ? prev!.score + 10 : prev!.score,
    }));

    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (quizState!.currentIndex < quizState!.questions.length - 1) {
      setQuizState(prev => ({ ...prev!, currentIndex: prev!.currentIndex + 1 }));
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    if (!quizState) return;

    setQuizState(prev => ({ ...prev!, isCompleted: true }));

    const correctAnswers = quizState.answers.filter((answer, index) => 
      answer === quizState.questions[index].correctAnswer
    ).length;

    saveResultMutation.mutate({
      subjectId,
      totalQuestions: quizState.questions.length,
      correctAnswers,
      score: quizState.score,
      difficulty,
    });
  };

  const resetQuiz = () => {
    setQuizState(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = quizState?.questions[quizState.currentIndex];
  const progress = quizState ? ((quizState.currentIndex + 1) / quizState.questions.length) * 100 : 0;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Início", href: "/", icon: <Home className="h-4 w-4" /> },
    { label: "Quiz", icon: <Brain className="h-4 w-4" /> }
  ];

  return (
    <UnifiedShell breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <ModernPageHeader
          title="Quiz Interativo"
          description="Teste seus conhecimentos com questões adaptativas"
          icon={Brain}
        />

        {!quizState ? (
          // Configuration Screen
          <Card>
            <CardHeader>
              <CardTitle>Configurar Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Matéria *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger data-testid="select-quiz-subject">
                    <SelectValue placeholder="Escolha uma matéria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Dificuldade</Label>
                  <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                    <SelectTrigger data-testid="select-quiz-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mista</SelectItem>
                      <SelectItem value="easy">Fácil</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="hard">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="count">Número de Questões</Label>
                  <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                    <SelectTrigger data-testid="select-quiz-count">
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
              </div>

              <Button 
                className="w-full"
                onClick={startQuiz}
                disabled={!subjectId || generateQuizMutation.isPending}
                data-testid="button-start-quiz"
              >
                <Play className="h-4 w-4 mr-2" />
                {generateQuizMutation.isPending ? 'Gerando...' : 'Iniciar Quiz'}
              </Button>
            </CardContent>
          </Card>
        ) : quizState.isCompleted ? (
          // Results Screen
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Quiz Concluído!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary" data-testid="result-score">
                    {Math.round((quizState.answers.filter((a, i) => a === quizState.questions[i].correctAnswer).length / quizState.questions.length) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Acertos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold" data-testid="result-questions">
                    {quizState.answers.filter((a, i) => a === quizState.questions[i].correctAnswer).length}/{quizState.questions.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Questões</p>
                </div>
                <div>
                  <p className="text-3xl font-bold" data-testid="result-points">{quizState.score}</p>
                  <p className="text-sm text-muted-foreground">Pontos</p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetQuiz} data-testid="button-new-quiz">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Novo Quiz
                </Button>
                <Button className="flex-1" onClick={() => window.location.href = '/analytics'} data-testid="button-view-analytics">
                  <Target className="h-4 w-4 mr-2" />
                  Ver Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Quiz Screen
          <>
            {/* Progress Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  Questão {quizState.currentIndex + 1}/{quizState.questions.length}
                </Badge>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(quizState.timeRemaining)}
                </Badge>
              </div>
              <Badge>Pontos: {quizState.score}</Badge>
            </div>

            <Progress value={progress} />

            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg leading-relaxed">{currentQ?.question}</CardTitle>
                  <Badge 
                    className={
                      currentQ?.difficulty === 'easy' ? 'bg-green-500' :
                      currentQ?.difficulty === 'medium' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }
                  >
                    {currentQ?.difficulty === 'easy' ? 'Fácil' :
                     currentQ?.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={selectedAnswer?.toString()} onValueChange={(v) => setSelectedAnswer(parseInt(v))}>
                  {currentQ?.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/20 transition-colors">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={showExplanation} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                      {showExplanation && index === currentQ.correctAnswer && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {showExplanation && selectedAnswer === index && index !== currentQ.correctAnswer && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </RadioGroup>

                {showExplanation && (
                  <div className="bg-muted/50 p-4 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Explicação:</p>
                        <p className="text-sm text-muted-foreground">{currentQ?.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  {!showExplanation ? (
                    <Button 
                      onClick={submitAnswer}
                      disabled={selectedAnswer === null}
                      data-testid="button-submit-answer"
                    >
                      Confirmar Resposta
                    </Button>
                  ) : (
                    <Button onClick={nextQuestion} data-testid="button-next-question">
                      {quizState.currentIndex < quizState.questions.length - 1 ? 'Próxima Questão' : 'Finalizar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </UnifiedShell>
  );
}
