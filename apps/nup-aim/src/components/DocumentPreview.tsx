import React from 'react';
import { ImpactAnalysis } from '../types';
import { FileText, Calendar, User, Building, Image } from 'lucide-react';

interface DocumentPreviewProps {
  data: ImpactAnalysis;
}

interface ImageData {
  id: string;
  base64: string;
  name: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      baixo: 'bg-green-100 text-green-800',
      medio: 'bg-yellow-100 text-yellow-800',
      alto: 'bg-orange-100 text-orange-800',
      critico: 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      nova: 'bg-green-100 text-green-800',
      alterada: 'bg-yellow-100 text-yellow-800',
      excluida: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      nova: 'Nova',
      alterada: 'Alterada',
      excluida: 'Excluída'
    };
    return labels[status as keyof typeof labels] || status;
  };

  // Parse image data from stored string
  const parseImageData = (data: string): { images: ImageData[], text: string } => {
    if (!data) return { images: [], text: '' };
    
    const lines = data.split('\n');
    const images: ImageData[] = [];
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
  
  // Parse function point analysis from work details
  const parseFunctionPointAnalysis = (workDetails: string | undefined) => {
    if (!workDetails) return null;
    
    // Check if there's extracted data
    if (!workDetails.includes('=== DADOS EXTRAÍDOS POR IA ===')) return null;
    
    const extractedDataSection = workDetails.split('=== DADOS EXTRAÍDOS POR IA ===')[1];
    if (!extractedDataSection) return null;
    
    // Parse the data
    const processTypeMatch = extractedDataSection.match(/Processo Elementar: (\w+) \(([^)]+)\)/);
    const complexityMatch = extractedDataSection.match(/Complexidade: (\w+)/);
    const totalFPMatch = extractedDataSection.match(/Total de Pontos de Função: (\d+)/);
    
    if (!processTypeMatch || !complexityMatch || !totalFPMatch) return null;
    
    return {
      processType: processTypeMatch[1],
      processTypeDescription: processTypeMatch[2],
      complexity: complexityMatch[1],
      totalFunctionPoints: parseInt(totalFPMatch[1], 10)
    };
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 break-words">
              {data.title || 'Análise de Impacto'}
            </h1>
            <p className="text-sm text-gray-500">Documento de Análise de Impacto</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 flex-shrink-0">Projeto:</span>
            <span className="font-medium truncate">{data.project || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 flex-shrink-0">Autor:</span>
            <span className="font-medium truncate">{data.author || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 flex-shrink-0">Data:</span>
            <span className="font-medium">{formatDate(data.date)}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 flex-shrink-0">Versão:</span>
            <span className="font-medium">{data.version || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Descrição</h2>
          <p className="text-gray-700 leading-relaxed break-words">{data.description}</p>
        </div>
      )}

      {/* Scope */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Escopo</h2>
        
        {data.scope.processes.length > 0 ? (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Funcionalidades Impactadas</h3>
            <div className="space-y-4">
              {data.scope.processes.map((process, index) => {
                const { images, text } = parseImageData(process.screenshots || '');
                const fpAnalysis = parseFunctionPointAnalysis(process.workDetails);
                
                return (
                  <div key={process.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <h4 className="font-medium text-gray-900 break-words flex-1 min-w-0">{process.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusBadge(process.status)}`}>
                        {getStatusLabel(process.status)}
                      </span>
                    </div>
                    
                    {process.status === 'alterada' && process.websisCreated !== undefined && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-600 break-words">
                          <strong>Websis criou/alterou antes:</strong> {process.websisCreated ? 'SIM' : 'NÃO'}
                        </span>
                      </div>
                    )}
                    
                    {fpAnalysis && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-800 mb-1">Análise de Pontos de Função</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-blue-600 font-medium">Processo:</span>{' '}
                            <span className="text-blue-800">{fpAnalysis.processType} ({fpAnalysis.processTypeDescription})</span>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Complexidade:</span>{' '}
                            <span className="text-blue-800">{fpAnalysis.complexity}</span>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Pontos de Função:</span>{' '}
                            <span className="text-blue-800 font-bold">{fpAnalysis.totalFunctionPoints}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(process.status !== '' && 
                      (process.status !== 'alterada' || process.websisCreated !== undefined)) && (
                      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        {process.workDetails && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Detalhamento do Trabalho:</h5>
                            <p className="text-sm text-gray-600 break-words whitespace-pre-line">{process.workDetails}</p>
                          </div>
                        )}
                        
                        {(text || images.length > 0) && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                              <Image className="w-4 h-4" />
                              Prints das Telas:
                            </h5>
                            
                            {text && (
                              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3 break-words">
                                {text}
                              </div>
                            )}
                            
                            {images.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {images.map((image) => (
                                  <div key={image.id} className="relative group">
                                    <img
                                      src={image.base64}
                                      alt={image.name}
                                      className="w-full h-32 object-cover rounded border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={() => {
                                        // Open image in new window for full view
                                        const newWindow = window.open();
                                        if (newWindow) {
                                          newWindow.document.write(`
                                            <html>
                                              <head><title>${image.name}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
                                                <img src="${image.base64}" alt="${image.name}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                                              </body>
                                            </html>
                                          `);
                                        }
                                      }}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b truncate">
                                      {image.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">Nenhuma funcionalidade definida no escopo.</p>
        )}
      </div>

      {/* Impacts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Análise de Impactos</h2>
        <div className="space-y-6">
          {['business', 'technical', 'operational', 'financial'].map((category) => {
            const impacts = data.impacts[category as keyof typeof data.impacts];
            const titles = {
              business: 'Impactos de Negócio',
              technical: 'Impactos Técnicos',
              operational: 'Impactos Operacionais',
              financial: 'Impactos Financeiros'
            };
            
            if (impacts.length === 0) return null;
            
            return (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {titles[category as keyof typeof titles]}
                </h3>
                <div className="space-y-3">
                  {impacts.map((impact, index) => (
                    <div key={impact.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-800 mb-2 break-words">{impact.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(impact.severity)}`}>
                          {impact.severity.charAt(0).toUpperCase() + impact.severity.slice(1)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(impact.probability)}`}>
                          Prob: {impact.probability.charAt(0).toUpperCase() + impact.probability.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risks */}
      {data.risks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Matriz de Riscos</h2>
          <div className="space-y-4">
            {data.risks.map((risk, index) => (
              <div key={risk.id} className="border border-gray-200 rounded-lg p-4">
                <p className="text-gray-800 mb-2 font-medium break-words">{risk.description}</p>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(risk.impact)}`}>
                    Impacto: {risk.impact.charAt(0).toUpperCase() + risk.impact.slice(1)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(risk.probability)}`}>
                    Prob: {risk.probability.charAt(0).toUpperCase() + risk.probability.slice(1)}
                  </span>
                </div>
                {risk.mitigation && (
                  <p className="text-sm text-gray-600 break-words">
                    <strong>Mitigação:</strong> {risk.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mitigations */}
      {data.mitigations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Plano de Mitigação</h2>
          <div className="space-y-4">
            {data.mitigations.map((mitigation, index) => (
              <div key={mitigation.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <p className="text-gray-800 font-medium break-words flex-1 min-w-0">{mitigation.action}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getSeverityBadge(mitigation.priority)}`}>
                    {mitigation.priority.charAt(0).toUpperCase() + mitigation.priority.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <p className="break-words"><strong>Responsável:</strong> {mitigation.responsible}</p>
                  <p><strong>Prazo:</strong> {formatDate(mitigation.deadline)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conclusions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conclusões e Recomendações</h2>
        
        {data.conclusions.summary && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Resumo Executivo</h3>
            <p className="text-gray-700 leading-relaxed break-words">{data.conclusions.summary}</p>
          </div>
        )}
        
        {data.conclusions.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Recomendações</h3>
            <ul className="space-y-2">
              {data.conclusions.recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="break-words">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {data.conclusions.nextSteps.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Próximos Passos</h3>
            <ul className="space-y-2">
              {data.conclusions.nextSteps.map((step, index) => (
                <li key={index} className="text-gray-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="break-words">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};