import React from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { ImpactAnalysis, MitigationItem } from '../types';
import { CustomFieldsSection } from './CustomFieldsSection';

interface MitigationsFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const MitigationsForm: React.FC<MitigationsFormProps> = ({ 
  data, 
  onChange,
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const addMitigation = () => {
    const newMitigation: MitigationItem = {
      id: Date.now().toString(),
      action: '',
      responsible: '',
      deadline: '',
      priority: 'medio'
    };

    onChange({
      mitigations: [...data.mitigations, newMitigation]
    });
  };

  const updateMitigation = (index: number, updates: Partial<MitigationItem>) => {
    const updatedMitigations = [...data.mitigations];
    updatedMitigations[index] = { ...updatedMitigations[index], ...updates };

    onChange({
      mitigations: updatedMitigations
    });
  };

  const removeMitigation = (index: number) => {
    onChange({
      mitigations: data.mitigations.filter((_, i) => i !== index)
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alto': return 'bg-red-100 text-red-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'baixo': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          <h4 className="text-lg font-medium text-gray-900">Plano de Ações de Mitigação</h4>
        </div>
        <button
          type="button"
          onClick={addMitigation}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Ação
        </button>
      </div>

      {data.mitigations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Nenhuma ação de mitigação definida</p>
          <p className="text-sm text-gray-400">Clique em "Adicionar Ação" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.mitigations.map((mitigation, index) => (
            <div key={mitigation.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(mitigation.priority)}`}>
                  Prioridade {mitigation.priority.charAt(0).toUpperCase() + mitigation.priority.slice(1)}
                </span>
                <button
                  type="button"
                  onClick={() => removeMitigation(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ação de Mitigação
                  </label>
                  <textarea
                    value={mitigation.action}
                    onChange={(e) => updateMitigation(index, { action: e.target.value })}
                    placeholder="Descreva a ação a ser tomada..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsável
                    </label>
                    <input
                      type="text"
                      value={mitigation.responsible}
                      onChange={(e) => updateMitigation(index, { responsible: e.target.value })}
                      placeholder="Nome do responsável"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prazo
                    </label>
                    <input
                      type="date"
                      value={mitigation.deadline}
                      onChange={(e) => updateMitigation(index, { deadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridade
                    </label>
                    <select
                      value={mitigation.priority}
                      onChange={(e) => updateMitigation(index, { priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="mitigations" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>
    </div>
  );
};