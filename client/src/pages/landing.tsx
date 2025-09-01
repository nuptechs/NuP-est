import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
              <i className="fas fa-brain text-white text-2xl"></i>
            </div>
            <h1 className="text-4xl font-bold text-foreground">NuP-est</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Seu Assistente de Estudos com IA
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Revolucione seus estudos com inteligência artificial personalizada. 
            Organize materiais, defina metas e receba questões adaptadas ao seu perfil de aprendizagem.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="hover-lift transition-all">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-robot text-primary text-xl"></i>
              </div>
              <CardTitle>IA Personalizada</CardTitle>
              <CardDescription>
                Questões geradas especificamente para seu perfil de estudo e nível de conhecimento
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-lift transition-all">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-secondary text-xl"></i>
              </div>
              <CardTitle>Acompanhamento</CardTitle>
              <CardDescription>
                Monitore seu progresso com análises detalhadas e relatórios de desempenho
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-lift transition-all">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-target text-accent text-xl"></i>
              </div>
              <CardTitle>Metas Inteligentes</CardTitle>
              <CardDescription>
                Defina objetivos macro e metas micro com sistema de acompanhamento automático
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Study Profiles */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-foreground text-center mb-8">
            Perfis de Estudo Personalizados
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">Disciplinado</CardTitle>
                <CardDescription>
                  Para estudantes organizados que preferem desafios e questões analíticas complexas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader>
                <CardTitle className="text-secondary">Mediano</CardTitle>
                <CardDescription>
                  Equilibrio perfeito entre teoria e prática com explicações detalhadas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-accent/20 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-accent">Indisciplinado</CardTitle>
                <CardDescription>
                  Questões envolventes e práticas com aplicações do mundo real para manter o interesse
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Pronto para começar?</CardTitle>
              <CardDescription>
                Entre agora e transforme sua forma de estudar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Entrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
