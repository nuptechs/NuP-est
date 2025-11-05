import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Brain, 
  Target, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  BarChart3
} from "lucide-react";

interface StudentProfileViewProps {
  profile: any;
}

export default function StudentProfileView({ profile }: StudentProfileViewProps) {
  if (!profile) {
    return (
      <Card data-testid="card-no-profile">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Perfil não disponível</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Seu perfil será criado automaticamente conforme você interage com o assistente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse numeric values
  const focusCapacity = parseFloat(profile.focusCapacity) || 0;
  const readingSpeed = parseFloat(profile.readingSpeed) || 0;
  const memoryRetention = parseFloat(profile.memoryRetention) || 0;
  const processingSpeed = parseFloat(profile.processingSpeed) || 0;

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card data-testid="card-profile-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Aluno
          </CardTitle>
          <CardDescription>
            Versão {profile.version} • Criado em {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Tipo de Aluno</p>
              <Badge variant="outline" className="capitalize" data-testid="badge-student-type">
                {profile.studentType || "Não definido"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Nível Atual</p>
              <Badge variant="outline" data-testid="badge-current-level">
                {profile.currentLevel || "Não definido"}
              </Badge>
            </div>
          </div>

          {profile.objectives && profile.objectives.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Objetivos</p>
              <div className="flex flex-wrap gap-2">
                {profile.objectives.map((objective: string, index: number) => (
                  <Badge key={index} variant="secondary" data-testid={`badge-objective-${index}`}>
                    <Target className="h-3 w-3 mr-1" />
                    {objective}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacidades Cognitivas */}
      <Card data-testid="card-cognitive-abilities">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Capacidades Cognitivas
          </CardTitle>
          <CardDescription>
            Métricas baseadas nas suas interações e desempenho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Capacidade de Foco</span>
              <span className="font-medium" data-testid="text-focus-capacity">
                {(focusCapacity * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={focusCapacity * 100} data-testid="progress-focus" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Velocidade de Leitura</span>
              <span className="font-medium" data-testid="text-reading-speed">
                {(readingSpeed * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={readingSpeed * 100} data-testid="progress-reading" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Retenção de Memória</span>
              <span className="font-medium" data-testid="text-memory-retention">
                {(memoryRetention * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={memoryRetention * 100} data-testid="progress-memory" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Velocidade de Processamento</span>
              <span className="font-medium" data-testid="text-processing-speed">
                {(processingSpeed * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={processingSpeed * 100} data-testid="progress-processing" />
          </div>
        </CardContent>
      </Card>

      {/* Preferências e Estilo de Aprendizagem */}
      <Card data-testid="card-learning-style">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estilo de Aprendizagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.preferredExplanationStyle && (
            <div>
              <p className="text-sm font-medium mb-1">Estilo de Explicação Preferido</p>
              <Badge variant="outline" data-testid="badge-explanation-style">
                {profile.preferredExplanationStyle}
              </Badge>
            </div>
          )}

          {profile.learningPacePreference && (
            <div>
              <p className="text-sm font-medium mb-1">Ritmo de Aprendizagem</p>
              <Badge variant="outline" data-testid="badge-learning-pace">
                {profile.learningPacePreference}
              </Badge>
            </div>
          )}

          {profile.motivationalFactors && profile.motivationalFactors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Fatores Motivacionais</p>
              <div className="flex flex-wrap gap-2">
                {profile.motivationalFactors.map((factor: string, index: number) => (
                  <Badge key={index} variant="secondary" data-testid={`badge-motivation-${index}`}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profile.frustrationsAndBlockers && profile.frustrationsAndBlockers.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Frustrações e Bloqueios</p>
              <div className="flex flex-wrap gap-2">
                {profile.frustrationsAndBlockers.map((blocker: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-orange-50 dark:bg-orange-950" data-testid={`badge-blocker-${index}`}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {blocker}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Padrões de Estudo */}
      {(profile.studyTimePatterns || profile.peakPerformanceHours) && (
        <Card data-testid="card-study-patterns">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Padrões de Estudo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.studyTimePatterns && (
              <div>
                <p className="text-sm font-medium mb-1">Padrões de Tempo</p>
                <p className="text-sm text-muted-foreground" data-testid="text-study-patterns">
                  {profile.studyTimePatterns}
                </p>
              </div>
            )}

            {profile.peakPerformanceHours && profile.peakPerformanceHours.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Horários de Melhor Desempenho</p>
                <div className="flex flex-wrap gap-2">
                  {profile.peakPerformanceHours.map((hour: string, index: number) => (
                    <Badge key={index} variant="outline" data-testid={`badge-peak-hour-${index}`}>
                      {hour}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
