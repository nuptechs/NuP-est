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
    <div className={`section-header ${className}`} data-testid={testId}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Header as="h2" className="title">
            {title}
          </Header>
          {description && (
            <p className="description text-muted">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div style={{ flexShrink: 0, marginLeft: '16px' }}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}