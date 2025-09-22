import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function SectionHeader({ 
  title, 
  description, 
  action,
  className = '',
  'data-testid': testId 
}: SectionHeaderProps) {
  return (
    <div className={cn("section-header mb-6", className)} data-testid={testId}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h2 className="main-title text-2xl font-semibold text-foreground mb-2">
            {title}
          </h2>
          {description && (
            <p className="card-description text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}