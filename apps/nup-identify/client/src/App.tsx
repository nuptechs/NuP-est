import { useEffect } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Route, Switch, useLocation, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { OrganizationsPage } from "@/pages/OrganizationsPage";
import { TeamsPage } from "@/pages/TeamsPage";
import { PermissionsPage } from "@/pages/PermissionsPage";
import { InvitationsPage } from "@/pages/InvitationsPage";
import SystemsPage from "@/pages/SystemsPage";
import SettingsPage from "@/pages/SettingsPage";
import { queryClient, getCurrentUser, isAuthenticated } from "@/lib/queryClient";

const BASE_PATH = ((import.meta.env.VITE_BASE_PREFIX as string | undefined) || import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function AuthCheck({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated(),
    retry: false,
  });

  useEffect(() => {
    if (error && isAuthenticated()) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }

    if (!isLoading && !user && location !== "/login" && location !== "/") {
      setLocation("/login");
    }
  }, [user, isLoading, error, location, setLocation]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router base={BASE_PATH}>
        <AuthCheck>
          <Switch>
            <Route path="/" component={LoginPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/organizations" component={OrganizationsPage} />
            <Route path="/teams" component={TeamsPage} />
            <Route path="/permissions" component={PermissionsPage} />
            <Route path="/invitations" component={InvitationsPage} />
            <Route path="/systems" component={SystemsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route>
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p>Página não encontrada</p>
                </div>
              </div>
            </Route>
          </Switch>
        </AuthCheck>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
