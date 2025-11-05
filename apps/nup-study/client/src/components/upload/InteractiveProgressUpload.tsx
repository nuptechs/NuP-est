import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload, FileText, Zap, Brain, Sparkles, Clock, X } from "lucide-react";

interface UploadStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  estimatedTime: number; // segundos
}

interface InteractiveProgressUploadProps {
  file: File;
  onComplete: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  isComplete?: boolean;
  progress?: number;
}

const uploadSteps: UploadStep[] = [
  {
    id: "upload",
    title: "Enviando arquivo",
    description: "Transferindo seu documento para nossos servidores...",
    icon: Upload,
    estimatedTime: 3
  },
  {
    id: "processing",
    title: "Processando documento",
    description: "Extraindo texto e analisando o conteúdo...",
    icon: FileText,
    estimatedTime: 8
  },
  {
    id: "ai-analysis",
    title: "Análise com IA",
    description: "Nossa IA está estudando e organizando o conhecimento...",
    icon: Brain,
    estimatedTime: 12
  },
  {
    id: "embedding",
    title: "Criando embeddings",
    description: "Transformando conteúdo em representações vetoriais...",
    icon: Zap,
    estimatedTime: 7
  },
  {
    id: "indexing",
    title: "Indexando na base",
    description: "Adicionando à sua biblioteca de conhecimento...",
    icon: Sparkles,
    estimatedTime: 5
  }
];

const motivationalMessages = [
  "🧠 Sua IA está ficando mais inteligente...",
  "📚 Expandindo sua base de conhecimento...",
  "⚡ Quase pronto para acelerar seus estudos!",
  "🎯 Preparando conteúdo personalizado para você...",
  "💡 Criando conexões entre conceitos...",
  "🚀 Otimizando para suas próximas consultas...",
  "✨ Transformando dados em sabedoria...",
  "🎓 Seu assistente de estudos está evoluindo..."
];

export function InteractiveProgressUpload({ 
  file, 
  onComplete, 
  onCancel, 
  isProcessing,
  isComplete = false,
  progress = 0 
}: InteractiveProgressUploadProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(motivationalMessages[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  const currentStep = uploadSteps[currentStepIndex];
  const totalSteps = uploadSteps.length;
  const overallProgress = isComplete 
    ? 100 
    : ((currentStepIndex + stepProgress / 100) / totalSteps) * 100;

  // Timer para tempo decorrido
  useEffect(() => {
    if (!isProcessing) return;
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isProcessing]);

  // Rotação de mensagens motivacionais
  useEffect(() => {
    if (!isProcessing) return;

    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % motivationalMessages.length);
    }, 3000);

    return () => clearInterval(messageTimer);
  }, [isProcessing]);

  useEffect(() => {
    setCurrentMessage(motivationalMessages[messageIndex]);
  }, [messageIndex]);

  // Simular progresso das etapas - mas só completar quando backend terminar
  useEffect(() => {
    if (!isProcessing) return;

    const stepTimer = setInterval(() => {
      setStepProgress(prev => {
        if (prev >= 100) {
          if (currentStepIndex < totalSteps - 1) {
            setCurrentStepIndex(prevIndex => prevIndex + 1);
            return 0;
          } else {
            // Última etapa - parar em 95% até backend completar
            return Math.min(95, prev + 1);
          }
        }
        return prev + (100 / (currentStep.estimatedTime * 10)); // 10 updates per second
      });
    }, 100);

    return () => clearInterval(stepTimer);
  }, [isProcessing, currentStepIndex, currentStep]);

  // Completar progresso apenas quando backend terminar
  useEffect(() => {
    if (isComplete && currentStepIndex === totalSteps - 1) {
      setStepProgress(100);
      setTimeout(() => {
        onComplete();
      }, 800); // Pequeno delay para mostrar conclusão
    }
  }, [isComplete, currentStepIndex, totalSteps, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (!isProcessing) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="interactive-progress-upload">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900" data-testid="upload-filename">
                {file.name}
              </h3>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)} • PDF
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-cancel-processing"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progresso Geral */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progresso Geral
            </span>
            <span className="text-sm text-gray-500" data-testid="overall-progress">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-2 mb-2"
            data-testid="progress-overall"
          />
        </div>

        {/* Etapa Atual */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg animate-pulse">
              <currentStep.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900" data-testid="current-step-title">
                {currentStep.title}
              </h4>
              <p className="text-sm text-gray-600" data-testid="current-step-description">
                {currentStep.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-blue-600" data-testid="step-progress">
                {Math.round(stepProgress)}%
              </div>
            </div>
          </div>
          <Progress 
            value={stepProgress} 
            className="h-1"
            data-testid="progress-current-step"
          />
        </div>

        {/* Mensagem Motivacional */}
        <div className="mb-6 text-center">
          <p 
            className="text-lg font-medium text-gray-700 animate-in fade-in duration-500" 
            key={messageIndex}
            data-testid="motivational-message"
          >
            {currentMessage}
          </p>
        </div>

        {/* Lista de Etapas */}
        <div className="space-y-3 mb-6">
          {uploadSteps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div 
                key={step.id} 
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-blue-50 border border-blue-200' 
                    : isCompleted 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
                data-testid={`step-${step.id}`}
              >
                <div className={`p-2 rounded-lg ${
                  isCompleted 
                    ? 'bg-green-600' 
                    : isCurrent 
                    ? 'bg-blue-600 animate-pulse' 
                    : 'bg-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <step.icon className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium ${
                    isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className={`text-sm ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.description}
                  </div>
                </div>

                <div className="text-right">
                  {isCompleted ? (
                    <span className="text-sm text-green-600 font-medium">
                      ✓ Concluído
                    </span>
                  ) : isCurrent ? (
                    <span className="text-sm text-blue-600 font-medium">
                      Em andamento...
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{step.estimatedTime}s
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer com estatísticas */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
          <div className="flex items-center gap-4">
            <span data-testid="elapsed-time">
              ⏱️ Tempo: {formatTime(elapsedTime)}
            </span>
            <span data-testid="steps-completed">
              📋 Etapa {currentStepIndex + 1} de {totalSteps}
            </span>
          </div>
          <div className="text-blue-600 font-medium" data-testid="estimated-remaining">
            ~{uploadSteps.slice(currentStepIndex).reduce((acc, step) => acc + step.estimatedTime, 0)}s restantes
          </div>
        </div>
      </CardContent>
    </Card>
  );
}