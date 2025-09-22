import { useState, useEffect } from 'react';

// Hook para responsividade inteligente de textos
export const useResponsiveText = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Função para obter texto responsivo
  const getResponsiveText = (texts: {
    mobile?: string;
    tablet?: string;
    desktop: string;
  }) => {
    if (screenSize === 'mobile' && texts.mobile) return texts.mobile;
    if (screenSize === 'tablet' && texts.tablet) return texts.tablet;
    return texts.desktop;
  };

  // Função para obter texto com abreviação inteligente
  const getSmartText = (fullText: string, abbreviation?: string) => {
    if (screenSize === 'mobile' && abbreviation) return abbreviation;
    if (screenSize === 'tablet' && fullText.length > 15) {
      return abbreviation || fullText.substring(0, 12) + '...';
    }
    return fullText;
  };

  // Função para obter props de layout responsivo
  const getResponsiveProps = () => {
    return {
      screenSize,
      isMobile: screenSize === 'mobile',
      isTablet: screenSize === 'tablet',
      isDesktop: screenSize === 'desktop',
      getResponsiveText,
      getSmartText
    };
  };

  return getResponsiveProps();
};

// Tipos para responsividade
export type ScreenText = { 
  desktop: string; 
  tablet?: string; 
  mobile?: string; 
};

export interface BasePageTexts { 
  title: ScreenText; 
  subtitle?: ScreenText;
}

export interface LibraryTexts extends BasePageTexts {
  uploadMaterial: ScreenText;
  searchPlaceholder: {
    areas: ScreenText;
    subjects: ScreenText;
    materials: ScreenText;
  };
  stats: {
    title: ScreenText;
    labels: {
      areas: ScreenText;
      subjects: ScreenText;
      materials: ScreenText;
      organization: ScreenText;
    };
  };
  buttons: {
    newArea: ScreenText;
    newSubject: ScreenText;
    newMaterial: ScreenText;
  };
}

interface DashboardTexts extends BasePageTexts {
  quickActions?: ScreenText;
}

interface GoalsTexts extends BasePageTexts {}

type PageTextMap = {
  library: LibraryTexts;
  dashboard: DashboardTexts;
  goals: GoalsTexts;
};

// Textos adaptativos para a aplicação
export const responsiveTexts: PageTextMap = {
  library: {
    title: {
      desktop: 'Biblioteca',
      mobile: 'Lib'
    },
    subtitle: {
      desktop: 'Organize seus materiais de estudo por áreas e matérias',
      tablet: 'Organize materiais por áreas',
      mobile: 'Seus materiais'
    },
    uploadMaterial: {
      desktop: 'Upload Material',
      tablet: 'Upload',
      mobile: 'Up'
    },
    searchPlaceholder: {
      areas: {
        desktop: 'Buscar áreas...',
        mobile: 'Áreas...'
      },
      subjects: {
        desktop: 'Buscar matérias...',
        mobile: 'Matérias...'
      },
      materials: {
        desktop: 'Buscar materiais...',
        mobile: 'Materiais...'
      }
    },
    stats: {
      title: {
        desktop: 'Estatísticas da sua biblioteca',
        tablet: 'Stats da biblioteca',
        mobile: 'Stats'
      },
      labels: {
        areas: {
          desktop: 'Áreas',
          mobile: 'Áreas'
        },
        subjects: {
          desktop: 'Matérias',
          mobile: 'Mat.'
        },
        materials: {
          desktop: 'Materiais',
          mobile: 'Mat.'
        },
        organization: {
          desktop: 'Organização',
          mobile: 'Org.'
        }
      }
    },
    buttons: {
      newArea: {
        desktop: 'Nova Área',
        tablet: 'Nova Área',
        mobile: '+ Área'
      },
      newSubject: {
        desktop: 'Nova Matéria',
        tablet: 'Nova Mat.',
        mobile: '+ Mat.'
      },
      newMaterial: {
        desktop: 'Novo Material',
        tablet: 'Novo Mat.',
        mobile: '+ Mat.'
      }
    }
  },
  dashboard: {
    title: {
      desktop: 'Painel de Controle',
      tablet: 'Painel',
      mobile: 'Home'
    },
    quickActions: {
      desktop: 'Ações Rápidas',
      tablet: 'Ações',
      mobile: 'Ações'
    }
  },
  goals: {
    title: {
      desktop: 'Objetivos',
      mobile: 'Metas'
    },
    subtitle: {
      desktop: 'Gerencie seus objetivos de estudo',
      tablet: 'Seus objetivos',
      mobile: 'Metas'
    }
  }
};