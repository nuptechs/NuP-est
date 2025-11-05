import { Brain, Plus, Filter } from 'lucide-react';

export function MindMapLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="container max-w-7xl mx-auto p-3 sm:p-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-muted/60 rounded animate-pulse hidden sm:block" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-10 w-full sm:w-[200px] bg-muted rounded-lg animate-pulse flex items-center justify-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="h-10 w-full sm:w-auto px-4 bg-primary/10 rounded-lg animate-pulse flex items-center justify-center gap-2">
              <Plus className="w-4 h-4 text-primary/50" />
            </div>
          </div>
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                <div className="h-5 bg-muted/60 rounded animate-pulse" style={{ width: `${40 + Math.random() * 20}%` }} />
              </div>
              
              {/* Description skeleton */}
              <div className="space-y-1">
                <div className="h-3 bg-muted/40 rounded animate-pulse" />
                <div className="h-3 bg-muted/40 rounded animate-pulse" style={{ width: '80%' }} />
              </div>

              {/* Footer skeleton */}
              <div className="flex items-center justify-between pt-2">
                <div className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator at bottom */}
        <div className="mt-8 flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative">
              <Brain className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Carregando mapas mentais...
            </p>
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
