import React, { useState, useRef, useEffect } from 'react';
import { Image, X, Upload, Database, Calculator } from 'lucide-react';
import { extractFieldsFromData, ExtractedField } from '../utils/fieldExtractor';
import { extractFieldsFromImage } from '../utils/imageFieldExtractor';
import { FieldExtractorModal } from './FieldExtractorModal';

interface ImagePasteFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onExtractFields?: (fields: ExtractedField[]) => void;
  autoExtractEnabled?: boolean;
}

interface ImageData {
  id: string;
  base64: string;
  name: string;
}

export const ImagePasteField: React.FC<ImagePasteFieldProps> = ({ 
  value, 
  onChange, 
  placeholder = "Cole aqui as imagens ou links das telas que foram impactadas...",
  onExtractFields,
  autoExtractEnabled = true
}) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [textContent, setTextContent] = useState('');
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [showExtractedFields, setShowExtractedFields] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showFieldExtractor, setShowFieldExtractor] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse existing value on component mount and when value changes
  useEffect(() => {
    if (value) {
      const { images: parsedImages, text } = parseImageData(value);
      setImages(parsedImages);
      setTextContent(text);
      
      // Automatically extract fields when content changes
      if (text || parsedImages.length > 0) {
        const fields = extractFieldsFromData(value);
        setExtractedFields(fields);
        if (onExtractFields) {
          onExtractFields(fields);
        }
      }
    }
  }, [value]);

  // Parse image data from stored string
  const parseImageData = (data: string): { images: ImageData[], text: string } => {
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

  // Serialize image data to string
  const serializeData = (images: ImageData[], text: string): string => {
    const parts: string[] = [];
    
    if (text.trim()) {
      parts.push(text.trim());
    }
    
    images.forEach(image => {
      parts.push(`IMAGE_DATA:${JSON.stringify(image)}`);
    });
    
    return parts.join('\n');
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImageItem = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        hasImageItem = true;
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processImageFile(file);
        }
      }
    }

    // If no image was pasted, let the default text paste behavior happen
    if (!hasImageItem) {
      // The default paste behavior will update the textarea
      setTimeout(() => {
        if (textareaRef.current) {
          setTextContent(textareaRef.current.value);
          const newValue = serializeData(images, textareaRef.current.value);
          onChange(newValue);
          
          // Automatically extract fields
          const fields = extractFieldsFromData(newValue);
          setExtractedFields(fields);
          if (onExtractFields) {
            onExtractFields(fields);
          }
        }
      }, 0);
    }
  };

  const processImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const newImage: ImageData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        base64: base64,
        name: file.name || `Imagem ${images.length + 1}`
      };
      
      const newImages = [...images, newImage];
      setImages(newImages);
      
      // Update the combined value
      const newValue = serializeData(newImages, textContent);
      onChange(newValue);
      
      // Automatically extract fields from the image if enabled
      if (autoExtractEnabled) {
        setIsExtracting(true);
        try {
          console.log(`🔍 Extraindo campos da imagem: ${newImage.name}`);
          const imageFields = await extractFieldsFromImage(base64);
          console.log(`✅ Extração concluída: ${imageFields.length} campos encontrados`);
          
          // Combine with existing fields
          const allFields = [...extractedFields, ...imageFields];
          // Deduplicate fields by name
          const uniqueFields = allFields.filter((field, index, self) => 
            index === self.findIndex(f => f.name === field.name)
          );
          
          setExtractedFields(uniqueFields);
          if (onExtractFields) {
            onExtractFields(uniqueFields);
          }
          
          // Show extracted fields automatically if we found some
          if (imageFields.length > 0) {
            setShowExtractedFields(true);
          }
        } catch (error) {
          console.error('Error extracting fields from image:', error);
        } finally {
          setIsExtracting(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextContent(newText);
    
    // Update the combined value
    const newValue = serializeData(images, newText);
    onChange(newValue);
    
    // Automatically extract fields
    const fields = extractFieldsFromData(newValue);
    setExtractedFields(fields);
    if (onExtractFields) {
      onExtractFields(fields);
    }
  };

  const removeImage = (imageId: string) => {
    const newImages = images.filter(img => img.id !== imageId);
    setImages(newImages);
    
    // Update the combined value
    const newValue = serializeData(newImages, textContent);
    onChange(newValue);
    
    // Automatically extract fields
    const fields = extractFieldsFromData(newValue);
    setExtractedFields(fields);
    if (onExtractFields) {
      onExtractFields(fields);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await processImageFile(file);
      }
    }

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          await processImageFile(file);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleExtractedFields = () => {
    setShowExtractedFields(!showExtractedFields);
  };

  const handleAnalyzeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      setSelectedImageData(image.base64);
      setShowFieldExtractor(true);
    }
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return 'Aa';
      case 'number': return '123';
      case 'date': return '📅';
      case 'select': return '▼';
      case 'checkbox': return '☑';
      case 'radio': return '⚪';
      case 'file': return '📎';
      case 'email': return '✉';
      case 'url': return '🔗';
      case 'textarea': return '📝';
      default: return '?';
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        ref={textareaRef}
        value={textContent}
        onChange={handleTextChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Image className="w-4 h-4" />
          <span>Pressione Ctrl+V para colar imagens, arraste e solte, ou use o botão para upload</span>
        </div>
        
        <label className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded cursor-pointer hover:bg-blue-700 transition-colors">
          <Upload className="w-3 h-3 mr-1" />
          Upload
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {isExtracting && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Extraindo campos das imagens...</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <h6 className="text-sm font-medium text-gray-700">Imagens Anexadas ({images.length}):</h6>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.base64}
                  alt={image.name}
                  className="w-full h-20 object-cover rounded border border-gray-200 shadow-sm"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleAnalyzeImage(image.id)}
                    className="p-1 bg-blue-500 text-white rounded-full mx-1"
                    title="Analisar imagem"
                  >
                    <Calculator className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="p-1 bg-red-500 text-white rounded-full mx-1"
                    title="Remover imagem"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b truncate">
                  {image.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {extractedFields.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={toggleExtractedFields}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Database className="w-4 h-4" />
            {showExtractedFields ? 'Ocultar campos extraídos' : `Mostrar ${extractedFields.length} campos extraídos automaticamente`}
          </button>
          
          {showExtractedFields && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h6 className="text-sm font-medium text-blue-800 mb-2">Campos Extraídos Automaticamente:</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {extractedFields.slice(0, 9).map((field) => (
                  <div key={field.id} className="text-xs bg-white p-2 rounded border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-gray-900">{field.name}</div>
                      {field.fieldCategory === 'derivado' && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Derivado
                        </span>
                      )}
                    </div>
                    {(field as any).value && (
                      <div className="text-gray-700 mb-1 italic">
                        "{(field as any).value}"
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="text-blue-600">{getFieldTypeIcon(field.type)}</span>
                        <span>{field.type}</span>
                      </span>
                      <span className={
                        field.complexity === 'Low' ? 'text-green-600' : 
                        field.complexity === 'High' ? 'text-red-600' : 
                        'text-yellow-600'
                      }>
                        {field.complexity}
                      </span>
                    </div>
                  </div>
                ))}
                {extractedFields.length > 9 && (
                  <div className="text-xs bg-gray-100 p-2 rounded border border-gray-200 flex items-center justify-center">
                    <span className="text-gray-600">+{extractedFields.length - 9} campos</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                Use o botão "Análise de Pontos de Função" para ver todos os campos e realizar a análise completa.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Extractor Modal */}
      {showFieldExtractor && (
        <FieldExtractorModal
          screenshotData={selectedImageData}
          processId="image-extraction"
          onClose={() => setShowFieldExtractor(false)}
          onSaveAnalysis={() => {}}
        />
      )}
    </div>
  );
};