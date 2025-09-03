import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/header';
import MobileNav from '@/components/layout/mobile-nav';
import { Search, Globe, Database, ExternalLink, Filter, Users, BookOpen, Briefcase, GraduationCap, Building } from 'lucide-react';
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
  'concurso_publico': { label: 'Concurso Público', icon: Building, color: 'bg-blue-100 text-blue-800' },
  'vestibular': { label: 'Vestibular', icon: GraduationCap, color: 'bg-purple-100 text-purple-800' },
  'escola': { label: 'Escola', icon: BookOpen, color: 'bg-green-100 text-green-800' },
  'faculdade': { label: 'Faculdade', icon: Users, color: 'bg-orange-100 text-orange-800' },
  'desenvolvimento_profissional': { label: 'Desenvolvimento Profissional', icon: Briefcase, color: 'bg-teal-100 text-teal-800' },
  'outras': { label: 'Outras', icon: Search, color: 'bg-gray-100 text-gray-800' }
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
      <Card key={`${result.source}-${result.id}-${index}`} className="transition-all hover:shadow-md">
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

  return (
    <div className="min-h-screen bg-background">
      <main className="overflow-auto">
        <Header 
          title="Busca Integrada" 
          subtitle="Pesquise em concursos do Cebraspe e sites configurados simultaneamente"
        />
        <div className="container mx-auto p-6 max-w-7xl">

      {/* Formulário de Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Nova Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campo de busca */}
          <div className="flex gap-3">
            <Input
              placeholder="Digite sua busca (ex: polícia federal, vestibular medicina, concurso auditor...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={!query.trim() || searchMutation.isPending}
            >
              {searchMutation.isPending ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipos de busca */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Tipos de Busca</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(searchTypeLabels).map(([type, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => handleTypeChange(type, checked === true)}
                      />
                      <Label htmlFor={type} className="text-xs flex items-center gap-1 cursor-pointer">
                        <IconComponent className="h-3 w-3" />
                        {config.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opções avançadas */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Configurações</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeWebSites"
                    checked={includeWebSites}
                    onCheckedChange={(checked) => setIncludeWebSites(checked === true)}
                  />
                  <Label htmlFor="includeWebSites" className="text-sm">
                    Incluir sites configurados
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxResults" className="text-sm">Max resultados:</Label>
                  <Input
                    id="maxResults"
                    type="number"
                    min="5"
                    max="50"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sites Configurados */}
      {configuredSites && configuredSites.sitesByType && Object.keys(configuredSites.sitesByType).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sites Configurados ({configuredSites.totalTypes || 0} tipos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(configuredSites.sitesByType).map(([type, sites]) => {
                const config = searchTypeLabels[type as keyof typeof searchTypeLabels];
                if (!config) return null;
                
                const IconComponent = config.icon;
                return (
                  <div key={type} className="space-y-2">
                    <Badge className={config.color} variant="secondary">
                      <IconComponent className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {sites.length} site{sites.length !== 1 ? 's' : ''} configurado{sites.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados da Busca */}
      {searchMutation.isPending && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Buscando em múltiplas fontes...</span>
          </div>
        </div>
      )}

      {searchData && (
        <div className="space-y-6">
          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Busca: "{searchData.query}"</CardTitle>
              <CardDescription>
                Encontrados {searchData.breakdown.total} resultados • 
                {searchData.breakdown.cebraspe} do Cebraspe • 
                {searchData.breakdown.websites} de sites externos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {searchData.searchTypes.map(type => {
                  const config = searchTypeLabels[type as keyof typeof searchTypeLabels];
                  if (!config) return null;
                  const IconComponent = config.icon;
                  return (
                    <Badge key={type} className={config.color} variant="secondary">
                      <IconComponent className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resultados organizados por fonte */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todos ({searchData.results.length})
              </TabsTrigger>
              <TabsTrigger value="cebraspe">
                Cebraspe ({searchData.breakdown.cebraspe})
              </TabsTrigger>
              <TabsTrigger value="websites">
                Sites ({searchData.breakdown.websites})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {searchData.results.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum resultado encontrado para sua busca.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {searchData.results.map((result, index) => renderSearchResult(result, index))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cebraspe" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {searchData.results
                  .filter(r => r.source === 'cebraspe')
                  .map((result, index) => renderSearchResult(result, index))}
              </div>
            </TabsContent>

            <TabsContent value="websites" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {searchData.results
                  .filter(r => r.source === 'website')
                  .map((result, index) => renderSearchResult(result, index))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Erro */}
      {searchMutation.error && (
        <Card className="border-red-200">
          <CardContent className="text-center py-8">
            <p className="text-red-600">
              Erro ao realizar a busca. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}