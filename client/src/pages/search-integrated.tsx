/**
 * Search Integrated - Multi-Source Search
 * Simplified from 377 lines to clean, professional UX
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import UnifiedShell from '@/components/layout/unified-shell';
import ModernPageHeader from '@/components/ui/modern-page-header';
import ModernEmptyState from '@/components/ui/modern-empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Globe,
  Building,
  GraduationCap,
  BookOpen,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  url: string;
  description?: string;
  score?: number;
  source: 'cebraspe' | 'website';
  type: string;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  breakdown: {
    cebraspe: number;
    websites: number;
    total: number;
  };
}

const SEARCH_TYPES = [
  { id: 'concurso_publico', label: 'Concurso Público', icon: Building },
  { id: 'vestibular', label: 'Vestibular', icon: GraduationCap },
  { id: 'escola', label: 'Escola', icon: BookOpen },
];

export default function IntegratedSearch() {
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['concurso_publico']);
  const [showFilters, setShowFilters] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchData: { query: string; searchTypes?: string[] }) => {
      const response = await apiRequest('POST', '/api/cebraspe/search-integrated', searchData);
      return await response.json();
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate({ query: query.trim(), searchTypes: selectedTypes });
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const searchData = searchMutation.data as SearchResponse | undefined;

  return (
    <UnifiedShell title="Busca Integrada">
      <div className="p-6 space-y-6">
        <ModernPageHeader
          title="Busca Integrada"
          description="Pesquise em concursos e sites configurados simultaneamente"
          icon={Search}
        />

        {/* Search Bar */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Digite sua busca (ex: polícia federal, vestibular medicina...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base"
                data-testid="input-search"
              />
            </div>

            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {SEARCH_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        data-testid={`button-${type.id}`}
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
              className="w-full"
              data-testid="button-search"
            >
              <Search className="h-4 w-4 mr-2" />
              {searchMutation.isPending ? 'Buscando...' : 'Buscar'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {searchMutation.isPending ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Resultados</h2>
              <Badge variant="secondary">
                {searchData.breakdown.total} resultado{searchData.breakdown.total !== 1 ? 's' : ''}
              </Badge>
            </div>

            {searchData.results.length === 0 ? (
              <ModernEmptyState
                icon={Search}
                title="Nenhum resultado encontrado"
                description="Tente ajustar os filtros ou usar termos diferentes"
              />
            ) : (
              <div className="space-y-3">
                {searchData.results.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {result.source === 'cebraspe' ? 'Cebraspe' : 'Website'}
                            </Badge>
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold mb-1">{result.name}</h3>
                          {result.description && (
                            <p className="text-sm text-muted-foreground">{result.description}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(result.url, '_blank')}
                          data-testid={`button-open-${result.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </UnifiedShell>
  );
}
