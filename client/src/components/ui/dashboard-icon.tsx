import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export function DashboardIcon() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.location.href = '/dashboard'}
      className="fixed bottom-4 left-4 z-50 p-2 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-200 hover:scale-105"
      data-testid="button-dashboard"
    >
      <LayoutDashboard className="h-4 w-4 text-white" />
    </Button>
  );
}