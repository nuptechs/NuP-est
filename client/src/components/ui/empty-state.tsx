import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  'data-testid'?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = '',
  'data-testid': testId 
}: EmptyStateProps) {
  return (
    <Card className={cn("text-center py-12", className)} data-testid={testId}>
      <CardContent className="space-y-4">
        <div className="flex justify-center text-6xl text-muted-foreground/50 mb-4">
          {icon}
        </div>
        <h3 className="card-title text-xl font-semibold text-foreground">
          {title}
        </h3>
        <p className="card-description text-muted-foreground max-w-sm mx-auto">
          {description}
        </p>
        {action && (
          <div className="pt-4">
            <Button 
              onClick={action.onClick}
              data-testid="empty-state-action"
            >
              {action.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}