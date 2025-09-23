import { Header } from 'semantic-ui-react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function SectionHeader({ 
  title, 
  description, 
  action,
  className = '',
  'data-testid': testId 
}: SectionHeaderProps) {
  return (
    <div 
      className={`nup-section-header ${className}`} 
      style={{ 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem'
      }} 
      data-testid={testId}
    >
      <div style={{ flex: 1 }}>
        <Header 
          as="h2" 
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--nup-text-primary)',
            marginBottom: '0.5rem'
          }}
        >
          {title}
        </Header>
        {description && (
          <p style={{ 
            color: 'var(--nup-text-secondary)',
            fontSize: '1rem',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  );
}