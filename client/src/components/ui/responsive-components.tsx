import { Button, Header, Grid, Card, Statistic } from 'semantic-ui-react';
import { useResponsiveText, responsiveTexts, type ScreenText } from '@/hooks/useResponsiveText';

// Componente de Header Responsivo
interface ResponsiveHeaderProps {
  page: 'library' | 'dashboard' | 'goals';
  subtitle?: string;
  rightActions?: React.ReactNode;
}

export const ResponsiveHeader = ({ page, subtitle, rightActions }: ResponsiveHeaderProps) => {
  const { getResponsiveText, screenSize, isMobile } = useResponsiveText();
  
  const pageTexts = responsiveTexts[page];
  const title = getResponsiveText(pageTexts.title);
  const subtitleText = subtitle || (pageTexts.subtitle ? getResponsiveText(pageTexts.subtitle) : '');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      gap: isMobile ? 'var(--spacing-sm)' : '0',
      marginBottom: 'var(--spacing-lg)' 
    }}>
      <div style={{ flex: 1 }}>
        <Header 
          as="h1" 
          style={{ 
            fontSize: isMobile ? '24px' : '32px', 
            fontWeight: '600', 
            color: 'var(--nup-gray-800)', 
            marginBottom: 'var(--spacing-xs)',
            margin: 0
          }}
        >
          {title}
        </Header>
        {subtitleText && (
          <p style={{ 
            color: 'var(--nup-gray-600)', 
            fontSize: isMobile ? '14px' : '16px',
            margin: '4px 0 0 0'
          }}>
            {subtitleText}
          </p>
        )}
      </div>
      {rightActions && (
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)',
          flexDirection: isMobile ? 'row' : 'row',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'stretch' : 'flex-end'
        }}>
          {rightActions}
        </div>
      )}
    </div>
  );
};

// Componente de Botão Responsivo
interface ResponsiveButtonProps {
  textKey: ScreenText;
  icon?: string;
  primary?: boolean;
  secondary?: boolean;
  onClick?: () => void;
  testId?: string;
}

export const ResponsiveButton = ({ textKey, icon, primary, secondary, onClick, testId }: ResponsiveButtonProps) => {
  const { getResponsiveText, isMobile } = useResponsiveText();
  
  const text = getResponsiveText(textKey);
  
  return (
    <Button
      primary={primary}
      secondary={secondary}
      icon={icon}
      content={text}
      onClick={onClick}
      data-testid={testId}
      size={isMobile ? 'small' : 'medium'}
      style={{ flex: isMobile ? 1 : 'none' }}
    />
  );
};

// Componente de Grid Responsivo
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  stackable?: boolean;
}

export const ResponsiveGrid = ({ children, columns = 4, stackable = true }: ResponsiveGridProps) => {
  const { screenSize } = useResponsiveText();
  
  // Ajustar número de colunas baseado no tamanho da tela
  let responsiveColumns: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | "equal" = columns as any;
  if (screenSize === 'mobile') {
    responsiveColumns = 1; // 1 coluna no mobile para melhor responsividade
  } else if (screenSize === 'tablet') {
    responsiveColumns = Math.min(2, columns) as any; // Máximo 2 colunas no tablet
  }

  return (
    <Grid 
      columns={responsiveColumns} 
      stackable={stackable}
      style={{ marginTop: 'var(--spacing-md)' }}
    >
      {children}
    </Grid>
  );
};

// Componente de Card de Estatística Responsivo
interface ResponsiveStatCardProps {
  icon: React.ReactNode;
  value: string | number;
  labelKey: ScreenText;
  variant: 'info' | 'success' | 'warning' | 'primary';
  testId?: string;
}

export const ResponsiveStatCard = ({ icon, value, labelKey, variant, testId }: ResponsiveStatCardProps) => {
  const { getResponsiveText, isMobile } = useResponsiveText();
  
  const label = getResponsiveText(labelKey);
  
  const variantColors = {
    info: 'var(--nup-secondary)',
    success: 'var(--nup-success)',
    warning: 'var(--nup-warning)',
    primary: 'var(--nup-primary)'
  };

  return (
    <Card 
      fluid 
      style={{ 
        backgroundColor: 'var(--nup-white)',
        border: '1px solid var(--nup-gray-200)',
        borderRadius: '12px',
        padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)',
        boxShadow: 'var(--shadow-sm)'
      }}
      data-testid={testId}
    >
      <Card.Content style={{ padding: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 'var(--spacing-xs)' : 'var(--spacing-sm)' 
        }}>
          <div style={{ 
            color: variantColors[variant],
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </div>
          <div>
            <Statistic size={isMobile ? 'mini' : undefined}>
              <Statistic.Value style={{ color: 'var(--nup-gray-800)', fontSize: isMobile ? '18px' : '24px' }}>
                {value}
              </Statistic.Value>
              <Statistic.Label style={{ color: 'var(--nup-gray-600)', fontSize: isMobile ? '12px' : '14px' }}>
                {label}
              </Statistic.Label>
            </Statistic>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

// Componente de Search Input Responsivo
interface ResponsiveSearchProps {
  placeholder: ScreenText;
  value: string;
  onChange: (e: any) => void;
  testId?: string;
}

export const ResponsiveSearch = ({ placeholder, value, onChange, testId }: ResponsiveSearchProps) => {
  const { getResponsiveText } = useResponsiveText();
  
  return (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={getResponsiveText(placeholder)}
          value={value}
          onChange={onChange}
          data-testid={testId}
          style={{
            width: '100%',
            padding: '12px 16px 12px 40px',
            border: '1px solid var(--nup-gray-300)',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'var(--nup-white)',
            color: 'var(--nup-gray-800)',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--nup-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--nup-gray-300)';
          }}
        />
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--nup-gray-500)',
          pointerEvents: 'none'
        }}>
          🔍
        </div>
      </div>
    </div>
  );
};