import { cn } from "@/lib/utils"
import { Search, Filter } from "lucide-react"
import { Input } from "./input"

interface CommandBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function CommandBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
  filters,
  actions,
  className
}: CommandBarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 p-4 bg-background/50 rounded-xl border",
      className
    )}>
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
          data-testid="search-input"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center gap-2">
        {filters && (
          <div className="flex items-center gap-2 px-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {filters}
          </div>
        )}
        {actions}
      </div>
    </div>
  )
}