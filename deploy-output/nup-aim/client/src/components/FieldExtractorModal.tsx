import React, { useState, useEffect } from 'react';
import { FileText, Database, Code, Search, Download, X, Info, ExternalLink, Copy, CheckCircle, Filter, Save } from 'lucide-react';
import { extractFieldsFromData, analyzeFunctionPoints, ExtractedField, FunctionPointAnalysis } from '../utils/fieldExtractor';

interface FieldExtractorModalProps {
  screenshotData: string;
  processId: string;
  onClose: () => void;
  onSaveAnalysis?: (analysisText: string) => void;
}

export const FieldExtractorModal: React.FC<FieldExtractorModalProps> = ({ 
  screenshotData,
  processId,
  onClose,
  onSaveAnalysis
}) => {
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [analysis, setAnalysis] = useState<FunctionPointAnalysis | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'analysis' | 'export'>('fields');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterComplexity, setFilterComplexity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // Log function for detailed component logging
  const logProcessing = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] 📊 FieldExtractorModal: ${message}`;
    
    console.log(logMessage, data);
    setProcessingLogs(prev => [...prev, data ? `${logMessage} ${JSON.stringify(data)}` : logMessage]);
  };

  useEffect(() => {
    extractFields();
  }, [screenshotData]);

  const extractFields = async () => {
    setIsExtracting(true);
    logProcessing('Iniciando extração de campos a partir dos dados fornecidos');
    
    try {
      // Parse the screenshot data if it's a JSON string
      let fieldsData: ExtractedField[] = [];
      
      try {
        logProcessing('Tentando analisar dados como JSON');
        console.log('🔍 DEBUG - FieldExtractorModal - screenshotData:', screenshotData);
        fieldsData = JSON.parse(screenshotData);
        logProcessing(`Dados JSON analisados com sucesso, encontrados ${fieldsData.length} campos`);
        console.log('🔍 DEBUG - FieldExtractorModal - fieldsData após JSON.parse:', fieldsData);
      } catch (parseError) {
        logProcessing('Falha ao analisar como JSON, tentando extrair campos do texto', parseError);
        console.log('🔍 DEBUG - FieldExtractorModal - Erro ao analisar JSON:', parseError);
        // If parsing fails, try to extract fields from the data as text
        fieldsData = extractFieldsFromData(screenshotData);
        logProcessing(`Extração de texto concluída, encontrados ${fieldsData.length} campos`);
        console.log('🔍 DEBUG - FieldExtractorModal - fieldsData após extractFieldsFromData:', fieldsData);
      }
      
      setExtractedFields(fieldsData);
      
      // Analyze function points
      logProcessing('Iniciando análise de pontos de função');
      const fpAnalysis = analyzeFunctionPoints(fieldsData);
      logProcessing(`Análise de pontos de função concluída: ${fpAnalysis.totalFunctionPoints} pontos totais`);
      setAnalysis(fpAnalysis);
    } catch (error) {
      console.error('Error extracting fields:', error);
      logProcessing('Erro durante a extração de campos', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <span className="text-blue-600">Aa</span>;
      case 'number': return <span className="text-green-600">123</span>;
      case 'date': return <span className="text-purple-600">📅</span>;
      case 'select': return <span className="text-orange-600">▼</span>;
      case 'checkbox': return <span className="text-teal-600">☑</span>;
      case 'radio': return <span className="text-red-600">⚪</span>;
      case 'file': return <span className="text-gray-600">📎</span>;
      case 'email': return <span className="text-indigo-600">✉</span>;
      case 'url': return <span className="text-cyan-600">🔗</span>;
      case 'textarea': return <span className="text-amber-600">📝</span>;
      default: return <span className="text-gray-600">?</span>;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low': return 'text-green-600';
      case 'Average': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'entrada': return 'bg-blue-100 text-blue-800';
      case 'saida': return 'bg-purple-100 text-purple-800';
      case 'neutro': return 'bg-gray-100 text-gray-800';
      case 'derivado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'neutro': return 'Neutro';
      case 'derivado': return 'Derivado';
      default: return 'Não classificado';
    }
  };

  const filteredFields = extractedFields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (field.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || field.type === filterType;
    const matchesComplexity = filterComplexity === 'all' || field.complexity === filterComplexity;
    const matchesCategory = filterCategory === 'all' || field.fieldCategory === filterCategory;
    
    return matchesSearch && matchesType && matchesComplexity && matchesCategory;
  });

  console.log('🔍 DEBUG - FieldExtractorModal - filteredFields:', filteredFields);

  const exportToCSV = () => {
    if (!extractedFields.length) return;
    
    const headers = ['Name', 'Type', 'Complexity', 'FP Value', 'Category', 'Source', 'Description'];
    const rows = extractedFields.map(field => [
      field.name,
      field.type,
      field.complexity,
      field.fpValue.toString(),
      field.fieldCategory || 'neutro',
      field.source,
      field.description || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `function-point-fields-${processId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logProcessing('Dados exportados para CSV');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    logProcessing('Conteúdo copiado para a área de transferência');
  };

  const generateFPCountingReport = () => {
    if (!analysis) return '';
    
    return `# Function Point Analysis Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Fields Identified: ${analysis.totalFields}
- Total Function Points: ${analysis.totalFunctionPoints}

## Field Categories
- Input Fields (EI): ${analysis.detailedBreakdown.EI.total} (${analysis.detailedBreakdown.EI.fp} FP)
- Output Fields (EO): ${analysis.detailedBreakdown.EO.total} (${analysis.detailedBreakdown.EO.fp} FP)
- Query Fields (EQ): ${analysis.detailedBreakdown.EQ.total} (${analysis.detailedBreakdown.EQ.fp} FP)

## Detailed Breakdown

### External Inputs (EI)
- Low: ${analysis.detailedBreakdown.EI.low} × 3 = ${analysis.detailedBreakdown.EI.low * 3} FP
- Average: ${analysis.detailedBreakdown.EI.average} × 4 = ${analysis.detailedBreakdown.EI.average * 4} FP
- High: ${analysis.detailedBreakdown.EI.high} × 6 = ${analysis.detailedBreakdown.EI.high * 6} FP
- Total EI: ${analysis.detailedBreakdown.EI.total} (${analysis.detailedBreakdown.EI.fp} FP)

### External Outputs (EO)
- Low: ${analysis.detailedBreakdown.EO.low} × 4 = ${analysis.detailedBreakdown.EO.low * 4} FP
- Average: ${analysis.detailedBreakdown.EO.average} × 5 = ${analysis.detailedBreakdown.EO.average * 5} FP
- High: ${analysis.detailedBreakdown.EO.high} × 7 = ${analysis.detailedBreakdown.EO.high * 7} FP
- Total EO: ${analysis.detailedBreakdown.EO.total} (${analysis.detailedBreakdown.EO.fp} FP)

### External Inquiries (EQ)
- Low: ${analysis.detailedBreakdown.EQ.low} × 3 = ${analysis.detailedBreakdown.EQ.low * 3} FP
- Average: ${analysis.detailedBreakdown.EQ.average} × 4 = ${analysis.detailedBreakdown.EQ.average * 4} FP
- High: ${analysis.detailedBreakdown.EQ.high} × 6 = ${analysis.detailedBreakdown.EQ.high * 6} FP
- Total EQ: ${analysis.detailedBreakdown.EQ.total} (${analysis.detailedBreakdown.EQ.fp} FP)

### Internal Logical Files (ILF)
- Low: ${analysis.detailedBreakdown.ILF.low} × 7 = ${analysis.detailedBreakdown.ILF.low * 7} FP
- Average: ${analysis.detailedBreakdown.ILF.average} × 10 = ${analysis.detailedBreakdown.ILF.average * 10} FP
- High: ${analysis.detailedBreakdown.ILF.high} × 15 = ${analysis.detailedBreakdown.ILF.high * 15} FP
- Total ILF: ${analysis.detailedBreakdown.ILF.total} (${analysis.detailedBreakdown.ILF.fp} FP)

### External Interface Files (EIF)
- Low: ${analysis.detailedBreakdown.EIF.low} × 5 = ${analysis.detailedBreakdown.EIF.low * 5} FP
- Average: ${analysis.detailedBreakdown.EIF.average} × 7 = ${analysis.detailedBreakdown.EIF.average * 7} FP
- High: ${analysis.detailedBreakdown.EIF.high} × 10 = ${analysis.detailedBreakdown.EIF.high * 10} FP
- Total EIF: ${analysis.detailedBreakdown.EIF.total} (${analysis.detailedBreakdown.EIF.fp} FP)

## Field Details

${analysis.fields.map(field => `- ${field.name} (${field.type}, ${field.complexity}, ${field.fieldCategory || 'neutro'}): ${field.fpValue} FP`).join('\n')}

## Notes
- This analysis follows the IFPUG Function Point Counting Practices Manual
- Complexity ratings are based on field type and characteristics
- Function point values are assigned according to standard IFPUG weights
- Fields are classified as Input (EI), Output (EO), or Query (EQ)
`;
  };

  const getFunctionPointAnalysisText = () => {
    if (!analysis) return '';
    
    return `=== DADOS EXTRAÍDOS POR IA ===
Processo Elementar: EI (External Input)
Complexidade: ${analysis.detailedBreakdown.EI.high > analysis.detailedBreakdown.EI.average + analysis.detailedBreakdown.EI.low ? 'High' : 
              analysis.detailedBreakdown.EI.low > analysis.detailedBreakdown.EI.average + analysis.detailedBreakdown.EI.high ? 'Low' : 'Average'}
Total de Pontos de Função: ${analysis.totalFunctionPoints}

Campos Identificados:
${extractedFields.slice(0, 20).map(field => `- ${field.name} (${field.type}, ${field.complexity}, ${getCategoryLabel(field.fieldCategory)}): ${field.fpValue} FP`).join('\n')}
${extractedFields.length > 20 ? `\n... e mais ${extractedFields.length - 20} campos` : ''}

Distribuição por Categoria:
- Campos de Entrada (EI): ${analysis.detailedBreakdown.EI.total} (${analysis.detailedBreakdown.EI.fp} PF)
- Campos de Saída (EO): ${analysis.detailedBreakdown.EO.total} (${analysis.detailedBreakdown.EO.fp} PF)
- Campos de Consulta (EQ): ${analysis.detailedBreakdown.EQ.total} (${analysis.detailedBreakdown.EQ.fp} PF)`;
  };

  const handleSaveAnalysis = () => {
    if (onSaveAnalysis && analysis) {
      onSaveAnalysis(getFunctionPointAnalysisText());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      logProcessing('Análise salva no detalhamento');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Análise de Pontos de Função</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fields'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Campos Extraídos
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Análise de Pontos de Função
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Exportar Relatório
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isExtracting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Extraindo campos e analisando pontos de função...</p>
            </div>
          ) : (
            <>
              {activeTab === 'fields' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar campos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">Todos os Tipos</option>
                          <option value="text">Texto</option>
                          <option value="number">Número</option>
                          <option value="date">Data</option>
                          <option value="select">Select</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="radio">Radio</option>
                          <option value="file">Arquivo</option>
                          <option value="email">Email</option>
                          <option value="url">URL</option>
                          <option value="textarea">Área de Texto</option>
                        </select>
                      </div>
                      
                      <div>
                        <select
                          value={filterComplexity}
                          onChange={(e) => setFilterComplexity(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">Todas as Complexidades</option>
                          <option value="Low">Baixa</option>
                          <option value="Average">Média</option>
                          <option value="High">Alta</option>
                        </select>
                      </div>
                      
                      <div>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">Todas as Categorias</option>
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                          <option value="neutro">Neutro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Campos Extraídos Automaticamente</h4>
                      <p className="text-sm text-blue-800">
                        {extractedFields.length} campos foram identificados a partir dos dados fornecidos. 
                        Cada campo recebeu uma classificação de complexidade, categoria (entrada/saída) e um valor de pontos de função 
                        de acordo com as diretrizes do IFPUG.
                      </p>
                    </div>
                  </div>

                  {filteredFields.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome do Campo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Categoria
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Complexidade
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pontos de Função
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fonte
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredFields.map((field) => (
                            <tr key={field.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {field.name}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </div>
                                {field.description && (
                                  <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={field.description}>
                                    {field.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="mr-2">{getFieldTypeIcon(field.type)}</span>
                                  <span className="text-sm text-gray-900">{field.type}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getCategoryColor(field.fieldCategory)}`}>
                                  {getCategoryLabel(field.fieldCategory)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${getComplexityColor(field.complexity)}`}>
                                  {field.complexity}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {field.fpValue}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {field.source}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm || filterType !== 'all' || filterComplexity !== 'all' || filterCategory !== 'all'
                          ? 'Nenhum campo encontrado com esses filtros' 
                          : 'Nenhum campo extraído'}
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        {searchTerm || filterType !== 'all' || filterComplexity !== 'all' || filterCategory !== 'all'
                          ? 'Tente ajustar os critérios de busca ou filtros'
                          : 'Não foi possível extrair campos dos dados fornecidos. Tente fornecer mais detalhes ou outro formato de dados.'}
                      </p>
                    </div>
                  )}
                  
                  {/* Processing logs */}
                  {processingLogs.length > 0 && (
                    <div className="mt-4">
                      <details>
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center">
                          <Code className="w-4 h-4 mr-1" />
                          Ver logs de processamento ({processingLogs.length})
                        </summary>
                        <div className="mt-2 bg-gray-100 p-3 rounded-lg text-xs font-mono text-gray-800 max-h-40 overflow-y-auto">
                          {processingLogs.map((log, index) => (
                            <div key={index} className="py-1 border-b border-gray-200 last:border-0">
                              {log}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analysis' && analysis && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Resumo da Análise</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total de Campos:</span>
                          <span className="text-lg font-semibold text-blue-600">{analysis.totalFields}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total de Pontos de Função:</span>
                          <span className="text-xl font-bold text-blue-700">{analysis.totalFunctionPoints}</span>
                        </div>
                        <div className="h-1 bg-gray-200 rounded-full mt-2">
                          <div 
                            className="h-1 bg-blue-600 rounded-full" 
                            style={{ width: `${Math.min(100, (analysis.totalFunctionPoints / 200) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          Baseado no padrão IFPUG
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Categoria</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">{analysis.detailedBreakdown.EI.total}</div>
                          <div className="text-sm font-medium text-gray-600 mb-2">Entrada (EI)</div>
                          <div className="text-xs text-gray-500">{analysis.detailedBreakdown.EI.fp} PF</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600 mb-1">{analysis.detailedBreakdown.EO.total}</div>
                          <div className="text-sm font-medium text-gray-600 mb-2">Saída (EO)</div>
                          <div className="text-xs text-gray-500">{analysis.detailedBreakdown.EO.fp} PF</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600 mb-1">{analysis.detailedBreakdown.EQ.total}</div>
                          <div className="text-sm font-medium text-gray-600 mb-2">Consulta (EQ)</div>
                          <div className="text-xs text-gray-500">{analysis.detailedBreakdown.EQ.fp} PF</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhamento por Tipo e Complexidade</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {Object.entries(analysis.detailedBreakdown)
                        .filter(([type, data]) => data.total > 0)
                        .map(([type, data]) => (
                        <div key={type} className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center justify-between">
                            <span>{type}</span>
                            <span className="text-blue-600">{data.fp} PF</span>
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-green-600">Baixa:</span>
                              <span>{data.low} ({data.low * (type === 'EI' || type === 'EQ' ? 3 : type === 'EO' ? 4 : type === 'ILF' ? 7 : 5)} PF)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-yellow-600">Média:</span>
                              <span>{data.average} ({data.average * (type === 'EI' || type === 'EQ' ? 4 : type === 'EO' ? 5 : type === 'ILF' ? 10 : 7)} PF)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-600">Alta:</span>
                              <span>{data.high} ({data.high * (type === 'EI' || type === 'EQ' ? 6 : type === 'EO' ? 7 : type === 'ILF' ? 15 : 10)} PF)</span>
                            </div>
                          </div>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div 
                              className="h-1 bg-blue-600 rounded-full" 
                              style={{ width: `${data.total ? (data.fp / (data.total * 15) * 100) : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Categoria</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                          <span>Entrada</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                          <span>Saída</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
                          <span>Neutro</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {['text', 'number', 'date', 'select', 'checkbox', 'radio', 'file', 'email', 'url', 'textarea'].map(type => {
                        const fieldsOfType = extractedFields.filter(f => f.type === type);
                        if (fieldsOfType.length === 0) return null;
                        
                        const entradaCount = fieldsOfType.filter(f => f.fieldCategory === 'entrada').length;
                        const saidaCount = fieldsOfType.filter(f => f.fieldCategory === 'saida').length;
                        const neutroCount = fieldsOfType.filter(f => f.fieldCategory === 'neutro' || !f.fieldCategory).length;
                        const total = fieldsOfType.length;
                        
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="mr-2">{getFieldTypeIcon(type)}</span>
                                <span className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                              </div>
                              <span className="text-sm text-gray-500">{total} campo(s)</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                              {entradaCount > 0 && (
                                <div 
                                  className="h-full bg-blue-500" 
                                  style={{ width: `${(entradaCount / total) * 100}%` }}
                                  title={`${entradaCount} campo(s) de entrada`}
                                ></div>
                              )}
                              {saidaCount > 0 && (
                                <div 
                                  className="h-full bg-purple-500" 
                                  style={{ width: `${(saidaCount / total) * 100}%` }}
                                  title={`${saidaCount} campo(s) de saída`}
                                ></div>
                              )}
                              {neutroCount > 0 && (
                                <div 
                                  className="h-full bg-gray-500" 
                                  style={{ width: `${(neutroCount / total) * 100}%` }}
                                  title={`${neutroCount} campo(s) neutros`}
                                ></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900 mb-1">Sobre a Análise de Pontos de Função</h4>
                        <p className="text-sm text-yellow-800">
                          Esta análise segue as diretrizes do IFPUG (International Function Point Users Group) para contagem de pontos de função.
                          Os campos são classificados como Entradas Externas (EI), Saídas Externas (EO) ou Consultas Externas (EQ) com base em suas características.
                          A complexidade é determinada pelo tipo de campo e suas propriedades.
                        </p>
                        <div className="mt-2">
                          <a 
                            href="https://www.ifpug.org/about-ifpug/about-function-point-analysis/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Saiba mais sobre Análise de Pontos de Função
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'export' && analysis && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Relatório de Análise de Pontos de Função</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 relative">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto max-h-96">
                        {generateFPCountingReport()}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(generateFPCountingReport())}
                        className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors"
                        title="Copiar para área de transferência"
                      >
                        {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                      <button
                        onClick={() => copyToClipboard(generateFPCountingReport())}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Relatório
                      </button>
                      <button
                        onClick={exportToCSV}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar para CSV
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Código para Inserção no Documento</h3>
                      <button
                        onClick={handleSaveAnalysis}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        {saved ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Salvo!
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar no Detalhamento
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Este código será inserido no campo "Detalhamento do Trabalho" da funcionalidade para incluir a análise de pontos de função no documento exportado.
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 relative">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto max-h-40">
                        {getFunctionPointAnalysisText()}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(getFunctionPointAnalysisText())}
                        className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors"
                        title="Copiar para área de transferência"
                      >
                        {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">Como Utilizar</h4>
                          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
                            <li>Clique em "Salvar no Detalhamento" para adicionar automaticamente</li>
                            <li>Ou copie o código acima manualmente</li>
                            <li>O código será adicionado ao campo "Detalhamento do Trabalho"</li>
                            <li>Ao exportar para Word, a análise de pontos de função será incluída automaticamente</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Processing logs */}
                  {processingLogs.length > 0 && (
                    <div className="mt-4">
                      <details>
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center">
                          <Code className="w-4 h-4 mr-1" />
                          Ver logs de processamento ({processingLogs.length})
                        </summary>
                        <div className="mt-2 bg-gray-100 p-3 rounded-lg text-xs font-mono text-gray-800 max-h-40 overflow-y-auto">
                          {processingLogs.map((log, index) => (
                            <div key={index} className="py-1 border-b border-gray-200 last:border-0">
                              {log}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};