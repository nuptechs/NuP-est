import { Card } from 'semantic-ui-react';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'info';
  className?: string;
  'data-testid'?: string;
}

export function StatCard({ 
  icon, 
  value, 
  label, 
  variant = 'primary', 
  className = '',
  'data-testid': testId 
}: StatCardProps) {
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'var(--nup-primary)';
      case 'success':
        return 'var(--nup-success)';
      case 'warning':
        return 'var(--nup-warning)';
      case 'info':
        return 'var(--nup-info)';
      default:
        return 'var(--nup-primary)';
    }
  };

  return (
    <Card 
      className={`nup-card hover-lift ${className}`}
      style={{ 
        backgroundColor: 'var(--nup-bg-secondary)',
        border: '1px solid var(--nup-border)',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        height: '100%'
      }}
      data-testid={testId}
    >
      <Card.Content 
        style={{ 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            fontSize: '2rem',
            color: getVariantColor(variant)
          }}
        >
          {icon}
        </div>
        <div 
          style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: 'var(--nup-text-primary)',
            marginBottom: '0.25rem',
            lineHeight: '1.2'
          }}
        >
          {value}
        </div>
        <div 
          style={{
            fontSize: '0.875rem',
            color: 'var(--nup-text-secondary)',
            fontWeight: '500'
          }}
        >
          {label}
        </div>
      </Card.Content>
    </Card>
  );
}