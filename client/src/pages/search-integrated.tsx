import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TeamsShell from '@/components/layout/teams-shell';
import { Search, Globe, Database, ExternalLink, Building, GraduationCap, BookOpen, Users, Briefcase, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  'desenvolvimento_profissional': { label: 'Desenvolvimento Profissional', icon: Briefcase },
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
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" data-testid="button-settings">
        <Settings className="h-4 w-4 mr-2" />
        Configurar Sites
      </Button>
    </div>
  );

  return (
    <TeamsShell
      title="Busca Integrada"
      subtitle="Pesquise em concursos do Cebraspe e sites configurados simultaneamente"
      breadcrumbs={breadcrumbs}
      primaryActions={primaryActions}
    >
      <div className="max-w-4xl mx-auto pt-8 pb-16 space-y-8">
        {/* Search Section */}
        <div className="space-y-6">
          {/* Main Search Input */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Digite sua busca (ex: polícia federal, vestibular medicina, concurso auditor...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base border-0 bg-muted/20 focus:bg-background transition-colors"
                data-testid="input-search"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending}
                className="px-6"
                data-testid="button-search"
              >
                {searchMutation.isPending ? 'Buscando...' : 'Buscar'}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Máx resultados:</span>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
                  className="w-16 h-8 text-center border-0 bg-muted/20"
                  data-testid="input-max-results"
                />
              </div>
            </div>
          </div>

          {/* Filter Tags */}
          <div className="space-y-3">
            <div className="space-y-2">
              <h3 className="text-sm text-muted-foreground">Categorias</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(searchTypeLabels).map(([key, typeInfo]) => {
                  const Icon = typeInfo.icon;
                  const isSelected = selectedTypes.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleTypeToggle(key)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
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

            <div className="space-y-2">
              <h3 className="text-sm text-muted-foreground">Opções</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIncludeWebSites(!includeWebSites)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    includeWebSites
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="button-include-websites"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Sites externos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {searchMutation.isPending && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Buscando...</p>
            </div>
          </div>
        )}

        {searchData?.results && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {searchData.breakdown.total} resultados encontrados
              </h2>
              <p className="text-muted-foreground">
                {searchData.breakdown.cebraspe} do Cebraspe • {searchData.breakdown.websites} de sites externos
              </p>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {searchData.results.map((result, index) => {
                const isFromCebraspe = result.source === 'cebraspe';
                const TypeIcon = isFromCebraspe ? Database : Globe;

                return (
                  <div
                    key={`${result.source}-${result.id}-${index}`}
                    className="group p-6 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                    data-testid={`result-${result.id}`}
                  >
                    {/* Result Header */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-medium group-hover:text-primary transition-colors line-clamp-2">
                          {result.name}
                        </h3>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {isFromCebraspe ? 'Cebraspe' : 'Site Externo'}
                          </Badge>
                          {result.score && (
                            <Badge variant="outline" className="text-xs">
                              {(result.score * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {result.description && (
                        <p className="text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>

                    {/* Result Details */}
                    {(result.vagas || result.salario || result.orgao || result.cargo) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {result.vagas && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Vagas</div>
                            <div className="text-sm font-medium">{result.vagas}</div>
                          </div>
                        )}
                        {result.salario && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Salário</div>
                            <div className="text-sm font-medium text-green-600">{result.salario}</div>
                          </div>
                        )}
                        {result.orgao && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Órgão</div>
                            <div className="text-sm">{result.orgao}</div>
                          </div>
                        )}
                        {result.cargo && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Cargo</div>
                            <div className="text-sm">{result.cargo}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    {result.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(result.url, '_blank')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-open-${result.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Erro ao realizar a busca. Tente novamente.</p>
          </div>
        )}

        {!searchData && !searchMutation.isPending && !searchMutation.isError && (
          <div className="text-center py-16">
            <div className="space-y-4">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Busca Integrada</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Pesquise simultaneamente em concursos do Cebraspe e sites configurados.
                  Digite um termo de busca e selecione as categorias desejadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sites Info */}
        {configuredSites && (
          <div className="pt-8 border-t">
            <div className="text-center space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Sites Configurados</h4>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                {Object.entries(configuredSites.sitesByType).map(([type, sites]) => {
                  const typeLabel = searchTypeLabels[type as keyof typeof searchTypeLabels]?.label || type;
                  const activeCount = sites.filter(s => s.isActive).length;
                  return (
                    <div key={type}>
                      {typeLabel}: {activeCount}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamsShell>
  );
}