import { Button } from './button';
import { LayoutDashboard } from "lucide-react";

export function DashboardIcon() {
  return (
    <Button
      variant="default"
      size="icon"
      className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90"
      onClick={() => window.location.href = '/dashboard'}
      data-testid="button-dashboard"
    >
      <LayoutDashboard className="h-4 w-4" />
    </Button>
  );
}