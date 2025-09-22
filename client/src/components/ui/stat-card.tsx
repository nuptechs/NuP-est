import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  const variantClasses = {
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 hover:-translate-y-1",
        className
      )} 
      data-testid={testId}
    >
      <CardContent className="p-6">
        <div className={cn(
          "flex items-center mb-4 text-2xl",
          variantClasses[variant]
        )}>
          {icon}
        </div>
        <div className="card-title font-semibold text-2xl text-foreground mb-1">
          {value}
        </div>
        <div className="card-meta text-muted-foreground text-sm">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}