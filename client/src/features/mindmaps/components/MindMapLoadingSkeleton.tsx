import { Brain, Sparkles } from 'lucide-react';

export function MindMapLoadingSkeleton() {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        {/* Animated icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
            <Brain className="w-12 h-12 text-primary animate-pulse" />
            <Sparkles className="w-5 h-5 text-primary/60 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">
            Carregando Mapas Mentais
          </h3>
          <p className="text-sm text-muted-foreground animate-pulse">
            Preparando seu espaço criativo...
          </p>
        </div>

        {/* Loading bar */}
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
        </div>

        {/* Feature hints */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
          {[
            'IA Generativa',
            'Editor Visual',
            'Estilos Personalizados',
            'Exportação SVG/PNG',
          ].map((feature, i) => (
            <div
              key={feature}
              className="px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
