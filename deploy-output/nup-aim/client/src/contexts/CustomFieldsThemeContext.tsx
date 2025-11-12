import React, { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Custom Fields Theme Configuration
 * 
 * Define valores customizados para CSS variables dos campos personalizados.
 * Pode ser usado para customizar estilos por página, seção ou componente.
 */
export interface CustomFieldsTheme {
  // Cores
  borderColor?: string;
  borderFocus?: string;
  borderError?: string;
  backgroundColor?: string;
  backgroundDisabled?: string;
  backgroundHover?: string;
  textColor?: string;
  textPlaceholder?: string;
  labelColor?: string;
  helpTextColor?: string;
  errorTextColor?: string;
  
  // Espaçamento
  paddingX?: string;
  paddingY?: string;
  gap?: string;
  sectionGap?: string;
  
  // Tipografia
  fontSize?: string;
  labelFontSize?: string;
  labelFontWeight?: string | number;
  helpFontSize?: string;
  
  // Bordas e cantos
  borderWidth?: string;
  borderRadius?: string;
  
  // Efeitos
  focusRingWidth?: string;
  focusRingColor?: string;
  transition?: string;
  
  // Estados
  disabledOpacity?: number;
}

interface CustomFieldsThemeContextValue {
  theme: CustomFieldsTheme;
  setTheme: (theme: CustomFieldsTheme) => void;
}

const CustomFieldsThemeContext = createContext<CustomFieldsThemeContextValue | null>(null);

/**
 * Hook para acessar e modificar o tema dos campos personalizados
 */
export const useCustomFieldsTheme = () => {
  const context = useContext(CustomFieldsThemeContext);
  if (!context) {
    // Se não houver provider, retorna um objeto vazio (usa defaults do CSS)
    return {
      theme: {},
      setTheme: () => {
        console.warn('[CustomFieldsTheme] ThemeProvider não encontrado. Use <CustomFieldsThemeProvider> para customizar temas.');
      }
    };
  }
  return context;
};

interface CustomFieldsThemeProviderProps {
  theme?: CustomFieldsTheme;
  children: React.ReactNode;
  /**
   * Aplicar tema apenas a um elemento específico (via ref)
   * Se não fornecido, aplica ao container do provider
   */
  scope?: 'global' | 'local';
}

/**
 * Provider de tema para campos personalizados
 * 
 * @example
 * ```tsx
 * // Tema global
 * <CustomFieldsThemeProvider theme={{ borderColor: '#e5e7eb' }}>
 *   <App />
 * </CustomFieldsThemeProvider>
 * 
 * // Tema por seção
 * <CustomFieldsThemeProvider theme={{ borderColor: '#3b82f6' }} scope="local">
 *   <ImpactsForm />
 * </CustomFieldsThemeProvider>
 * ```
 */
export const CustomFieldsThemeProvider: React.FC<CustomFieldsThemeProviderProps> = ({
  theme = {},
  children,
  scope = 'local'
}) => {
  const [currentTheme, setCurrentTheme] = React.useState<CustomFieldsTheme>(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Atualiza tema quando props mudam
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);
  
  // Aplica CSS variables ao container
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    
    const cssVarMap: Record<keyof CustomFieldsTheme, string> = {
      borderColor: '--custom-field-border-color',
      borderFocus: '--custom-field-border-focus',
      borderError: '--custom-field-border-error',
      backgroundColor: '--custom-field-bg',
      backgroundDisabled: '--custom-field-bg-disabled',
      backgroundHover: '--custom-field-bg-hover',
      textColor: '--custom-field-text-color',
      textPlaceholder: '--custom-field-text-placeholder',
      labelColor: '--custom-field-label-color',
      helpTextColor: '--custom-field-help-text-color',
      errorTextColor: '--custom-field-error-text',
      paddingX: '--custom-field-padding-x',
      paddingY: '--custom-field-padding-y',
      gap: '--custom-field-gap',
      sectionGap: '--custom-field-section-gap',
      fontSize: '--custom-field-font-size',
      labelFontSize: '--custom-field-label-font-size',
      labelFontWeight: '--custom-field-label-font-weight',
      helpFontSize: '--custom-field-help-font-size',
      borderWidth: '--custom-field-border-width',
      borderRadius: '--custom-field-border-radius',
      focusRingWidth: '--custom-field-focus-ring-width',
      focusRingColor: '--custom-field-focus-ring-color',
      transition: '--custom-field-transition',
      disabledOpacity: '--custom-field-disabled-opacity',
    };
    
    // Aplicar CSS variables
    Object.entries(currentTheme).forEach(([key, value]) => {
      const cssVar = cssVarMap[key as keyof CustomFieldsTheme];
      if (cssVar && value !== undefined) {
        element.style.setProperty(cssVar, String(value));
      }
    });
    
    // Cleanup: remover CSS variables quando desmontar
    return () => {
      Object.values(cssVarMap).forEach(cssVar => {
        element.style.removeProperty(cssVar);
      });
    };
  }, [currentTheme]);
  
  const contextValue: CustomFieldsThemeContextValue = {
    theme: currentTheme,
    setTheme: setCurrentTheme
  };
  
  return (
    <CustomFieldsThemeContext.Provider value={contextValue}>
      <div 
        ref={containerRef}
        data-custom-fields-theme-scope={scope}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
    </CustomFieldsThemeContext.Provider>
  );
};

/**
 * Detecta estilos de um input de referência e retorna tema correspondente
 * Útil para herdar estilos de campos existentes automaticamente
 * 
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * const theme = useDetectedTheme(inputRef);
 * 
 * <input ref={inputRef} className="..." />
 * <CustomFieldsThemeProvider theme={theme}>
 *   <CustomFieldsSection />
 * </CustomFieldsThemeProvider>
 * ```
 */
export const useDetectedTheme = (
  referenceElement: React.RefObject<HTMLElement> | null
): CustomFieldsTheme => {
  const [detectedTheme, setDetectedTheme] = React.useState<CustomFieldsTheme>({});
  
  useEffect(() => {
    if (!referenceElement?.current) return;
    
    const element = referenceElement.current;
    const styles = window.getComputedStyle(element);
    
    const theme: CustomFieldsTheme = {
      borderColor: styles.borderColor,
      backgroundColor: styles.backgroundColor,
      textColor: styles.color,
      fontSize: styles.fontSize,
      borderRadius: styles.borderRadius,
      paddingX: styles.paddingLeft,
      paddingY: styles.paddingTop,
    };
    
    setDetectedTheme(theme);
  }, [referenceElement]);
  
  return detectedTheme;
};
