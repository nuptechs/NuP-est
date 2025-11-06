import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { ImpactAnalysis, RiskItem } from '../types';
import { CustomFieldsSection } from './CustomFieldsSection';

interface RisksFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const RisksForm: React.FC<RisksFormProps> = ({ 
  data, 
  onChange,
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const addRisk = () => {
    const newRisk: RiskItem = {
      id: Date.now().toString(),
      description: '',
      impact: 'medio',
      probability: 'medio',
      mitigation: ''
    };

    onChange({
      risks: [...data.risks, newRisk]
    });
  };

  const updateRisk = (index: number, updates: Partial<RiskItem>) => {
    const updatedRisks = [...data.risks];
    updatedRisks[index] = { ...updatedRisks[index], ...updates };

    onChange({
      risks: updatedRisks
    });
  };

  const removeRisk = (index: number) => {
    onChange({
      risks: data.risks.filter((_, i) => i !== index)
    });
  };

  const getRiskLevel = (impact: string, probability: string) => {
    const levels = { baixo: 1, medio: 2, alto: 3, critico: 4 };
    const score = levels[impact as keyof typeof levels] * levels[probability as keyof typeof levels];
    
    if (score >= 9) return { level: 'Crítico', color: 'bg-red-100 text-red-800', icon: '🔴' };
    if (score >= 6) return { level: 'Alto', color: 'bg-orange-100 text-orange-800', icon: '🟠' };
    if (score >= 3) return { level: 'Médio', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' };
    return { level: 'Baixo', color: 'bg-green-100 text-green-800', icon: '🟢' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h4 className="text-lg font-medium text-gray-900">Matriz de Riscos</h4>
        </div>
        <button
          type="button"
          onClick={addRisk}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Risco
        </button>
      </div>

      {data.risks.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Nenhum risco identificado</p>
          <p className="text-sm text-gray-400">Clique em "Adicionar Risco" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.risks.map((risk, index) => {
            const riskLevel = getRiskLevel(risk.impact, risk.probability);
            
            return (
              <div key={risk.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{riskLevel.icon}</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskLevel.color}`}>
                      Risco {riskLevel.level}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRisk(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição do Risco
                    </label>
                    <textarea
                      value={risk.description}
                      onChange={(e) => updateRisk(index, { description: e.target.value })}
                      placeholder="Descreva o risco identificado..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Impacto
                      </label>
                      <select
                        value={risk.impact}
                        onChange={(e) => updateRisk(index, { impact: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="baixo">Baixo</option>
                        <option value="medio">Médio</option>
                        <option value="alto">Alto</option>
                        <option value="critico">Crítico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Probabilidade
                      </label>
                      <select
                        value={risk.probability}
                        onChange={(e) => updateRisk(index, { probability: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="baixo">Baixo</option>
                        <option value="medio">Médio</option>
                        <option value="alto">Alto</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estratégia de Mitigação
                    </label>
                    <textarea
                      value={risk.mitigation}
                      onChange={(e) => updateRisk(index, { mitigation: e.target.value })}
                      placeholder="Como este risco será mitigado..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="risks" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>
    </div>
  );
};