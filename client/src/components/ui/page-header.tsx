import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  children,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col space-y-4 pb-6 border-b bg-background",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}