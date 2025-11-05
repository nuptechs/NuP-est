import { Card, CardContent } from './card';
import { Button } from './button';

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
    <Card 
      className={`text-center p-12 ${className}`}
      data-testid={testId}
    >
      <CardContent className="space-y-6">
        <div className="flex justify-center text-6xl text-muted-foreground/40">
          {icon}
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>
        
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