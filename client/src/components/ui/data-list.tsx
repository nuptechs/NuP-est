import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./card"

interface DataListProps {
  children: React.ReactNode
  className?: string
  emptyState?: React.ReactNode
  loading?: boolean
}

interface DataListItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  actions?: React.ReactNode
  testId?: string
}

export function DataList({ 
  children, 
  className, 
  emptyState,
  loading = false 
}: DataListProps) {
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-muted h-10 w-10" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (React.Children.count(children) === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  )
}

export function DataListItem({ 
  children, 
  onClick, 
  className,
  actions,
  testId
}: DataListItemProps) {
  const isClickable = !!onClick

  return (
    <Card 
      className={cn(
        "p-4 transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:border-ring/20 active:scale-[0.99]",
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </Card>
  )
}

DataList.Item = DataListItem