/**
 * 404 Not Found - Modern Error Page
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-12 pb-8 px-6 text-center">
          {/* Large 404 */}
          <div className="mb-6">
            <h1 className="text-8xl font-bold text-primary">404</h1>
            <div className="h-1 w-24 bg-primary mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Message */}
          <h2 className="text-2xl font-semibold mb-2">Página não encontrada</h2>
          <p className="text-muted-foreground mb-8">
            A página que você está procurando não existe ou foi movida.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => navigate('/')}
              data-testid="button-home"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate('/library')}
                data-testid="button-library"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Biblioteca
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/study')}
                data-testid="button-study"
              >
                <Search className="h-4 w-4 mr-2" />
                Estudar
              </Button>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground mt-8">
            Se o problema persistir, entre em contato com o suporte
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
