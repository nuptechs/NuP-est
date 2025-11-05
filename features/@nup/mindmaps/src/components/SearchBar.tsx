import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from "@nup/ui";
import { Button } from "@nup/ui";
import { cn } from "@nup/ui";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  className?: string;
}

export function SearchBar({ onSearch, onClose, className }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={cn(
      "absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4",
      className
    )}>
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input
          type="text"
          placeholder="Buscar no mapa... (Ctrl+F)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus
          data-testid="input-search-mindmap"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0"
          data-testid="button-close-search"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
