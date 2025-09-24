import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MoreHorizontal, ExternalLink } from "lucide-react";

interface ProfessionalCardProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string | React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "outline" | "ghost" | "elevated";
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
}

const ProfessionalCard = forwardRef<HTMLDivElement, ProfessionalCardProps>(
  ({
    children,
    title,
    description,
    subtitle,
    icon,
    badge,
    actions,
    footer,
    className,
    contentClassName,
    variant = "default",
    size = "md",
    interactive = false,
    onClick,
    href,
    loading = false,
    ...props
  }, ref) => {
    const cardVariants = {
      default: "border border-border bg-card text-card-foreground",
      outline: "border-2 border-border bg-transparent",
      ghost: "border-0 bg-transparent",
      elevated: "border border-border bg-card text-card-foreground shadow-lg"
    };

    const sizeVariants = {
      sm: "p-4",
      md: "p-6",
      lg: "p-8"
    };

    const isClickable = interactive || onClick || href;

    const cardContent = (
      <Card
        ref={ref}
        className={cn(
          cardVariants[variant],
          isClickable && "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
          loading && "animate-pulse",
          "flex flex-col",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {/* Header Section */}
        {(title || description || subtitle || icon || badge || actions) && (
          <CardHeader className={cn(
            "pb-4",
            size === "sm" ? "p-4 pb-3" : size === "lg" ? "p-8 pb-6" : "p-6 pb-4"
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                {icon && (
                  <div className="flex-shrink-0 mt-0.5">
                    {typeof icon === 'string' ? (
                      <div className="w-5 h-5 bg-muted rounded flex items-center justify-center">
                        <span className="text-xs">{icon}</span>
                      </div>
                    ) : (
                      icon
                    )}
                  </div>
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  {title && (
                    <CardTitle className={cn(
                      "leading-tight truncate",
                      size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg"
                    )}>
                      {title}
                    </CardTitle>
                  )}
                  {subtitle && (
                    <div className="text-sm font-medium text-muted-foreground">
                      {subtitle}
                    </div>
                  )}
                  {description && (
                    <CardDescription className={cn(
                      "leading-relaxed text-justify",
                      size === "sm" ? "text-xs" : "text-sm"
                    )}>
                      {description}
                    </CardDescription>
                  )}
                  {badge && (
                    <div className="pt-2">
                      {typeof badge === 'string' ? (
                        <Badge variant="secondary" className="text-xs">
                          {badge}
                        </Badge>
                      ) : (
                        badge
                      )}
                    </div>
                  )}
                </div>
              </div>
              {actions && (
                <div className="flex-shrink-0 flex items-start pt-1">
                  {actions}
                </div>
              )}
            </div>
          </CardHeader>
        )}

        {/* Content Section */}
        {children && (
          <CardContent className={cn(
            sizeVariants[size],
            (title || description || subtitle || icon || badge || actions) && "pt-0",
            "flex-grow",
            contentClassName
          )}>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            ) : (
              children
            )}
          </CardContent>
        )}

        {/* Footer Section */}
        {footer && (
          <>
            <Separator />
            <div className={cn(
              "flex items-center justify-between px-6 py-4"
            )}>
              {footer}
            </div>
          </>
        )}

        {/* External Link Indicator */}
        {href && (
          <div className="absolute top-3 right-3">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </Card>
    );

    if (href) {
      return (
        <a href={href} className="block">
          {cardContent}
        </a>
      );
    }

    return cardContent;
  }
);

ProfessionalCard.displayName = "ProfessionalCard";

export { ProfessionalCard };