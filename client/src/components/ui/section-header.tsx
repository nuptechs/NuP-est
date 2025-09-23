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
    <div 
      className={`flex justify-between items-start gap-4 mb-8 ${className}`}
      data-testid={testId}
    >
      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground leading-relaxed">
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
  );
}