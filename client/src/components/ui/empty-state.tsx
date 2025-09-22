import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  "data-testid"?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className,
  "data-testid": testId 
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-8", className)} data-testid={testId}>
      <div className="w-12 h-12 mx-auto mb-4 text-muted-foreground flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base font-medium text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <Button 
          size="sm" 
          onClick={action.onClick}
          data-testid={`${testId}-action`}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}