import React from 'react';
import { Plus, X, CheckCircle } from 'lucide-react';
import { ImpactAnalysis } from '../types';
import { CustomFieldsSection } from './CustomFieldsSection';

interface ConclusionsFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const ConclusionsForm: React.FC<ConclusionsFormProps> = ({ 
  data, 
  onChange,
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const addRecommendation = (value: string) => {
    if (!value.trim()) return;
    
    onChange({
      conclusions: {
        ...data.conclusions,
        recommendations: [...data.conclusions.recommendations, value.trim()]
      }
    });
  };

  const removeRecommendation = (index: number) => {
    onChange({
      conclusions: {
        ...data.conclusions,
        recommendations: data.conclusions.recommendations.filter((_, i) => i !== index)
      }
    });
  };

  const addNextStep = (value: string) => {
    if (!value.trim()) return;
    
    onChange({
      conclusions: {
        ...data.conclusions,
        nextSteps: [...data.conclusions.nextSteps, value.trim()]
      }
    });
  };

  const removeNextStep = (index: number) => {
    onChange({
      conclusions: {
        ...data.conclusions,
        nextSteps: data.conclusions.nextSteps.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-blue-500" />
        <h4 className="text-lg font-medium text-gray-900">Conclusões e Recomendações</h4>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resumo Executivo
        </label>
        <textarea
          value={data.conclusions.summary}
          onChange={(e) => onChange({
            conclusions: {
              ...data.conclusions,
              summary: e.target.value
            }
          })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="Resuma os principais pontos da análise de impacto..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recomendações
        </label>
        <RecommendationsList
          items={data.conclusions.recommendations}
          onAdd={addRecommendation}
          onRemove={removeRecommendation}
          placeholder="Ex: Realizar testes em ambiente de homologação"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Próximos Passos
        </label>
        <RecommendationsList
          items={data.conclusions.nextSteps}
          onAdd={addNextStep}
          onRemove={removeNextStep}
          placeholder="Ex: Agendar reunião com stakeholders"
        />
      </div>
      
      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="conclusions" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>
    </div>
  );
};

const RecommendationsList: React.FC<{
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}> = ({ items, onAdd, onRemove, placeholder }) => {
  const [inputValue, setInputValue] = React.useState('');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onAdd(inputValue);
              setInputValue('');
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            onAdd(inputValue);
            setInputValue('');
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-sm text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};