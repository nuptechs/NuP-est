import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card } from "../components/ui/card";
import { Building2, Users, Mail } from "lucide-react";

export function DashboardPage() {
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
    select: (data) => Array.isArray(data) ? data : [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    select: (data) => Array.isArray(data) ? data : [],
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["/api/invitations"],
    select: (data) => Array.isArray(data) ? data : [],
  });

  const stats = [
    {
      label: "Organizations",
      value: organizations.length,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Teams",
      value: teams.length,
      icon: Users,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Pending Invites",
      value: invitations.length,
      icon: Mail,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to NuPIdentity central management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Organizations</h2>
          <div className="space-y-3">
            {organizations.length > 0 ? (
              organizations.slice(0, 5).map((org: any) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      org.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {org.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No organizations yet
              </p>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
