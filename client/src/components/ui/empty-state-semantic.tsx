import { Card, Button, Header } from 'semantic-ui-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  'data-testid'?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = '',
  'data-testid': testId 
}: EmptyStateProps) {
  return (
    <Card 
      className={`nup-card ${className}`} 
      style={{ 
        textAlign: 'center',
        padding: '3rem 2rem',
        backgroundColor: 'var(--nup-bg-secondary)',
        border: '1px solid var(--nup-border)',
        borderRadius: '12px'
      }} 
      data-testid={testId}
    >
      <Card.Content>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            fontSize: '3.5rem', 
            color: 'var(--nup-text-tertiary)',
            marginBottom: '1.5rem',
            opacity: 0.6
          }}
        >
          {icon}
        </div>
        <Header 
          as="h3" 
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--nup-text-primary)',
            marginBottom: '0.75rem'
          }}
        >
          {title}
        </Header>
        <p 
          style={{ 
            color: 'var(--nup-text-secondary)',
            fontSize: '1rem',
            lineHeight: '1.5',
            maxWidth: '400px',
            margin: '0 auto 1.5rem auto'
          }}
        >
          {description}
        </p>
        {action && (
          <div style={{ paddingTop: '1rem' }}>
            <Button 
              primary
              onClick={action.onClick}
              style={{
                backgroundColor: 'var(--nup-primary)',
                color: 'white'
              }}
              data-testid="empty-state-action"
            >
              {action.label}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}