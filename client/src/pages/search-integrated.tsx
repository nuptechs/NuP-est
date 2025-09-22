import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TeamsShell from '@/components/layout/teams-shell';
import { Search, Globe, Database, ExternalLink, Building, GraduationCap, BookOpen, Users, Briefcase, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiRequest } from '@/lib/queryClient';

interface SearchResult {
  id: string;
  name: string;
  url: string;
  description?: string;
  fullContent?: string;
  score?: number;
  source: 'cebraspe' | 'website';
  type: string;
  vagas?: string;
  salario?: string;
  orgao?: string;
  cargo?: string;
  status?: string;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  breakdown: {
    cebraspe: number;
    websites: number;
    total: number;
  };
  searchTypes: string[];
  query: string;
}

interface ConfiguredSitesResponse {
  success: boolean;
  sitesByType: Record<string, Array<{
    id: string;
    name: string;
    url: string;
    isActive: boolean;
  }>>;
  totalTypes: number;
}

const searchTypeLabels = {
  'concurso_publico': { label: 'Concurso Público', icon: Building },
  'vestibular': { label: 'Vestibular', icon: GraduationCap },
  'escola': { label: 'Escola', icon: BookOpen },
  'faculdade': { label: 'Faculdade', icon: Users },
  'desenvolvimento_profissional': { label: 'Desenvolvimento', icon: Briefcase },
  'outras': { label: 'Outras', icon: Search }
};

export default function IntegratedSearch() {
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['concurso_publico']);
  const [includeWebSites, setIncludeWebSites] = useState(true);
  const [maxResults, setMaxResults] = useState(10);

  const searchMutation = useMutation({
    mutationFn: async (searchData: {
      query: string;
      searchTypes?: string[];
      includeWebSites?: boolean;
      maxResults?: number;
    }) => {
      const response = await apiRequest('POST', '/api/cebraspe/search-integrated', searchData);
      return await response.json();
    },
  });

  const { data: configuredSites } = useQuery<ConfiguredSitesResponse>({
    queryKey: ['/api/cebraspe/configured-sites'],
    retry: false,
  });

  const handleSearch = () => {
    if (!query.trim()) return;

    searchMutation.mutate({
      query: query.trim(),
      searchTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      includeWebSites,
      maxResults
    });
  };

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(prev => prev.filter(t => t !== type));
    } else {
      setSelectedTypes(prev => [...prev, type]);
    }
  };

  const searchData = searchMutation.data as SearchResponse | undefined;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Busca Integrada" }
  ];

  const primaryActions = (
    <Button variant="outline" size="sm" data-testid="button-settings">
      <Settings className="h-4 w-4 mr-2" />
      Configurar
    </Button>
  );

  return (
    <TeamsShell
      title="Busca Integrada"
      subtitle="Pesquise simultaneamente em concursos do Cebraspe e sites configurados"
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Search Header */}
        <div className="space-y-6">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Digite sua busca (ex: polícia federal, vestibular medicina, concurso auditor...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-12 h-14 text-base border-0 bg-muted/30 focus:bg-background transition-colors rounded-lg"
              data-testid="input-search"
            />
          </div>
          
          {/* Filters Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Categorias:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(searchTypeLabels).map(([key, typeInfo]) => {
                  const Icon = typeInfo.icon;
                  const isSelected = selectedTypes.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleTypeToggle(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`button-${key}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {typeInfo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sites Externos Toggle */}
              <button
                onClick={() => setIncludeWebSites(!includeWebSites)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all ${
                  includeWebSites
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                data-testid="button-include-websites"
              >
                <Globe className="h-3.5 w-3.5" />
                Sites externos
              </button>

              {/* Advanced Options */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Avançado
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Máx resultados</label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={maxResults}
                        onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
                        className="mt-1 h-8"
                        data-testid="input-max-results"
                      />
                    </div>
                    {configuredSites && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sites configurados</label>
                        <div className="mt-1 space-y-1">
                          {Object.entries(configuredSites.sitesByType).map(([type, sites]) => {
                            const typeLabel = searchTypeLabels[type as keyof typeof searchTypeLabels]?.label || type;
                            const activeCount = sites.filter(s => s.isActive).length;
                            return (
                              <div key={type} className="text-xs text-muted-foreground">
                                {typeLabel}: {activeCount} ativo{activeCount !== 1 ? 's' : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending}
                className="h-8"
                data-testid="button-search"
              >
                {searchMutation.isPending ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {searchMutation.isPending && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Buscando nos sites configurados...</p>
            </div>
          </div>
        )}

        {searchData?.results && (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {searchData.breakdown.total} resultado{searchData.breakdown.total !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {searchData.breakdown.cebraspe} do Cebraspe • {searchData.breakdown.websites} de sites externos
                  </p>
                </div>
                {searchData.searchTypes.length > 0 && (
                  <div className="flex gap-1">
                    {searchData.searchTypes.map((type) => {
                      const typeInfo = searchTypeLabels[type as keyof typeof searchTypeLabels];
                      if (!typeInfo) return null;
                      return (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {typeInfo.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-1">
              {searchData.results.map((result, index) => {
                const isFromCebraspe = result.source === 'cebraspe';
                const TypeIcon = isFromCebraspe ? Database : Globe;

                return (
                  <div
                    key={`${result.source}-${result.id}-${index}`}
                    className="group p-4 rounded-lg hover:bg-muted/30 transition-all cursor-pointer"
                    data-testid={`result-${result.id}`}
                  >
                    {/* Result Title & Source */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-medium group-hover:text-primary transition-colors leading-snug">
                        {result.name}
                      </h3>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {isFromCebraspe ? 'Cebraspe' : 'Site'}
                        </Badge>
                        {result.score && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {(result.score * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Result Description */}
                    {result.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {result.description}
                      </p>
                    )}

                    {/* Result Metadata */}
                    {(result.vagas || result.salario || result.orgao || result.cargo) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        {result.vagas && <span><strong>Vagas:</strong> {result.vagas}</span>}
                        {result.salario && <span className="text-green-600"><strong>Salário:</strong> {result.salario}</span>}
                        {result.orgao && <span><strong>Órgão:</strong> {result.orgao}</span>}
                        {result.cargo && <span><strong>Cargo:</strong> {result.cargo}</span>}
                      </div>
                    )}

                    {/* Action Button */}
                    {result.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(result.url, '_blank')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs px-3"
                        data-testid={`button-open-${result.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver detalhes
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {searchMutation.isError && (
          <div className="text-center py-16">
            <div className="space-y-2">
              <h3 className="font-medium">Erro na busca</h3>
              <p className="text-sm text-muted-foreground">
                Não foi possível completar a busca. Verifique sua conexão e tente novamente.
              </p>
              <Button variant="outline" onClick={handleSearch} className="mt-4">
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {!searchData && !searchMutation.isPending && !searchMutation.isError && (
          <div className="text-center py-20">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Busca Integrada</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  Digite um termo de busca para encontrar informações em concursos do Cebraspe 
                  e sites configurados simultaneamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamsShell>
  );
}