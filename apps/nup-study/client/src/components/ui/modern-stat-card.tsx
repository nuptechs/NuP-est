/**
 * Modern Stat Card Component
 * Unified stat card for dashboards and analytics
 */

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@nup/ui";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  description?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  primary: {
    bg: 'bg-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  success: {
    bg: 'bg-success/5',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  warning: {
    bg: 'bg-warning/5',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  danger: {
    bg: 'bg-destructive/5',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
};

export default function ModernStatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = 'default',
  className,
}: ModernStatCardProps) {
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-4 w-4" />;
    if (trend.value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn(styles.bg, "border-border/50", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("rounded-lg p-2.5", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {(description || trend) && (
            <p className="text-sm text-muted-foreground">
              {description || trend?.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
