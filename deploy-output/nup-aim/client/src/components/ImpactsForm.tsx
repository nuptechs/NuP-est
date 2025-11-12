import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ImpactAnalysis, ImpactItem } from '../types';
import { CustomFieldsSection } from './CustomFieldsSection';

interface ImpactsFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const ImpactsForm: React.FC<ImpactsFormProps> = ({ 
  data, 
  onChange,
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const addImpact = (category: keyof ImpactAnalysis['impacts']) => {
    const newImpact: ImpactItem = {
      id: Date.now().toString(),
      description: '',
      severity: 'medio',
      probability: 'medio',
      category: category
    };

    onChange({
      impacts: {
        ...data.impacts,
        [category]: [...data.impacts[category], newImpact]
      }
    });
  };

  const updateImpact = (
    category: keyof ImpactAnalysis['impacts'],
    index: number,
    updates: Partial<ImpactItem>
  ) => {
    const updatedImpacts = [...data.impacts[category]];
    updatedImpacts[index] = { ...updatedImpacts[index], ...updates };

    onChange({
      impacts: {
        ...data.impacts,
        [category]: updatedImpacts
      }
    });
  };

  const removeImpact = (category: keyof ImpactAnalysis['impacts'], index: number) => {
    onChange({
      impacts: {
        ...data.impacts,
        [category]: data.impacts[category].filter((_, i) => i !== index)
      }
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'baixo': return 'bg-green-100 text-green-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'alto': return 'bg-orange-100 text-orange-800';
      case 'critico': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ImpactSection: React.FC<{
    title: string;
    category: keyof ImpactAnalysis['impacts'];
    color: string;
  }> = ({ title, category, color }) => {
    const impacts = data.impacts[category];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className={`text-lg font-medium ${color}`}>{title}</h4>
          <button
            type="button"
            onClick={() => addImpact(category)}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </button>
        </div>

        {impacts.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Nenhum impacto adicionado</p>
        ) : (
          <div className="space-y-3">
            {impacts.map((impact, index) => (
              <div key={impact.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <textarea
                    value={impact.description}
                    onChange={(e) => updateImpact(category, index, { description: e.target.value })}
                    placeholder="Descreva o impacto..."
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mr-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeImpact(category, index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Severidade
                    </label>
                    <select
                      value={impact.severity}
                      onChange={(e) => updateImpact(category, index, { severity: e.target.value as any })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Probabilidade
                    </label>
                    <select
                      value={impact.probability}
                      onChange={(e) => updateImpact(category, index, { probability: e.target.value as any })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(impact.severity)}`}>
                    {impact.severity.charAt(0).toUpperCase() + impact.severity.slice(1)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(impact.probability)}`}>
                    Prob: {impact.probability.charAt(0).toUpperCase() + impact.probability.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <ImpactSection title="Impactos de Negócio" category="business" color="text-blue-700" />
      <ImpactSection title="Impactos Técnicos" category="technical" color="text-purple-700" />
      <ImpactSection title="Impactos Operacionais" category="operational" color="text-green-700" />
      <ImpactSection title="Impactos Financeiros" category="financial" color="text-red-700" />
      
      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="impacts" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>
    </div>
  );
};