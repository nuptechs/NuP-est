import { DashboardLayout } from "../components/DashboardLayout";
import { Card } from "../components/ui/card";
import { Shield } from "lucide-react";

export function PermissionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions & Profiles</h1>
          <p className="text-gray-500 mt-1">Manage role-based access control</p>
        </div>

        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Permissions Management
          </h3>
          <p className="text-gray-500 mb-4">
            This feature will allow you to manage profiles, roles, and granular permissions across all systems.
            Coming soon!
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
