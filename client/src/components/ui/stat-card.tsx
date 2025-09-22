import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  variant?: "primary" | "success" | "warning" | "info" | "neutral";
  className?: string;
  "data-testid"?: string;
}

const variantStyles = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning", 
  info: "text-info",
  neutral: "text-muted-foreground"
};

export function StatCard({ 
  icon, 
  value, 
  label, 
  variant = "neutral",
  className,
  "data-testid": testId
}: StatCardProps) {
  return (
    <Card className={cn("border-0 surface transition-fast hover-lift", className)} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold text-foreground">
              {value}
            </div>
            <div className="text-xs font-medium text-muted-foreground mt-1">
              {label}
            </div>
          </div>
          <div className={cn("w-8 h-8", variantStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}