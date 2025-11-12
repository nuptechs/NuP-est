import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { ImpactAnalysis, ProcessItem } from '../types';
import { generateNewId, saveAnalysis } from '../utils/storage';

interface CopyAnalysisModalProps {
  sourceAnalysis: ImpactAnalysis;
  onComplete: (newAnalysis: ImpactAnalysis) => void;
  onClose: () => void;
}

interface CopyOptions {
  basicInfo: boolean;
  scope: boolean;
  additionalInfo: boolean;
  selectedProcesses: string[];
}

export const CopyAnalysisModal: React.FC<CopyAnalysisModalProps> = ({
  sourceAnalysis,
  onComplete,
  onClose
}) => {
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    basicInfo: true,
    scope: false,
    additionalInfo: false,
    selectedProcesses: []
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleOptionChange = (option: keyof Omit<CopyOptions, 'selectedProcesses'>, value: boolean) => {
    setCopyOptions(prev => ({
      ...prev,
      [option]: value,
      // Reset selected processes if scope is unchecked
      selectedProcesses: option === 'scope' && !value ? [] : prev.selectedProcesses
    }));
  };

  const handleProcessSelection = (processId: string, selected: boolean) => {
    setCopyOptions(prev => ({
      ...prev,
      selectedProcesses: selected
        ? [...prev.selectedProcesses, processId]
        : prev.selectedProcesses.filter(id => id !== processId)
    }));
  };

  const handleSelectAllProcesses = () => {
    const allProcessIds = sourceAnalysis.scope.processes.map(p => p.id);
    setCopyOptions(prev => ({
      ...prev,
      selectedProcesses: prev.selectedProcesses.length === allProcessIds.length ? [] : allProcessIds
    }));
  };

  const createCopiedAnalysis = (): ImpactAnalysis => {
    const newAnalysis: ImpactAnalysis = {
      id: generateNewId(),
      title: '',
      description: '',
      author: '',
      date: new Date().toISOString().split('T')[0],
      version: '1.0',
      project: '',
      scope: {
        processes: []
      },
      impacts: {
        business: [],
        technical: [],
        operational: [],
        financial: []
      },
      risks: [],
      mitigations: [],
      conclusions: {
        summary: '',
        recommendations: [],
        nextSteps: []
      }
    };

    // Copy basic info
    if (copyOptions.basicInfo) {
      newAnalysis.title = `${sourceAnalysis.title} - Cópia`;
      newAnalysis.description = sourceAnalysis.description;
      newAnalysis.author = sourceAnalysis.author;
      newAnalysis.project = sourceAnalysis.project;
      newAnalysis.version = sourceAnalysis.version;
    }

    // Copy scope
    if (copyOptions.scope && copyOptions.selectedProcesses.length > 0) {
      const selectedProcesses = sourceAnalysis.scope.processes.filter(
        process => copyOptions.selectedProcesses.includes(process.id)
      );
      
      newAnalysis.scope.processes = selectedProcesses.map(process => ({
        ...process,
        id: generateNewId() // Generate new ID for copied process
      }));
    }

    // Copy additional info
    if (copyOptions.additionalInfo) {
      newAnalysis.impacts = {
        business: sourceAnalysis.impacts.business.map(impact => ({
          ...impact,
          id: generateNewId()
        })),
        technical: sourceAnalysis.impacts.technical.map(impact => ({
          ...impact,
          id: generateNewId()
        })),
        operational: sourceAnalysis.impacts.operational.map(impact => ({
          ...impact,
          id: generateNewId()
        })),
        financial: sourceAnalysis.impacts.financial.map(impact => ({
          ...impact,
          id: generateNewId()
        }))
      };

      newAnalysis.risks = sourceAnalysis.risks.map(risk => ({
        ...risk,
        id: generateNewId()
      }));

      newAnalysis.mitigations = sourceAnalysis.mitigations.map(mitigation => ({
        ...mitigation,
        id: generateNewId()
      }));

      newAnalysis.conclusions = {
        summary: sourceAnalysis.conclusions.summary,
        recommendations: [...sourceAnalysis.conclusions.recommendations],
        nextSteps: [...sourceAnalysis.conclusions.nextSteps]
      };
    }

    return newAnalysis;
  };

  const handleCopy = async () => {
    setIsProcessing(true);
    
    try {
      const newAnalysis = createCopiedAnalysis();
      saveAnalysis(newAnalysis);
      onComplete(newAnalysis);
    } catch (error) {
      console.error('Erro ao copiar análise:', error);
      alert('Erro ao copiar a análise. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidSelection = () => {
    if (!copyOptions.basicInfo && !copyOptions.scope && !copyOptions.additionalInfo) {
      return false;
    }
    
    if (copyOptions.scope && copyOptions.selectedProcesses.length === 0) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Copy className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Copiar Análise</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Copiando de: {sourceAnalysis.title}
            </h3>
            <p className="text-sm text-gray-600">
              Selecione quais seções você deseja copiar para a nova análise:
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={copyOptions.basicInfo}
                  onChange={(e) => handleOptionChange('basicInfo', e.target.checked)}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Dados Básicos</span>
                  <p className="text-sm text-gray-600">
                    Número da PA, projeto, autor, descrição e versão
                  </p>
                </div>
              </label>
            </div>

            {/* Scope */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={copyOptions.scope}
                  onChange={(e) => handleOptionChange('scope', e.target.checked)}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Escopo</span>
                  <p className="text-sm text-gray-600">
                    Funcionalidades impactadas ({sourceAnalysis.scope.processes.length} disponíveis)
                  </p>
                </div>
              </label>

              {copyOptions.scope && sourceAnalysis.scope.processes.length > 0 && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Selecionar funcionalidades:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllProcesses}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {copyOptions.selectedProcesses.length === sourceAnalysis.scope.processes.length
                        ? 'Desmarcar todas'
                        : 'Selecionar todas'
                      }
                    </button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {sourceAnalysis.scope.processes.map((process) => (
                      <label key={process.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={copyOptions.selectedProcesses.includes(process.id)}
                          onChange={(e) => handleProcessSelection(process.id, e.target.checked)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-900">{process.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({process.status.charAt(0).toUpperCase() + process.status.slice(1)})
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={copyOptions.additionalInfo}
                  onChange={(e) => handleOptionChange('additionalInfo', e.target.checked)}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Informações Adicionais</span>
                  <p className="text-sm text-gray-600">
                    Análise de impactos, matriz de riscos, plano de mitigação e conclusões
                  </p>
                </div>
              </label>
            </div>
          </div>

          {!isValidSelection() && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Selecione pelo menos uma seção para copiar.
                {copyOptions.scope && copyOptions.selectedProcesses.length === 0 && 
                  ' Se escolher copiar o escopo, selecione pelo menos uma funcionalidade.'
                }
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCopy}
            disabled={!isValidSelection() || isProcessing}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Copiando...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Análise
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};