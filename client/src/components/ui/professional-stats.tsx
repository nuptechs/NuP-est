import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProfessionalStatsProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
}

const variantStyles = {
  default: {
    card: "border-border",
    title: "text-foreground",
    value: "text-foreground",
    trend: {
      up: "text-success bg-success/10",
      down: "text-destructive bg-destructive/10", 
      neutral: "text-muted-foreground bg-muted"
    }
  },
  success: {
    card: "border-success/20 bg-success/5",
    title: "text-success-foreground",
    value: "text-success",
    trend: {
      up: "text-success bg-success/20",
      down: "text-destructive bg-destructive/10",
      neutral: "text-muted-foreground bg-muted"
    }
  },
  warning: {
    card: "border-warning/20 bg-warning/5",
    title: "text-warning-foreground",
    value: "text-warning",
    trend: {
      up: "text-success bg-success/10",
      down: "text-warning bg-warning/20",
      neutral: "text-muted-foreground bg-muted"
    }
  },
  destructive: {
    card: "border-destructive/20 bg-destructive/5",
    title: "text-destructive-foreground",
    value: "text-destructive",
    trend: {
      up: "text-success bg-success/10",
      down: "text-destructive bg-destructive/20",
      neutral: "text-muted-foreground bg-muted"
    }
  },
  info: {
    card: "border-info/20 bg-info/5",
    title: "text-info-foreground", 
    value: "text-info",
    trend: {
      up: "text-success bg-success/10",
      down: "text-destructive bg-destructive/10",
      neutral: "text-muted-foreground bg-muted"
    }
  }
};

const sizeStyles = {
  sm: {
    card: "p-4",
    title: "text-sm",
    value: "text-xl",
    subtitle: "text-xs",
    icon: "w-4 h-4"
  },
  md: {
    card: "p-6",
    title: "text-sm", 
    value: "text-2xl",
    subtitle: "text-sm",
    icon: "w-5 h-5"
  },
  lg: {
    card: "p-8",
    title: "text-base",
    value: "text-3xl",
    subtitle: "text-base",
    icon: "w-6 h-6"
  }
};

export function ProfessionalStats({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  className,
  'data-testid': dataTestId
}: ProfessionalStatsProps) {
  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':  
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-sm",
        styles.card,
        className
      )}
      data-testid={dataTestId}
    >
      <CardContent className={sizeStyle.card}>
        <div className="flex items-center justify-between mb-2">
          <p className={cn(
            "font-medium tracking-tight",
            styles.title,
            sizeStyle.title
          )}>
            {title}
          </p>
          {icon && (
            <div className={cn("text-muted-foreground", sizeStyle.icon)}>
              {icon}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className={cn(
            "font-bold tracking-tight",
            styles.value,
            sizeStyle.value
          )}>
            {value}
          </p>
          
          <div className="flex items-center gap-2">
            {trend && (
              <Badge 
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1",
                  styles.trend[trend.direction || 'neutral']
                )}
              >
                {getTrendIcon()}
                {trend.value > 0 && '+'}
                {trend.value}%
              </Badge>
            )}
            
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                sizeStyle.subtitle
              )}>
                {subtitle}
              </p>
            )}
            
            {trend?.label && (
              <p className={cn(
                "text-muted-foreground",
                sizeStyle.subtitle
              )}>
                {trend.label}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}