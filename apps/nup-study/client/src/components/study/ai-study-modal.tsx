import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { AiQuestion, Subject } from "@shared/schema";

interface AiStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
}

export default function AiStudyModal({ isOpen, onClose, subjectId }: AiStudyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const { data: subject } = useQuery({
    queryKey: ["/api/subjects"],
    select: (subjects: Subject[]) => subjects?.find(s => s.id === subjectId),
    enabled: !!subjectId,
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-questions", {
        subjectId,
        difficulty,
        questionCount,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setQuestions(data);
      setSessionStarted(true);
      setStartTime(new Date());
      toast({
        title: "Questões geradas!",
        description: `${data.length} questões personalizadas prontas para você`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao gerar questões. Verifique se há materiais cadastrados.",
        variant: "destructive",
      });
    },
  });

  const submitAnswersMutation = useMutation({
    mutationFn: async () => {
      // Create study session
      const sessionResponse = await apiRequest("POST", "/api/study-sessions", {
        subjectId,
        type: "ai_questions",
        duration: startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0,
        questionsTotal: questions.length,
        questionsCorrect: Object.values(answers).filter((answer, index) => 
          answer === questions[index]?.correctAnswer
        ).length,
      });
      
      const session = await sessionResponse.json();
      
      // Record each answer attempt
      const attempts = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const userAnswer = answers[question.id] || "";
        
        attempts.push(apiRequest("POST", "/api/question-attempts", {
          questionId: question.id,
          sessionId: session.id,
          userAnswer,
          isCorrect: userAnswer === question.correctAnswer,
          timeSpent: 60, // Approximate time per question
        }));
      }
      
      await Promise.all(attempts);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study-sessions"] });
      setShowResults(true);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar respostas",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer("");
    setAnswers({});
    setShowResults(false);
    setQuestions([]);
    setSessionStarted(false);
    setStartTime(null);
    onClose();
  };

  const handleNextQuestion = () => {
    if (selectedAnswer) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: selectedAnswer
      }));
      setSelectedAnswer("");
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        submitAnswersMutation.mutate();
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(answers[questions[currentQuestionIndex - 1]?.id] || "");
    }
  };

  const getScore = () => {
    const correct = Object.values(answers).filter((answer, index) => 
      answer === questions[index]?.correctAnswer
    ).length;
    return Math.round((correct / questions.length) * 100);
  };

  useEffect(() => {
    if (isOpen && currentQuestionIndex < questions.length) {
      setSelectedAnswer(answers[questions[currentQuestionIndex]?.id] || "");
    }
  }, [currentQuestionIndex, questions, answers, isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-accent"></i>
              </div>
              <div>
                <DialogTitle>
                  {showResults ? "Resultados" : `Sessão IA - ${subject?.name || "Matéria"}`}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {showResults ? "Veja seu desempenho" : "Questões personalizadas para seu perfil"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {!sessionStarted ? (
            // Configuration Screen
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-2" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Número de Questões</Label>
                <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
                  <SelectTrigger className="mt-2" data-testid="select-question-count">
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

              <Button 
                onClick={() => generateQuestionsMutation.mutate()}
                disabled={generateQuestionsMutation.isPending}
                className="w-full"
                data-testid="button-generate-questions"
              >
                {generateQuestionsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Gerando questões...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>
                    Gerar Questões
                  </>
                )}
              </Button>
            </div>
          ) : showResults ? (
            // Results Screen
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/30 rounded-lg">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-chart-line text-primary text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2" data-testid="text-final-score">
                  {getScore()}%
                </h3>
                <p className="text-muted-foreground">
                  Você acertou {Object.values(answers).filter((answer, index) => 
                    answer === questions[index]?.correctAnswer
                  ).length} de {questions.length} questões
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Revisão das Questões</h4>
                {questions.map((question, index) => {
                  const userAnswer = answers[question.id];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <div key={question.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          Questão {index + 1}
                        </span>
                        <Badge variant={isCorrect ? "default" : "destructive"}>
                          {isCorrect ? "Correta" : "Incorreta"}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2">{question.question}</p>
                      <p className="text-xs text-muted-foreground">
                        Sua resposta: {userAnswer} | Resposta correta: {question.correctAnswer}
                      </p>
                      {question.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleClose} className="w-full" data-testid="button-finish-session">
                Finalizar Sessão
              </Button>
            </div>
          ) : (
            // Question Screen
            <div className="space-y-6">
              {/* Question Counter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Questão</span>
                  <span className="text-sm font-semibold text-foreground" data-testid="text-current-question">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">de</span>
                  <span className="text-sm font-semibold text-foreground" data-testid="text-total-questions">
                    {questions.length}
                  </span>
                </div>
                <Badge variant="outline">
                  {questions[currentQuestionIndex]?.difficulty}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar h-2">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>

              {/* Question Content */}
              {questions[currentQuestionIndex] && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-foreground" data-testid="text-question">
                    {questions[currentQuestionIndex].question}
                  </h4>
                  
                  <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                    <div className="space-y-3">
                      {(questions[currentQuestionIndex].options as string[])?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option.charAt(0)} 
                            id={`option-${index}`}
                            data-testid={`radio-option-${index}`}
                          />
                          <Label 
                            htmlFor={`option-${index}`}
                            className="flex-1 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  data-testid="button-previous-question"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Anterior
                </Button>
                
                <div className="space-x-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
                      setSelectedAnswer("");
                    }}
                    disabled={currentQuestionIndex === questions.length - 1}
                    data-testid="button-skip-question"
                  >
                    Pular
                  </Button>
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={!selectedAnswer || submitAnswersMutation.isPending}
                    data-testid="button-confirm-answer"
                  >
                    {currentQuestionIndex === questions.length - 1 ? "Finalizar" : "Próxima"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
