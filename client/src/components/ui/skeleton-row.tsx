import { Card, Placeholder } from 'semantic-ui-react';

interface SkeletonCardProps {
  className?: string;
  'data-testid'?: string;
}

export function SkeletonCard({ 
  className = '',
  'data-testid': testId 
}: SkeletonCardProps) {
  return (
    <Card className={`skeleton-card ${className}`} data-testid={testId}>
      <Card.Content>
        <Placeholder>
          <Placeholder.Header image>
            <Placeholder.Line />
            <Placeholder.Line />
          </Placeholder.Header>
          <Placeholder.Paragraph>
            <Placeholder.Line length="medium" />
            <Placeholder.Line length="short" />
          </Placeholder.Paragraph>
        </Placeholder>
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
  return (
    <div className={`skeleton-row ${className}`} data-testid={testId}>
      <Placeholder>
        <Placeholder.Paragraph>
          {Array.from({ length: lines }, (_, i) => (
            <Placeholder.Line 
              key={i} 
              length={i === lines - 1 ? 'short' : 'medium'} 
            />
          ))}
        </Placeholder.Paragraph>
      </Placeholder>
    </div>
  );
}