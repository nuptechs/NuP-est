import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TeamsShell from '@/components/layout/teams-shell';
import { Search, Globe, Database, ExternalLink, Filter, Users, BookOpen, Briefcase, GraduationCap, Building, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  'concurso_publico': { label: 'Concurso Público', icon: Building, color: 'bg-primary/10 text-primary' },
  'vestibular': { label: 'Vestibular', icon: GraduationCap, color: 'bg-purple-500/10 text-purple-600' },
  'escola': { label: 'Escola', icon: BookOpen, color: 'bg-green-500/10 text-green-600' },
  'faculdade': { label: 'Faculdade', icon: Users, color: 'bg-orange-500/10 text-orange-600' },
  'desenvolvimento_profissional': { label: 'Desenvolvimento Profissional', icon: Briefcase, color: 'bg-blue-500/10 text-blue-600' },
  'outras': { label: 'Outras', icon: Search, color: 'bg-muted text-muted-foreground' }
};

export default function IntegratedSearch() {
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['concurso_publico']);
  const [includeWebSites, setIncludeWebSites] = useState(true);
  const [maxResults, setMaxResults] = useState(10);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

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

  // Buscar sites configurados
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

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, type]);
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== type));
    }
  };

  const renderSearchResult = (result: SearchResult, index: number) => {
    const isFromCebraspe = result.source === 'cebraspe';
    const TypeIcon = isFromCebraspe ? Database : Globe;

    return (
      <Card 
        key={`${result.source}-${result.id}-${index}`} 
        className={`transition-all cursor-pointer hover:bg-muted/30 ${selectedResult?.id === result.id ? 'ring-2 ring-primary' : ''}`}
        onClick={() => setSelectedResult(result)}
        data-testid={`card-search-result-${result.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight flex items-center gap-2">
                <TypeIcon className="h-4 w-4" />
                {result.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {result.description || result.fullContent?.substring(0, 150) + '...'}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={isFromCebraspe ? "default" : "secondary"} className="text-xs">
                {isFromCebraspe ? 'Cebraspe' : 'Site Externo'}
              </Badge>
              {result.score && (
                <Badge variant="outline" className="text-xs">
                  Score: {(result.score * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {result.vagas && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Vagas:</span>
                <span>{result.vagas}</span>
              </div>
            )}
            
            {result.salario && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Salário:</span>
                <span className="text-green-600 font-medium">{result.salario}</span>
              </div>
            )}
            
            {result.orgao && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Órgão:</span>
                <span>{result.orgao}</span>
              </div>
            )}
            
            {result.cargo && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Cargo:</span>
                <span>{result.cargo}</span>
              </div>
            )}
            
            {result.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {result.status}
                </Badge>
              </div>
            )}
          </div>
          
          {result.url && (
            <div className="mt-4 pt-3 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(result.url, '_blank')}
                className="w-full"
                data-testid={`button-view-details-${result.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
      <Button size="sm" data-testid="button-new-search">
        <Plus className="h-4 w-4 mr-2" />
        Nova Busca
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
      <div className="flex h-full gap-6">
        {/* Painel Esquerdo - Filtros */}
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros de Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campo de busca */}
              <div className="space-y-2">
                <Label htmlFor="search-input">Termo de Busca</Label>
                <div className="flex gap-2">
                  <Input
                    id="search-input"
                    placeholder="Digite sua busca..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                    data-testid="input-search"
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={!query.trim() || searchMutation.isPending}
                    data-testid="button-search"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tipos de Busca */}
              <div className="space-y-3">
                <Label>Tipos de Busca</Label>
                <div className="space-y-2">
                  {Object.entries(searchTypeLabels).map(([key, typeInfo]) => {
                    const Icon = typeInfo.icon;
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={selectedTypes.includes(key)}
                          onCheckedChange={(checked) => handleTypeChange(key, checked as boolean)}
                          data-testid={`checkbox-${key}`}
                        />
                        <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{typeInfo.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Configurações */}
              <div className="space-y-3">
                <Label>Configurações</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-websites"
                      checked={includeWebSites}
                      onCheckedChange={(checked) => setIncludeWebSites(!!checked)}
                      data-testid="checkbox-include-websites"
                    />
                    <Label htmlFor="include-websites" className="text-sm cursor-pointer">
                      Incluir sites configurados
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-results" className="text-sm">
                      Max resultados: {maxResults}
                    </Label>
                    <Input
                      id="max-results"
                      type="number"
                      min="1"
                      max="50"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
                      className="w-20"
                      data-testid="input-max-results"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sites Configurados */}
          {configuredSites && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  Sites Configurados ({configuredSites.totalTypes} tipos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(configuredSites.sitesByType).map(([type, sites]) => {
                    const typeLabel = searchTypeLabels[type as keyof typeof searchTypeLabels]?.label || type;
                    return (
                      <div key={type} className="p-2 rounded-lg border">
                        <div className="font-medium text-sm">{typeLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {sites.filter(s => s.isActive).length} de {sites.length} ativos
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel Central - Resultados */}
        <div className="flex-1">
          {searchMutation.isPending ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Buscando...</p>
                </div>
              </div>
            </div>
          ) : searchData?.results ? (
            <div className="space-y-4">
              {/* Cabeçalho dos resultados */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {searchData.breakdown.total} resultados encontrados
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchData.breakdown.cebraspe} do Cebraspe • {searchData.breakdown.websites} de sites externos
                  </p>
                </div>
                {searchData.searchTypes.length > 0 && (
                  <div className="flex gap-2">
                    {searchData.searchTypes.map((type) => {
                      const typeInfo = searchTypeLabels[type as keyof typeof searchTypeLabels];
                      if (!typeInfo) return null;
                      const Icon = typeInfo.icon;
                      return (
                        <Badge key={type} variant="outline" className={typeInfo.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lista de resultados */}
              <div className="space-y-3">
                {searchData.results.map(renderSearchResult)}
              </div>
            </div>
          ) : searchMutation.isError ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-destructive">Erro ao realizar a busca. Tente novamente.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Busca Integrada</h3>
                <p className="text-muted-foreground mb-4">
                  Pesquise simultaneamente em concursos do Cebraspe e sites configurados
                </p>
                <p className="text-sm text-muted-foreground">
                  Digite um termo de busca e configure os filtros para começar
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel Direito - Preview (opcional) */}
        {selectedResult && (
          <div className="w-96 flex-shrink-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedResult.source === 'cebraspe' ? <Database className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">{selectedResult.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedResult.description || selectedResult.fullContent}
                    </p>
                  </div>

                  {selectedResult.orgao && (
                    <div>
                      <strong className="text-sm">Órgão:</strong>
                      <p className="text-sm">{selectedResult.orgao}</p>
                    </div>
                  )}

                  {selectedResult.cargo && (
                    <div>
                      <strong className="text-sm">Cargo:</strong>
                      <p className="text-sm">{selectedResult.cargo}</p>
                    </div>
                  )}

                  {selectedResult.vagas && (
                    <div>
                      <strong className="text-sm">Vagas:</strong>
                      <p className="text-sm">{selectedResult.vagas}</p>
                    </div>
                  )}

                  {selectedResult.salario && (
                    <div>
                      <strong className="text-sm">Salário:</strong>
                      <p className="text-sm text-green-600 font-medium">{selectedResult.salario}</p>
                    </div>
                  )}

                  {selectedResult.url && (
                    <Button 
                      onClick={() => window.open(selectedResult.url, '_blank')}
                      className="w-full"
                      data-testid="button-preview-open"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir no Site
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TeamsShell>
  );
}