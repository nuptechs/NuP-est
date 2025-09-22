import { Card, Icon } from 'semantic-ui-react';

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
  return (
    <Card className={`stat-card transition-smooth hover-lift ${className}`} data-testid={testId}>
      <Card.Content>
        <div className={`icon ${variant} mb-md`}>
          {icon}
        </div>
        <div className="value text-strong mb-xs">
          {value}
        </div>
        <div className="label text-muted">
          {label}
        </div>
      </Card.Content>
    </Card>
  );
}