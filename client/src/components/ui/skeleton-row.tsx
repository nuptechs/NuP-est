import { Card } from 'semantic-ui-react';

interface SkeletonCardProps {
  className?: string;
  'data-testid'?: string;
}

// Simple skeleton effect using CSS
const skeletonStyle = {
  background: 'linear-gradient(90deg, var(--nup-bg-tertiary) 25%, rgba(255,255,255,0.2) 37%, var(--nup-bg-tertiary) 63%)',
  backgroundSize: '400% 100%',
  animation: 'skeleton-loading 1.4s ease-in-out infinite',
  borderRadius: '6px'
};

export function SkeletonCard({ 
  className = '',
  'data-testid': testId 
}: SkeletonCardProps) {
  return (
    <Card 
      className={`nup-card ${className}`}
      style={{ 
        backgroundColor: 'var(--nup-bg-secondary)',
        border: '1px solid var(--nup-border)',
        borderRadius: '12px'
      }} 
      data-testid={testId}
    >
      <Card.Content style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div 
            style={{
              ...skeletonStyle,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              marginRight: '1rem'
            }}
          />
          <div style={{ flex: 1 }}>
            <div 
              style={{
                ...skeletonStyle,
                height: '16px',
                width: '100%',
                marginBottom: '0.5rem'
              }}
            />
            <div 
              style={{
                ...skeletonStyle,
                height: '16px',
                width: '75%'
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <div 
            style={{
              ...skeletonStyle,
              height: '16px',
              width: '85%',
              marginBottom: '0.5rem'
            }}
          />
          <div 
            style={{
              ...skeletonStyle,
              height: '16px',
              width: '50%'
            }}
          />
        </div>
      </Card.Content>
    </Card>
  );
}

interface SkeletonRowProps {
  lines?: number;
  className?: string;
  'data-testid'?: string;
}

export function SkeletonRow({ 
  lines = 3,
  className = '',
  'data-testid': testId 
}: SkeletonRowProps) {
  const getLineWidth = (index: number) => {
    if (index === lines - 1) return "50%"; // Last line shorter
    if (index === 0) return "100%"; // First line full width
    return "80%"; // Middle lines medium width
  };

  return (
    <div className={`nup-skeleton-row ${className}`} data-testid={testId}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i} 
          style={{
            ...skeletonStyle,
            height: '16px',
            width: getLineWidth(i),
            marginBottom: i < lines - 1 ? '0.5rem' : 0
          }}
        />
      ))}
    </div>
  );
}