import React, { useState, useEffect, useRef } from 'react';
import { Image, Upload, X, Database, Download, Info, CheckCircle, Camera, AlertCircle, Copy, Code, Loader, Cpu, Zap, Eye, EyeOff } from 'lucide-react';
import { extractFieldsFromImage } from '../utils/imageFieldExtractor';
import { ExtractedField } from '../utils/imageFieldExtractor';
import { FieldExtractorModal } from './FieldExtractorModal';

interface ImageFieldExtractorProps {
  onClose: () => void;
}

export const ImageFieldExtractor: React.FC<ImageFieldExtractorProps> = ({ onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFieldExtractor, setShowFieldExtractor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [rawJsonVisible, setRawJsonVisible] = useState(false);
  const [extractionSource, setExtractionSource] = useState<'regex' | 'ia' | null>(null);
  const [processingSteps, setProcessingSteps] = useState<{
    step: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
  }[]>([
    { step: 'Captura e seleção imagem', status: 'pending' },
    { step: 'Envio para API de OCR', status: 'pending' },
    { step: 'Campos retornados da API', status: 'pending' }
  ]);
  const [showProcessingLog, setShowProcessingLog] = useState(false);
  const [showExtractedFields, setShowExtractedFields] = useState(true);
  const [fieldsDisplayLimit, setFieldsDisplayLimit] = useState(10);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const updateProcessingStep = (stepIndex: number, status: 'pending' | 'processing' | 'success' | 'error', message?: string) => {
    setProcessingSteps(prev => prev.map((step, idx) => 
      idx === stepIndex ? { ...step, status, message } : step
    ));
  };

  const resetProcessingSteps = () => {
    setProcessingSteps([
      { step: 'Captura e seleção imagem', status: 'pending' },
      { step: 'Envio para API de OCR', status: 'pending' },
      { step: 'Campos retornados da API', status: 'pending' }
    ]);
    setShowProcessingLog(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setError(null);
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          setSelectedImage(imageData);
          processImage(imageData);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Por favor, selecione apenas arquivos de imagem.');
        setSelectedImage(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setError(null);
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          setSelectedImage(imageData);
          processImage(imageData);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Por favor, selecione apenas arquivos de imagem.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    setApiStatus('idle');
    setRawJsonVisible(false);
    setExtractionSource(null);
    resetProcessingSteps();
    setShowProcessingLog(true);
    setExtractedFields([]);

    // Store original fetch outside try/catch for cleanup
    const originalFetch = window.fetch;

    try {
      // Step 1: Capture and select image
      updateProcessingStep(0, 'processing', 'Componente ImageFieldExtractor capturou imagem');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
      
      // Calculate image size
      const imageSize = Math.round((imageData.length * 3) / 4 / 1024);
      const format = imageData.startsWith('data:image/png') ? 'PNG' : 
                    imageData.startsWith('data:image/jpeg') ? 'JPEG' : 
                    imageData.startsWith('data:image/') ? imageData.split(';')[0].replace('data:', '') : 
                    'Desconhecido';
      
      updateProcessingStep(0, 'success', `Imagem capturada: ${format}, ${imageSize} KB`);
      console.log('📸 ETAPA 1 - CAPTURA E SELEÇÃO DE IMAGEM: Componente ImageFieldExtractor capturou imagem');
      console.log(`   Formato: ${format}`);
      console.log(`   Tamanho aproximado: ${imageSize} KB`);

      // Step 2: Send to extraction API
      updateProcessingStep(1, 'processing', 'Conectando com o serviço de extração...');
      console.log('📤 ETAPA 2 - ENVIO PARA API DE OCR: Enviando imagem para processamento');
      console.log(`   Método: POST`);
      console.log(`   URL: /api/vision-ocr`);
      console.log(`   Headers: Content-Type: application/json`);
      console.log(`   Corpo: { "imageBase64": "[BASE64_STRING_TRUNCADA]" }`);
      console.log(`   Tamanho da imagem: ${imageSize} KB`);
      
      // Create a custom event listener to capture network requests
      window.fetch = async (...args) => {
        const [url] = args;
        
        // Check if this is a call to our extraction API
        if (url.toString().includes('extract-fields') || url.toString().includes('vision-ocr')) {
          const endpoint = url.toString().split('/').pop();
          updateProcessingStep(1, 'success', `Conectado ao endpoint: ${endpoint}`);
          
          const response = await originalFetch(...args);
          
          // Clone the response to read it twice
          const clonedResponse = response.clone();
          
          try {
            const responseData = await clonedResponse.json();
            
            // Step 3: Process returned fields
            updateProcessingStep(2, 'processing', 'Processando campos extraídos...');
            
            if (responseData.success || responseData.status === 'success') {
              
              // Check extraction method and count fields
              if (responseData.fonte === 'regex' || responseData.campos) {
                const fieldCount = Object.keys(responseData.campos || {}).filter(k => !k.endsWith('_categoria')).length;
                updateProcessingStep(2, 'success', `${fieldCount} campos encontrados via Regex`);
                setExtractionSource('regex');
              } else if (responseData.fonte === 'ia') {
                const fieldCount = Object.keys(responseData.campos || {}).filter(k => !k.endsWith('_categoria')).length;
                updateProcessingStep(2, 'success', `${fieldCount} campos encontrados via IA`);
                setExtractionSource('ia');
              } else if (responseData.textElements) {
                const fieldCount = responseData.textElements.length;
                updateProcessingStep(2, 'success', `${fieldCount} elementos de texto extraídos`);
              }
              
              console.log('📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Processamento concluído');
              if (responseData.campos) {
                const fieldCount = Object.keys(responseData.campos).filter(k => !k.endsWith('_categoria')).length;
                console.log(`   Total de campos extraídos: ${fieldCount}`);
                console.log(`   Fonte de extração: ${responseData.fonte || 'Desconhecida'}`);
                
                // Show distribution by category
                const categorias = {
                  entrada: 0,
                  saida: 0,
                  neutro: 0,
                  derivado: 0
                };
                
                Object.keys(responseData.campos).forEach(key => {
                  if (key.endsWith('_categoria')) {
                    const categoria = responseData.campos[key] as 'entrada' | 'saida' | 'neutro' | 'derivado';
                    if (categoria === 'entrada' || categoria === 'saida' || categoria === 'neutro' || categoria === 'derivado') {
                      categorias[categoria] = (categorias[categoria] || 0) + 1;
                    }
                  }
                });
                
                console.log(`   Distribuição por categoria:`);
                console.log(`   - Entrada: ${categorias.entrada || 0}`);
                console.log(`   - Saída: ${categorias.saida || 0}`);
                console.log(`   - Neutro: ${categorias.neutro || 0}`);
                console.log(`   - Derivado: ${categorias.derivado || 0}`);
              } else if (responseData.textElements) {
                console.log(`   Total de elementos extraídos: ${responseData.textElements.length}`);
                console.log(`   Texto completo: ${responseData.fullText?.substring(0, 100)}${responseData.fullText?.length > 100 ? '...' : ''}`);
              }
            } else {
              updateProcessingStep(2, 'error', responseData.message || responseData.error || 'Falha na extração de campos');
              console.log('📥 ETAPA 3 - CAMPOS RETORNADOS DA API: Erro na extração');
              console.log(`   Erro: ${responseData.message || responseData.error || 'Falha na extração de campos'}`);
            }
          } catch (parseError) {
            updateProcessingStep(2, 'error', 'Erro ao processar resposta da API');
            console.error('Erro ao processar resposta JSON:', parseError);
          }
          
          return response;
        }
        
        return originalFetch(...args);
      };

      // Call the extraction function
      const fields = await extractFieldsFromImage(imageData);
      
      // Restore original fetch
      window.fetch = originalFetch;
      
      setExtractedFields(fields);
      setApiStatus('success');
    } catch (error: any) {
      console.error('❌ Componente ImageFieldExtractor: Erro na extração:', error);
      setError(error.message || 'Erro ao processar a imagem. Tente novamente com outra imagem.');
      setApiStatus('error');
      setExtractedFields([]);
      
      // Update processing steps to show error
      const currentStep = processingSteps.findIndex(step => step.status === 'processing');
      if (currentStep >= 0) {
        updateProcessingStep(currentStep, 'error', error.message);
      }
      
      // Restore original fetch if needed
      if (window.fetch !== originalFetch) {
        window.fetch = originalFetch;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL
        const imageData = canvas.toDataURL('image/jpeg');
        setSelectedImage(imageData);
        processImage(imageData);
        
        // Stop camera
        stopCamera();
      }
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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'pending': return <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>;
      case 'processing': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>;
    }
  };

  const exportToCSV = () => {
    if (!extractedFields.length) return;
    
    const headers = ['Name', 'Type', 'Complexity', 'FP Value', 'Category', 'Required', 'Description', 'Source'];
    const rows = extractedFields.map(field => [
      field.name,
      field.type,
      field.complexity,
      field.fpValue.toString(),
      field.fieldCategory || 'neutro',
      field.required ? 'Yes' : 'No',
      field.description || '',
      field.source || 'OCR'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracted-fields-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJsonToClipboard = () => {
    try {
      const jsonString = JSON.stringify(extractedFields, null, 2);
      navigator.clipboard.writeText(jsonString);
      setCopied(true);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'JSON copiado para a área de transferência!';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Erro ao copiar para a área de transferência.');
    }
  };

  const toggleRawJson = () => {
    setRawJsonVisible(!rawJsonVisible);
  };

  const toggleExtractedFields = () => {
    setShowExtractedFields(!showExtractedFields);
  };

  const showMoreFields = () => {
    setFieldsDisplayLimit(prev => prev + 10);
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
      default: return 'Neutro';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Image className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Extração de Campos com IA</h2>
              <p className="text-sm text-gray-600">Extraia campos de formulários automaticamente usando OCR e IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload de Imagem
            </h3>
            <p className="text-sm text-gray-600">
              Faça upload de uma imagem contendo um formulário ou tela de sistema. 
              O sistema irá analisar a imagem e extrair automaticamente os campos identificados.
            </p>
          </div>

          {showCamera ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full max-h-[50vh] object-contain mx-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={captureImage}
                    className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-gray-800"></div>
                  </button>
                </div>
              </div>
              
              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{cameraError}</p>
                </div>
              )}
              
              <div className="flex justify-between">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <p className="text-sm text-gray-500 italic">
                  Clique no botão central para capturar a imagem
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Image Upload Area */}
              {!selectedImage ? (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-gray-400 bg-gray-50"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Arraste uma imagem aqui ou clique para selecionar
                      </p>
                      <p className="text-sm text-gray-600">
                        Formatos suportados: JPG, PNG, GIF, BMP
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </button>
                      <button
                        onClick={startCamera}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Usar Câmera
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Image Preview */}
                  <div className="relative">
                    <img 
                      src={selectedImage} 
                      alt="Selected" 
                      className="max-h-[40vh] mx-auto object-contain rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setExtractedFields([]);
                        setApiStatus('idle');
                        setRawJsonVisible(false);
                        resetProcessingSteps();
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remover imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Processing Log */}
                  {showProcessingLog && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          Log de Processamento
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {processingSteps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3">
                            {getStepIcon(step.status)}
                            <div className="flex-1">
                              <div className={`font-medium ${
                                step.status === 'processing' ? 'text-blue-600' :
                                step.status === 'success' ? 'text-green-600' :
                                step.status === 'error' ? 'text-red-600' :
                                'text-gray-500'
                              }`}>
                                {step.step}
                              </div>
                              {step.message && (
                                <div className="text-sm text-gray-600">{step.message}</div>
                              )}
                            </div>
                            {step.status === 'success' && index === 1 && extractionSource === 'regex' && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <Zap className="w-3 h-3" />
                                Regex
                              </div>
                            )}
                            {step.status === 'success' && index === 2 && extractionSource === 'ia' && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                <Cpu className="w-3 h-3" />
                                IA
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Processing Status */}
                  {isProcessing ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <p className="text-gray-600">Processando imagem e extraindo campos...</p>
                    </div>
                  ) : (
                    <>
                      {/* API Status */}
                      {apiStatus !== 'idle' && (
                        <div className={`p-4 rounded-lg ${
                          apiStatus === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-start gap-3">
                            {apiStatus === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <h4 className={`font-medium ${
                                apiStatus === 'success' ? 'text-green-900' : 'text-red-900'
                              } mb-1`}>
                                {apiStatus === 'success' 
                                  ? `Extração concluída com ${extractionSource === 'regex' ? 'Regex' : 'IA'}` 
                                  : 'Erro ao extrair campos'}
                              </h4>
                              <p className={`text-sm ${
                                apiStatus === 'success' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {apiStatus === 'success' 
                                  ? `${extractedFields.length} campos foram identificados na imagem.` 
                                  : error || 'Ocorreu um erro ao processar a imagem.'}
                              </p>
                              {apiStatus === 'success' && extractionSource && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-sm text-gray-700">Método de extração:</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    extractionSource === 'regex' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {extractionSource === 'regex' ? (
                                      <>
                                        <Zap className="w-3 h-3" />
                                        Regex (rápido)
                                      </>
                                    ) : (
                                      <>
                                        <Cpu className="w-3 h-3" />
                                        IA (avançado)
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Extracted Fields Display - NEW SECTION */}
                      {apiStatus === 'success' && extractedFields.length > 0 && (
                        <div className="bg-white border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              <Database className="w-5 h-5 text-blue-600" />
                              Campos Extraídos ({extractedFields.length})
                            </h4>
                            <button
                              onClick={toggleExtractedFields}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {showExtractedFields ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          
                          {showExtractedFields && (
                            <>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nome
                                      </th>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                      </th>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Categoria
                                      </th>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Complexidade
                                      </th>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        FP
                                      </th>
                                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fonte
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {extractedFields.slice(0, fieldsDisplayLimit).map((field) => (
                                      <tr key={field.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">
                                            {field.name}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <span className="mr-2">{getFieldTypeIcon(field.type)}</span>
                                            <span className="text-sm text-gray-900">{field.type}</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(field.fieldCategory)}`}>
                                            {getCategoryLabel(field.fieldCategory)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`text-sm font-medium ${getComplexityColor(field.complexity)}`}>
                                            {field.complexity}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {field.fpValue}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {field.source}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {extractedFields.length > fieldsDisplayLimit && (
                                <div className="mt-3 text-center">
                                  <button
                                    onClick={showMoreFields}
                                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    Mostrar mais campos ({extractedFields.length - fieldsDisplayLimit} restantes)
                                  </button>
                                </div>
                              )}
                              
                              <div className="mt-3 flex justify-end">
                                <div className="text-xs text-gray-500">
                                  Total de pontos de função: <span className="font-bold">{extractedFields.reduce((sum, field) => sum + field.fpValue, 0)}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Raw JSON View */}
                      {apiStatus === 'success' && extractedFields.length > 0 && rawJsonVisible && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">JSON Extraído</h4>
                            <button
                              onClick={copyJsonToClipboard}
                              className="inline-flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto max-h-60">
                            {JSON.stringify(extractedFields, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 justify-end">
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setExtractedFields([]);
                            setApiStatus('idle');
                            setRawJsonVisible(false);
                            resetProcessingSteps();
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Limpar
                        </button>
                        
                        {extractedFields.length > 0 && (
                          <>
                            <button
                              onClick={toggleRawJson}
                              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <Code className="w-4 h-4 mr-2" />
                              {rawJsonVisible ? 'Ocultar JSON' : 'Mostrar JSON'}
                            </button>
                            
                            <button
                              onClick={copyJsonToClipboard}
                              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar JSON
                            </button>
                            
                            <button
                              onClick={exportToCSV}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Exportar CSV
                            </button>
                            
                            <button
                              onClick={() => setShowFieldExtractor(true)}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Database className="w-4 h-4 mr-2" />
                              Análise Detalhada
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && !isProcessing && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Information Box */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Como Funciona
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">1</div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Captura e Seleção de Imagem</p>
                  <p className="text-xs text-gray-600">O componente ImageFieldExtractor captura a imagem do formulário ou tela</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">2</div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Envio para API de OCR</p>
                  <p className="text-xs text-gray-600">A imagem é enviada para processamento OCR (Reconhecimento Óptico de Caracteres)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">3</div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Campos Retornados da API</p>
                  <p className="text-xs text-gray-600">Os campos são classificados como Entrada, Saída ou Neutro com base em seu contexto</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Nota: A precisão da extração depende da qualidade da imagem. Imagens nítidas e bem enquadradas produzem melhores resultados.
            </p>
          </div>
        </div>

        {/* Field Extractor Modal */}
        {showFieldExtractor && (
          <FieldExtractorModal
            screenshotData={JSON.stringify(extractedFields)}
            processId="image-extraction"
            onClose={() => setShowFieldExtractor(false)}
            onSaveAnalysis={() => {}}
          />
        )}
      </div>
    </div>
  );
};