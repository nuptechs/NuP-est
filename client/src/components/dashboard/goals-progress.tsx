import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GoalsProgress() {
  const { data: weeklyProgress, isLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/weekly"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Metas da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {!weeklyProgress?.length ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-target text-muted-foreground"></i>
              </div>
              <p className="text-muted-foreground mb-4">Nenhuma meta definida</p>
              <Button size="sm" data-testid="button-add-first-goal">
                <i className="fas fa-plus mr-2"></i>
                Criar primeira meta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {weeklyProgress?.slice(0, 3).map((goal: any) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground" data-testid={`goal-name-${goal.id}`}>
                      {goal.name}
                    </span>
                    <span className="text-sm text-muted-foreground" data-testid={`goal-progress-${goal.id}`}>
                      {goal.progress}
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${goal.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Study Assistant */}
      <Card>
        <CardHeader>
          <CardTitle>Assistente IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground mb-2">
                <i className="fas fa-lightbulb text-primary mr-2"></i>
                Sugestão para você
              </p>
              <p className="text-sm text-muted-foreground">
                Continue com seus estudos consistentes! Recomendo focar em questões práticas hoje.
              </p>
            </div>
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              data-testid="button-generate-questions"
            >
              <i className="fas fa-robot mr-2"></i>
              Gerar Questões Personalizadas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
