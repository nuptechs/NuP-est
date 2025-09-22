import { Segment, Header, Button } from 'semantic-ui-react';

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
    <Segment textAlign="center" className={`empty-state ${className}`} data-testid={testId}>
      <div className="icon mb-lg">
        {icon}
      </div>
      <Header as="h3" className="title mb-sm">
        {title}
      </Header>
      <p className="description text-muted mb-lg">
        {description}
      </p>
      {action && (
        <Button 
          primary 
          onClick={action.onClick}
          data-testid="empty-state-action"
        >
          {action.label}
        </Button>
      )}
    </Segment>
  );
}