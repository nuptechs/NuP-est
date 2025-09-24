import { useState } from 'react';
import { ChevronRight, ChevronDown, BookOpen, FileText, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { cn } from '@/lib/utils';

interface SummaryItem {
  id: string;
  title: string;
  level: number;
  summary: string;
  keyPoints: string[];
  importance: 'high' | 'medium' | 'low';
  parentId?: string;
  originalChunkId: string;
}

interface SmartSummary {
  documentName: string;
  overallSummary: string;
  totalSections: number;
  summaryItems: SummaryItem[];
  generatedAt: Date;
}

interface InteractiveSummaryProps {
  summary: SmartSummary;
  className?: string;
}

const ImportanceBadge = ({ importance }: { importance: 'high' | 'medium' | 'low' }) => {
  const configs = {
    high: { icon: Star, color: 'bg-red-100 text-red-800 border-red-200', label: 'Alta' },
    medium: { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Média' },
    low: { icon: FileText, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Baixa' }
  };
  
  const config = configs[importance];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={cn('text-xs', config.color)} data-testid={`badge-importance-${importance}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

const SummaryItemComponent = ({ 
  item, 
  isExpanded, 
  onToggle,
  children,
  allItems,
  expandedItems,
  toggleItem
}: { 
  item: SummaryItem;
  isExpanded: boolean;
  onToggle: () => void;
  children?: SummaryItem[];
  allItems: SummaryItem[];
  expandedItems: Set<string>;
  toggleItem: (itemId: string) => void;
}) => {
  const levelIndent = (item.level - 1) * 16;
  const childItems = allItems.filter(child => child.parentId === item.id);
  
  return (
    <div 
      className="border-l-2 border-gray-200 dark:border-gray-700" 
      style={{ marginLeft: levelIndent }}
      data-testid={`summary-item-${item.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid={`button-toggle-${item.id}`}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="flex-shrink-0 mt-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={cn(
                    "font-medium truncate",
                    item.level === 1 && "text-lg",
                    item.level === 2 && "text-base", 
                    item.level >= 3 && "text-sm"
                  )}>
                    {item.title}
                  </h3>
                  <ImportanceBadge importance={item.importance} />
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {item.summary}
                </p>
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          <div className="ml-7 space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3" data-testid={`content-summary-${item.id}`}>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {item.summary}
              </p>
            </div>
            
            {item.keyPoints.length > 0 && (
              <div data-testid={`content-keypoints-${item.id}`}>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Pontos-Chave:
                </h4>
                <ul className="space-y-1">
                  {item.keyPoints.map((point, index) => (
                    <li 
                      key={index} 
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                      data-testid={`keypoint-${item.id}-${index}`}
                    >
                      <span className="text-blue-500 font-medium">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Renderizar filhos recursivamente */}
            {childItems.length > 0 && (
              <div className="mt-2 space-y-1" data-testid={`children-${item.id}`}>
                {childItems.map((childItem) => (
                  <SummaryItemComponent
                    key={childItem.id}
                    item={childItem}
                    isExpanded={expandedItems.has(childItem.id)}
                    onToggle={() => toggleItem(childItem.id)}
                    allItems={allItems}
                    expandedItems={expandedItems}
                    toggleItem={toggleItem}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const InteractiveSummary = ({ summary, className }: InteractiveSummaryProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showOverallSummary, setShowOverallSummary] = useState(true);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(summary.summaryItems.map(item => item.id)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const getHierarchicalItems = () => {
    // Organizar itens hierarquicamente 
    const topLevel = summary.summaryItems.filter(item => !item.parentId);
    return topLevel.sort((a, b) => a.level - b.level);
  };

  const hierarchicalItems = getHierarchicalItems();

  return (
    <div className={cn('space-y-4', className)} data-testid="interactive-summary">
      {/* Cabeçalho do sumário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Sumário Interativo</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={expandAll}
                data-testid="button-expand-all"
              >
                Expandir Tudo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                data-testid="button-collapse-all"
              >
                Recolher Tudo
              </Button>
            </div>
          </div>
          <CardDescription>
            {summary.documentName} • {summary.totalSections} seções • Gerado em{' '}
            {new Date(summary.generatedAt).toLocaleDateString('pt-BR')}
          </CardDescription>
        </CardHeader>
        
        {showOverallSummary && (
          <CardContent>
            <Collapsible open={showOverallSummary} onOpenChange={setShowOverallSummary}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto text-left">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    <span className="font-medium">Resumo Executivo</span>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4" data-testid="overall-summary">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {summary.overallSummary}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        )}
      </Card>

      {/* Lista de seções interativas */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {hierarchicalItems.map((item) => (
              <SummaryItemComponent
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                allItems={summary.summaryItems}
                expandedItems={expandedItems}
                toggleItem={toggleItem}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do sumário */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div data-testid="stats-high-importance">
              <div className="text-lg font-semibold text-red-600">
                {summary.summaryItems.filter(item => item.importance === 'high').length}
              </div>
              <div className="text-xs text-gray-500">Alta Importância</div>
            </div>
            <div data-testid="stats-medium-importance">
              <div className="text-lg font-semibold text-yellow-600">
                {summary.summaryItems.filter(item => item.importance === 'medium').length}
              </div>
              <div className="text-xs text-gray-500">Média Importância</div>
            </div>
            <div data-testid="stats-low-importance">
              <div className="text-lg font-semibold text-gray-600">
                {summary.summaryItems.filter(item => item.importance === 'low').length}
              </div>
              <div className="text-xs text-gray-500">Baixa Importância</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};