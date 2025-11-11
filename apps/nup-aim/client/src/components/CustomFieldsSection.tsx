import React from 'react';
import { useCustomFields } from '../hooks/useCustomFields';
import { Loader2 } from 'lucide-react';

/**
 * Props para customização de estilos individuais
 */
export interface CustomFieldsStyleProps {
  /** Classe CSS para o container principal */
  className?: string;
  /** Classe CSS para cada wrapper de campo */
  fieldWrapperClassName?: string;
  /** Classe CSS para labels */
  labelClassName?: string;
  /** Classe CSS para inputs */
  inputClassName?: string;
  /** Classe CSS para textareas */
  textareaClassName?: string;
  /** Classe CSS para selects */
  selectClassName?: string;
  /** Classe CSS para checkboxes */
  checkboxClassName?: string;
  /** Classe CSS para texto de ajuda */
  helpTextClassName?: string;
  /** Classe CSS para texto de erro */
  errorTextClassName?: string;
}

/**
 * Render prop para customização completa da renderização
 */
export type CustomFieldRenderer = (field: any, value: any, onChange: (value: any) => void) => React.ReactNode;

interface CustomFieldsSectionProps extends CustomFieldsStyleProps {
  sectionName: string;
  analysisId?: string;
  onValuesChange?: (values: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  
  /** Render prop para customizar renderização de campos */
  renderField?: CustomFieldRenderer;
  
  /** Se true, usa apenas Tailwind (sem CSS variables) */
  useTailwindOnly?: boolean;
}

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  sectionName,
  analysisId,
  onValuesChange,
  initialValues = {},
  className = '',
  fieldWrapperClassName = '',
  labelClassName = '',
  inputClassName = '',
  textareaClassName = '',
  selectClassName = '',
  checkboxClassName = '',
  helpTextClassName = '',
  errorTextClassName = '',
  renderField: customRenderField,
  useTailwindOnly = false
}) => {
  const { fields, values, loading, error } = useCustomFields(sectionName, analysisId);
  
  // Track which fields have been edited by the user
  const userEditedFieldsRef = React.useRef<Set<string>>(new Set());
  
  // Compute current values by merging all sources with proper priority
  const currentValues = React.useMemo(() => {
    const merged: Record<string, any> = {};
    
    // Base layer: values from microservice
    Object.assign(merged, values);
    
    // Second layer: initialValues from parent (localStorage)
    Object.assign(merged, initialValues);
    
    // Top layer: preserve user edits
    // (will be added when user types via handleFieldChange)
    
    return merged;
  }, [values, initialValues]);
  
  // Local state for user edits only
  const [userEdits, setUserEdits] = React.useState<Record<string, any>>({});
  const prevAnalysisIdRef = React.useRef(analysisId);
  
  // Clear user edits and propagation cache when switching to a different analysis
  React.useEffect(() => {
    if (prevAnalysisIdRef.current !== analysisId) {
      setUserEdits({});
      userEditedFieldsRef.current.clear();
      lastEmittedValuesRef.current = ''; // Reset to allow re-propagation
      prevAnalysisIdRef.current = analysisId;
    }
  }, [analysisId]);
  
  // Track last emitted values to prevent unnecessary propagation
  const lastEmittedValuesRef = React.useRef<string>('');
  
  // Merge user edits into current values
  const displayValues = React.useMemo(() => {
    return { ...currentValues, ...userEdits };
  }, [currentValues, userEdits]);
  React.useEffect(() => {
    if (onValuesChange && Object.keys(displayValues).length > 0) {
      const currentJson = JSON.stringify(displayValues);
      if (currentJson !== lastEmittedValuesRef.current) {
        lastEmittedValuesRef.current = currentJson;
        onValuesChange(displayValues);
      }
    }
  }, [displayValues, onValuesChange]);

  const handleFieldChange = (fieldId: string, value: any) => {
    // Mark this field as user-edited
    userEditedFieldsRef.current.add(fieldId);
    
    // Update user edits
    const newUserEdits = { ...userEdits, [fieldId]: value };
    setUserEdits(newUserEdits);
    
    // Compute full values and notify parent
    if (onValuesChange) {
      const fullValues = { ...currentValues, ...newUserEdits };
      onValuesChange(fullValues);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500" data-testid="custom-fields-loading">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Carregando campos personalizados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-gray-400 py-2" data-testid="custom-fields-error">
        Não foi possível carregar campos personalizados.
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  const renderField = (field: any) => {
    // Se customRenderField foi fornecido, tenta usar ele
    if (customRenderField) {
      const customResult = customRenderField(
        field,
        displayValues[field.id] || '',
        (value) => handleFieldChange(field.id, value)
      );
      
      // Se retornou algo (não null/undefined), usa o resultado customizado
      // Se retornou null/undefined, cai no fallback padrão abaixo
      if (customResult !== null && customResult !== undefined) {
        return customResult;
      }
    }
    
    // Renderização padrão (fallback ou quando customRenderField não fornecido)
    // Classes base (CSS variables ou Tailwind)
    const baseInputClass = useTailwindOnly
      ? 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
      : 'custom-field-input';
    
    const commonProps = {
      id: field.id,
      name: field.name,
      required: field.required,
      value: displayValues[field.id] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        handleFieldChange(field.id, e.target.value);
      }
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={4}
            className={textareaClassName || baseInputClass}
            data-testid={`custom-field-${field.name}`}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            className={selectClassName || baseInputClass}
            data-testid={`custom-field-${field.name}`}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        const baseCheckboxClass = useTailwindOnly
          ? 'w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2'
          : 'w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2'; // Checkbox mantém Tailwind
        
        return (
          <input
            type="checkbox"
            id={field.id}
            name={field.name}
            checked={displayValues[field.id] === 'true' || displayValues[field.id] === true}
            onChange={(e) => handleFieldChange(field.id, e.target.checked)}
            className={checkboxClassName || baseCheckboxClass}
            data-testid={`custom-field-${field.name}`}
          />
        );

      case 'date':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'text':
      default:
        return (
          <input
            type={field.type}
            {...commonProps}
            placeholder={field.placeholder}
            className={inputClassName || baseInputClass}
            data-testid={`custom-field-${field.name}`}
          />
        );
    }
  };

  // Classes base para container e wrappers
  const baseContainerClass = useTailwindOnly ? 'space-y-4' : 'custom-fields-section';
  const baseWrapperClass = useTailwindOnly ? 'space-y-2' : 'custom-field-wrapper';
  const baseLabelClass = useTailwindOnly ? 'block text-sm font-medium text-gray-700' : 'custom-field-label';
  const baseHelpClass = useTailwindOnly ? 'text-xs text-gray-500 mt-1' : 'custom-field-help-text';
  
  return (
    <div className={`${baseContainerClass} ${className}`.trim()} data-testid="custom-fields-section">
      {fields.map(field => (
        <div key={field.id} className={fieldWrapperClassName || baseWrapperClass}>
          <label
            htmlFor={field.id}
            className={labelClassName || baseLabelClass}
          >
            {field.label}
            {field.required && <span className="custom-field-required">*</span>}
          </label>
          
          {renderField(field)}
          
          {field.help_text && (
            <p className={helpTextClassName || baseHelpClass}>
              {field.help_text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
