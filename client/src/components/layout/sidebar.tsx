import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const navigationSections = [
  {
    title: "Principal",
    items: [
      { name: "Dashboard", href: "/", icon: "fa-home" },
      { name: "AI Assistant", href: "/ai-assistant", icon: "fa-robot" },
      { name: "Busca Integrada", href: "/search", icon: "fa-search" },
    ]
  },
  {
    title: "Preparar", 
    items: [
      { name: "Biblioteca", href: "/library", icon: "fa-books" },
      { name: "Objetivos", href: "/goals", icon: "fa-target" },
    ]
  },
  {
    title: "Estudar",
    items: [
      { name: "Estudar", href: "/study", icon: "fa-graduation-cap" },
      { name: "Flashcards", href: "/flashcards", icon: "fa-layer-group" },
    ]
  },
  {
    title: "Acompanhar",
    items: [
      { name: "Progresso", href: "/analytics", icon: "fa-chart-line" },
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: stats } = useQuery<{
    todayHours: number;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: !!user,
  });

  const getUserInitials = () => {
    if (!user) return "??";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || user.email?.charAt(0).toUpperCase() || "??";
  };

  const getStudyProfileLabel = () => {
    switch (user?.studyProfile) {
      case "disciplined":
        return "Disciplinado";
      case "undisciplined":
        return "Indisciplinado";
      default:
        return "Mediano";
    }
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
            <i className="fas fa-brain text-sidebar-primary-foreground text-xl"></i>
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">NuP-est</h1>
        </div>
        
        <nav className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.href || (item.href === "/library" && ["/subjects", "/materials", "/knowledge-base"].includes(location));
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md transition-all",
                        isActive
                          ? "text-sidebar-primary bg-sidebar-primary/10 font-medium"
                          : "text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                      data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                    >
                      <i className={`fas ${item.icon} w-5`}></i>
                      <span>{item.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="mt-8 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-center space-x-2 mb-2">
            <i className="fas fa-user-circle text-accent"></i>
            <span className="text-sm font-medium text-sidebar-foreground" data-testid="text-user-name">
              {user?.firstName || user?.email || "Usuário"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-user-profile">
            Perfil: {getStudyProfileLabel()}
          </p>
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Horas estudadas</span>
              <span className="text-xs font-medium text-accent" data-testid="text-study-hours">
                {stats?.todayHours || 0}h hoje
              </span>
            </div>
            <div className="progress-bar h-2">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min((stats?.todayHours || 0) * 10, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
