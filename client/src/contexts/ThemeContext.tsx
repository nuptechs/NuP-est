import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Definição dos temas disponíveis
export type ThemeName = 'blue-modern' | 'green-nature' | 'purple-premium' | 'orange-energy';
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  secondaryDark: string;
  success: string;
  successHover: string;
  successLight: string;
  warning: string;
  warningHover: string;
  warningLight: string;
  error: string;
  errorHover: string;
  errorLight: string;
  info: string;
  infoHover: string;
  infoLight: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: ThemeColors;
}

// Definição das paletas de cores dos temas
const themes: Record<ThemeName, Theme> = {
  'blue-modern': {
    name: 'blue-modern',
    displayName: 'Azul Moderno',
    description: 'Paleta azul profissional e moderna',
    colors: {
      primary: '#0078d4',
      primaryHover: '#106ebe',
      primaryLight: '#deecf9',
      primaryDark: '#004578',
      secondary: '#5c2d91',
      secondaryHover: '#6b2d9c',
      secondaryLight: '#eae4f0',
      secondaryDark: '#3d1d5c',
      success: '#13a10e',
      successHover: '#107c0a',
      successLight: '#dff6dd',
      warning: '#ff8c00',
      warningHover: '#e67e00',
      warningLight: '#fff4e6',
      error: '#d13438',
      errorHover: '#b22a2e',
      errorLight: '#fde7e8',
      info: '#00b4d8',
      infoHover: '#0096c7',
      infoLight: '#e6f7fb',
    }
  },
  'green-nature': {
    name: 'green-nature',
    displayName: 'Verde Natureza',
    description: 'Paleta verde inspirada na natureza',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      primaryLight: '#dcfce7',
      primaryDark: '#15803d',
      secondary: '#059669',
      secondaryHover: '#047857',
      secondaryLight: '#d1fae5',
      secondaryDark: '#064e3b',
      success: '#10b981',
      successHover: '#059669',
      successLight: '#d1fae5',
      warning: '#f59e0b',
      warningHover: '#d97706',
      warningLight: '#fef3c7',
      error: '#ef4444',
      errorHover: '#dc2626',
      errorLight: '#fecaca',
      info: '#06b6d4',
      infoHover: '#0891b2',
      infoLight: '#cffafe',
    }
  },
  'purple-premium': {
    name: 'purple-premium',
    displayName: 'Roxo Premium',
    description: 'Paleta roxa elegante e sofisticada',
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryLight: '#ede9fe',
      primaryDark: '#5b21b6',
      secondary: '#ec4899',
      secondaryHover: '#db2777',
      secondaryLight: '#fce7f3',
      secondaryDark: '#be185d',
      success: '#10b981',
      successHover: '#059669',
      successLight: '#d1fae5',
      warning: '#f59e0b',
      warningHover: '#d97706',
      warningLight: '#fef3c7',
      error: '#f43f5e',
      errorHover: '#e11d48',
      errorLight: '#fecdd3',
      info: '#06b6d4',
      infoHover: '#0891b2',
      infoLight: '#cffafe',
    }
  },
  'orange-energy': {
    name: 'orange-energy',
    displayName: 'Laranja Energia',
    description: 'Paleta laranja vibrante e energética',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryLight: '#fed7aa',
      primaryDark: '#c2410c',
      secondary: '#dc2626',
      secondaryHover: '#b91c1c',
      secondaryLight: '#fecaca',
      secondaryDark: '#991b1b',
      success: '#16a34a',
      successHover: '#15803d',
      successLight: '#dcfce7',
      warning: '#eab308',
      warningHover: '#ca8a04',
      warningLight: '#fef08a',
      error: '#dc2626',
      errorHover: '#b91c1c',
      errorLight: '#fecaca',
      info: '#0ea5e9',
      infoHover: '#0284c7',
      infoLight: '#e0f2fe',
    }
  }
};

interface ThemeContextType {
  currentTheme: Theme;
  currentMode: ThemeMode;
  setTheme: (themeName: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(() => {
    // Recuperar tema salvo do localStorage ou usar padrão
    const savedTheme = localStorage.getItem('nup-theme') as ThemeName;
    return savedTheme && themes[savedTheme] ? savedTheme : 'blue-modern';
  });

  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    // Recuperar modo salvo do localStorage ou usar padrão
    const savedMode = localStorage.getItem('nup-mode') as ThemeMode;
    return savedMode || 'light';
  });

  const currentTheme = themes[currentThemeName];
  const availableThemes = Object.values(themes);

  // Aplicar as variáveis CSS quando o tema ou modo muda
  useEffect(() => {
    const applyThemeVariables = (colors: ThemeColors) => {
      const root = document.documentElement;
      
      // Aplicar cores do tema às variáveis CSS
      root.style.setProperty('--nup-primary', colors.primary);
      root.style.setProperty('--nup-primary-hover', colors.primaryHover);
      root.style.setProperty('--nup-primary-light', colors.primaryLight);
      root.style.setProperty('--nup-primary-dark', colors.primaryDark);
      
      root.style.setProperty('--nup-secondary', colors.secondary);
      root.style.setProperty('--nup-secondary-hover', colors.secondaryHover);
      root.style.setProperty('--nup-secondary-light', colors.secondaryLight);
      root.style.setProperty('--nup-secondary-dark', colors.secondaryDark);
      
      root.style.setProperty('--nup-success', colors.success);
      root.style.setProperty('--nup-success-hover', colors.successHover);
      root.style.setProperty('--nup-success-light', colors.successLight);
      
      root.style.setProperty('--nup-warning', colors.warning);
      root.style.setProperty('--nup-warning-hover', colors.warningHover);
      root.style.setProperty('--nup-warning-light', colors.warningLight);
      
      root.style.setProperty('--nup-error', colors.error);
      root.style.setProperty('--nup-error-hover', colors.errorHover);
      root.style.setProperty('--nup-error-light', colors.errorLight);
      
      root.style.setProperty('--nup-info', colors.info);
      root.style.setProperty('--nup-info-hover', colors.infoHover);
      root.style.setProperty('--nup-info-light', colors.infoLight);
    };

    applyThemeVariables(currentTheme.colors);
  }, [currentTheme]);

  // Aplicar o modo dark/light ao documento
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', currentMode === 'dark');
  }, [currentMode]);

  const setTheme = (themeName: ThemeName) => {
    setCurrentThemeName(themeName);
    localStorage.setItem('nup-theme', themeName);
  };

  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    localStorage.setItem('nup-mode', mode);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, currentMode, setTheme, setMode, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};