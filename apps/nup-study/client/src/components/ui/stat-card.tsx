import { Card, CardContent } from './card';
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'info';
  className?: string;
  'data-testid'?: string;
}

export function StatCard({ 
  icon, 
  value, 
  label, 
  variant = 'primary', 
  className = '',
  'data-testid': testId 
}: StatCardProps) {
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-cyan-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <Card 
      className={cn(
        "h-full transition-all duration-200 hover:shadow-md hover:-translate-y-1", 
        className
      )}
      data-testid={testId}
    >
      <CardContent className="flex flex-col items-center text-center p-6">
        <div className={cn("mb-4 text-3xl", getVariantColor(variant))}>
          {icon}
        </div>
        <div className="text-2xl font-semibold text-foreground mb-1 leading-none">
          {value}
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}