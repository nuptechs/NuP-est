import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  'data-testid'?: string;
}

export function SkeletonCard({ 
  className = '',
  'data-testid': testId 
}: SkeletonCardProps) {
  return (
    <Card className={cn("skeleton-card", className)} data-testid={testId}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonRowProps {
  lines?: number;
  className?: string;
  'data-testid'?: string;
}

export function SkeletonRow({ 
  lines = 3,
  className = '',
  'data-testid': testId 
}: SkeletonRowProps) {
  const getLineWidth = (index: number) => {
    if (index === lines - 1) return "w-1/2"; // Last line shorter
    if (index === 0) return "w-full"; // First line full width
    return "w-4/5"; // Middle lines medium width
  };

  return (
    <div className={cn("skeleton-row space-y-2", className)} data-testid={testId}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i} 
          className={cn("h-4", getLineWidth(i))}
        />
      ))}
    </div>
  );
}