import { Card, CardContent } from './card';

interface SkeletonCardProps {
  className?: string;
  'data-testid'?: string;
}

export function SkeletonCard({ 
  className = '',
  'data-testid': testId 
}: SkeletonCardProps) {
  return (
    <Card className={className} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mr-4" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
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
    <div className={`space-y-2 ${className}`} data-testid={testId}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-gray-200 rounded animate-pulse ${getLineWidth(i)}`}
        />
      ))}
    </div>
  );
}