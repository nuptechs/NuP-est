import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SectionHeader({ 
  title, 
  description, 
  actions, 
  className,
  "data-testid": testId 
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)} data-testid={testId}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}