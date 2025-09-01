import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject, StudySession } from "@shared/schema";

export default function AiAssistant() {
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: subjectProgress, isLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/subjects"],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-2 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Progresso das Matérias</CardTitle>
          <select className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground">
            <option>Este mês</option>
            <option>Esta semana</option>
            <option>Último mês</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {!subjectProgress?.length ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-bar text-muted-foreground text-2xl"></i>
            </div>
            <p className="text-muted-foreground">Nenhuma matéria cadastrada ainda</p>
            <p className="text-sm text-muted-foreground">Adicione matérias para ver o progresso</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectProgress?.map((subject: any) => (
              <div key={subject.id} className="p-4 bg-muted/30 rounded-lg border border-border hover-lift transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground" data-testid={`subject-name-${subject.id}`}>
                    {subject.name}
                  </h4>
                  <span className="text-sm text-muted-foreground" data-testid={`subject-hours-${subject.id}`}>
                    {subject.totalHours}h
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Progresso geral</span>
                    <span className="text-xs font-medium text-foreground" data-testid={`subject-progress-${subject.id}`}>
                      {subject.progress}%
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>
                      <i className="fas fa-file-alt mr-1"></i>
                      <span data-testid={`subject-materials-${subject.id}`}>{subject.materials}</span> materiais
                    </span>
                    <span>
                      <i className="fas fa-question-circle mr-1"></i>
                      <span data-testid={`subject-questions-${subject.id}`}>{subject.questions}</span> questões
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
