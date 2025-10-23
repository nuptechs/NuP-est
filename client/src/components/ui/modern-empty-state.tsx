/**
 * Modern Empty State Component
 * Unified component for all empty states across the app
 */

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emptyStateVariants } from "@/lib/design-system";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: keyof typeof emptyStateVariants;
  className?: string;
}

export default function ModernEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const variantStyles = emptyStateVariants[variant];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-4",
      className
    )}>
      <div className="rounded-full bg-muted/50 p-6 mb-4">
        <Icon className={cn(variantStyles.icon, "text-muted-foreground")} />
      </div>
      
      <h3 className={cn(variantStyles.title, "text-foreground mb-2")}>
        {title}
      </h3>
      
      <p className={cn(variantStyles.description, "text-muted-foreground max-w-md mb-6")}>
        {description}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          className={variantStyles.button}
          data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
