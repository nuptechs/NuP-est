import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, Database, Calculator } from 'lucide-react';
import { ImpactAnalysis, ProcessItem } from '../types';
import { ImagePasteField } from './ImagePasteField';
import { useAuth } from '../contexts/ApiAuthContext';
import { FieldExtractorModal } from './FieldExtractorModal';
import { ExtractedField } from '../utils/fieldExtractor';
import { CustomFieldsSection } from './CustomFieldsSection';

interface ScopeFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const ScopeForm: React.FC<ScopeFormProps> = ({ 
  data, 
  onChange,
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const { hasPermission } = useAuth();
  const [editingProcess, setEditingProcess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFieldExtractor, setShowFieldExtractor] = useState(false);
  const [selectedScreenshotData, setSelectedScreenshotData] = useState<string>('');
  const [extractedFieldsMap, setExtractedFieldsMap] = useState<Record<string, ExtractedField[]>>({});
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);

  const addProcess = () => {
    const newProcess: ProcessItem = {
      id: Date.now().toString(),
      name: '',
      status: 'nova',
      workDetails: '',
      screenshots: '',
      websisCreated: undefined
    };

    onChange({
      scope: {
        processes: [...data.scope.processes, newProcess]
      }
    });

    setEditingProcess(newProcess.id);
    setShowForm(true);
  };

  const updateProcess = (index: number, updates: Partial<ProcessItem>) => {
    const updatedProcesses = [...data.scope.processes];
    updatedProcesses[index] = { ...updatedProcesses[index], ...updates };

    onChange({
      scope: {
        processes: updatedProcesses
      }
    });
  };

  const removeProcess = (index: number) => {
    onChange({
      scope: {
        processes: data.scope.processes.filter((_, i) => i !== index)
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nova': return 'bg-green-100 text-green-800 border-green-200';
      case 'alterada': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excluida': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nova': return 'Nova';
      case 'alterada': return 'Alte';
      case 'excluida': return 'Excl';
      default: return status;
    }
  };

  const shouldShowAdditionalFields = (process: ProcessItem) => {
    return process.status !== '';
  };

  const shouldShowWebsisQuestion = (process: ProcessItem) => {
    return process.status === 'alterada';
  };

  const shouldShowWorkDetailsAndScreenshots = (process: ProcessItem) => {
    if (process.status === 'nova' || process.status === 'excluida') {
      return true;
    }
    if (process.status === 'alterada') {
      return process.websisCreated !== undefined;
    }
    return false;
  };

  const isProcessComplete = (process: ProcessItem) => {
    if (!process.name.trim()) return false;
    if (process.status === 'alterada' && process.websisCreated === undefined) return false;
    return true;
  };

  const handleSaveProcess = (processId: string) => {
    const process = data.scope.processes.find(p => p.id === processId);
    if (process && isProcessComplete(process)) {
      setEditingProcess(null);
      setShowForm(false);
    }
  };

  const handleEditProcess = (processId: string) => {
    setEditingProcess(processId);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    // Remove incomplete processes when canceling
    const incompleteProcesses = data.scope.processes.filter(p => 
      p.id === editingProcess && !isProcessComplete(p)
    );
    
    if (incompleteProcesses.length > 0) {
      onChange({
        scope: {
          processes: data.scope.processes.filter(p => p.id !== editingProcess)
        }
      });
    }
    
    setEditingProcess(null);
    setShowForm(false);
  };

  const handleExtractedFields = (processId: string, fields: ExtractedField[]) => {
    setExtractedFieldsMap(prev => ({
      ...prev,
      [processId]: fields
    }));

    // If auto-extract is enabled and we have fields, automatically analyze them
    if (autoExtractEnabled && fields.length > 0) {
      const process = data.scope.processes.find(p => p.id === processId);
      if (process && process.screenshots) {
        const { images } = parseImageData(process.screenshots);
        if (images.length > 0) {
          // Use the first image for analysis
          handleAnalyzeFunctionPoints(processId);
        }
      }
    }
  };

  const parseImageData = (data: string): { images: ImageData[], text: string } => {
    if (!data) return { images: [], text: '' };
    
    const lines = data.split('\n');
    const images: any[] = [];
    const textLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('IMAGE_DATA:')) {
        try {
          const imageJson = line.replace('IMAGE_DATA:', '');
          const imageData = JSON.parse(imageJson);
          images.push(imageData);
        } catch (error) {
          console.error('Error parsing image data:', error);
        }
      } else if (line.trim() && !line.startsWith('[Imagem ')) {
        textLines.push(line);
      }
    }

    return { images, text: textLines.join('\n') };
  };

  const handleAnalyzeFunctionPoints = (processId: string) => {
    const process = data.scope.processes.find(p => p.id === processId);
    if (process) {
      setSelectedScreenshotData(process.screenshots || '');
      setSelectedProcessId(processId);
      setShowFieldExtractor(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header with Add Button */}
      <div className="sticky top-0 bg-white z-20 py-4 border-b border-gray-200 -mx-6 px-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">Funcionalidades Impactadas</h4>
          <button
            type="button"
            onClick={addProcess}
            disabled={editingProcess !== null}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Funcionalidade
          </button>
        </div>
      </div>

      {/* Functionality Tags */}
      {data.scope.processes.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-gray-700">Funcionalidades Cadastradas:</h5>
          <div className="flex flex-wrap gap-2">
            {data.scope.processes.map((process, index) => (
              <div
                key={process.id}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor(process.status)} min-w-[200px]`}
              >
                <span 
                  className="font-mono text-xs flex-1 truncate" 
                  title={process.name}
                  style={{ minWidth: '140px' }}
                >
                  {process.name}
                </span>
                <span className="text-xs opacity-75 font-mono w-8 text-center">
                  {getStatusLabel(process.status)}
                </span>
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={() => handleEditProcess(process.id)}
                    disabled={editingProcess !== null}
                    className="text-current hover:opacity-70 transition-opacity disabled:opacity-30"
                    title="Editar funcionalidade"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProcess(index)}
                    disabled={editingProcess !== null}
                    className="text-current hover:opacity-70 transition-opacity disabled:opacity-30"
                    title="Remover funcionalidade"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form for editing/adding functionality */}
      {showForm && editingProcess && (
        <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-medium text-gray-900">
              {data.scope.processes.find(p => p.id === editingProcess)?.name ? 'Editar' : 'Nova'} Funcionalidade
            </h5>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProcess(editingProcess)}
                disabled={!isProcessComplete(data.scope.processes.find(p => p.id === editingProcess)!)}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 mr-1" />
                Salvar
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </button>
            </div>
          </div>

          {(() => {
            const processIndex = data.scope.processes.findIndex(p => p.id === editingProcess);
            const process = data.scope.processes[processIndex];
            
            if (!process) return null;

            return (
              <div className="space-y-4 bg-white rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Funcionalidade *
                  </label>
                  <input
                    type="text"
                    value={process.name}
                    onChange={(e) => updateProcess(processIndex, { name: e.target.value })}
                    placeholder="Ex: Funcionalidade de Aprovação de Documentos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status da Funcionalidade *
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: 'nova', label: 'Nova' },
                      { value: 'alterada', label: 'Alterada' },
                      { value: 'excluida', label: 'Excluída' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name={`status-${process.id}`}
                          value={option.value}
                          checked={process.status === option.value}
                          onChange={(e) => updateProcess(processIndex, { 
                            status: e.target.value as any,
                            websisCreated: undefined // Reset websis question when status changes
                          })}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {shouldShowAdditionalFields(process) && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    {shouldShowWebsisQuestion(process) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          A Websis criou/alterou essa funcionalidade antes? *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`websis-${process.id}`}
                              value="sim"
                              checked={process.websisCreated === true}
                              onChange={() => updateProcess(processIndex, { websisCreated: true })}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">SIM</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`websis-${process.id}`}
                              value="nao"
                              checked={process.websisCreated === false}
                              onChange={() => updateProcess(processIndex, { websisCreated: false })}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">NÃO</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {shouldShowWorkDetailsAndScreenshots(process) && (
                      <div className="space-y-4 border-t border-gray-100 pt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Detalhamento do Trabalho Realizado
                          </label>
                          <textarea
                            value={process.workDetails || ''}
                            onChange={(e) => updateProcess(processIndex, { workDetails: e.target.value })}
                            placeholder="Descreva detalhadamente o trabalho realizado nesta funcionalidade..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Prints das Telas Impactadas
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAnalyzeFunctionPoints(process.id)}
                                disabled={!process.screenshots}
                                className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                                title="Realizar análise de pontos de função"
                              >
                                <Calculator className="w-3 h-3 mr-1" />
                                Análise de Pontos de Função
                              </button>
                              <label className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={autoExtractEnabled}
                                  onChange={(e) => setAutoExtractEnabled(e.target.checked)}
                                  className="mr-1 text-blue-600 focus:ring-blue-500"
                                />
                                Extração automática
                              </label>
                            </div>
                          </div>
                          <ImagePasteField
                            value={process.screenshots || ''}
                            onChange={(value) => {
                              updateProcess(processIndex, { screenshots: value });
                            }}
                            onExtractFields={(fields) => handleExtractedFields(process.id, fields)}
                            autoExtractEnabled={autoExtractEnabled}
                            placeholder="Cole aqui as imagens das telas impactadas usando Ctrl+V ou descreva as telas em texto..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {data.scope.processes.length === 0 && !showForm && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhuma funcionalidade adicionada</p>
          <p className="text-sm text-gray-400">Clique em "Adicionar Funcionalidade" para começar</p>
        </div>
      )}

      {/* Field Extractor Modal */}
      {showFieldExtractor && selectedProcessId && (
        <FieldExtractorModal
          screenshotData={selectedScreenshotData}
          processId={selectedProcessId}
          onClose={() => {
            setShowFieldExtractor(false);
            setSelectedProcessId(null);
          }}
          onSaveAnalysis={(analysisText) => {
            if (selectedProcessId) {
              const processIndex = data.scope.processes.findIndex(p => p.id === selectedProcessId);
              if (processIndex !== -1) {
                const currentWorkDetails = data.scope.processes[processIndex].workDetails || '';
                const newWorkDetails = currentWorkDetails + (currentWorkDetails ? '\n\n' : '') + analysisText;
                updateProcess(processIndex, { workDetails: newWorkDetails });
              }
            }
          }}
        />
      )}
      
      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="scope" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>
    </div>
  );
};