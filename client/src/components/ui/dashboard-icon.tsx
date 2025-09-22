import { Button } from 'semantic-ui-react';
import { LayoutDashboard } from "lucide-react";

export function DashboardIcon() {
  return (
    <Button
      primary
      circular
      icon
      onClick={() => window.location.href = '/dashboard'}
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        zIndex: 50,
        boxShadow: 'var(--shadow-lg)',
        transition: 'var(--transition-normal)',
      }}
      className="dashboard-icon-button"
      data-testid="button-dashboard"
    >
      <LayoutDashboard style={{ width: '16px', height: '16px' }} />
    </Button>
  );
}