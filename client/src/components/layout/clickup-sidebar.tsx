import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Inbox,
  BarChart3,
  BookOpen,
  Brain,
  Target,
  FileText,
  Settings,
  ChevronLeft,
  Plus
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  type: "nav" | "hub" | "space";
  items?: SidebarItem[];
}

export default function ClickUpSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Listen for keyboard shortcut from shell
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsCollapsed(prev => !prev);
    };

    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-sidebar', handleToggleSidebar);
  }, []);
  const [expandedHubs, setExpandedHubs] = useState<string[]>([]);

  const sidebarItems: SidebarItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      path: "/",
      type: "nav"
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: <Inbox className="h-4 w-4" />,
      path: "/inbox",
      type: "nav"
    },
    {
      id: "dashboards-hub",
      label: "Dashboards",
      icon: <BarChart3 className="h-4 w-4" />,
      type: "hub",
      items: [
        { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3 w-3" />, path: "/analytics", type: "nav" }
      ]
    },
    {
      id: "biblioteca-hub",
      label: "Biblioteca",
      icon: <BookOpen className="h-4 w-4" />,
      type: "hub",
      items: [
        { id: "library", label: "Áreas de Conhecimento", icon: <BookOpen className="h-3 w-3" />, path: "/library", type: "nav" },
        { id: "materials", label: "Materiais", icon: <FileText className="h-3 w-3" />, path: "/library?view=materials", type: "nav" }
      ]
    },
    {
      id: "ai-hub",
      label: "AI Tools",
      icon: <Brain className="h-4 w-4" />,
      type: "hub",
      items: [
        { id: "ai-assistant", label: "AI Assistant", icon: <Brain className="h-3 w-3" />, path: "/ai-assistant", type: "nav" },
        { id: "search", label: "Busca Global", icon: <FileText className="h-3 w-3" />, path: "/search", type: "nav" }
      ]
    },
    {
      id: "metas-space",
      label: "Metas",
      icon: <Target className="h-4 w-4" />,
      path: "/goals",
      type: "space"
    }
  ];

  const toggleHub = (hubId: string) => {
    setExpandedHubs(prev => 
      prev.includes(hubId) 
        ? prev.filter(id => id !== hubId)
        : [...prev, hubId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location === path || location.startsWith(path + '/');
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.type === "hub") {
      toggleHub(item.id);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className={cn(
      "h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-200",
      isCollapsed ? "w-14" : "w-56"
    )}>
      {/* Workspace Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded text-white text-xs font-semibold flex items-center justify-center">
              N
            </div>
            <span className="font-semibold text-slate-900 text-sm">NuP-est</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 p-0 hover:bg-slate-100"
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-2">
        {sidebarItems.map((item) => (
          <div key={item.id}>
            {/* Main Item */}
            <button
              onClick={() => handleItemClick(item)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                "hover:bg-slate-50",
                isActive(item.path) && "bg-blue-50 text-blue-700 border-r-2 border-blue-600",
                !isActive(item.path) && "text-slate-700",
                isCollapsed && "justify-center px-2"
              )}
              data-testid={`sidebar-${item.id}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.icon}
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>
              {!isCollapsed && item.type === "hub" && (
                <ChevronLeft className={cn(
                  "h-3 w-3 ml-auto transition-transform",
                  expandedHubs.includes(item.id) && "rotate-90"
                )} />
              )}
            </button>

            {/* Hub Sub-items */}
            {!isCollapsed && item.type === "hub" && expandedHubs.includes(item.id) && item.items && (
              <div className="ml-6 border-l border-slate-200">
                {item.items.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => subItem.path && navigate(subItem.path)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1 text-left text-xs transition-colors",
                      "hover:bg-slate-50",
                      isActive(subItem.path) && "bg-blue-50 text-blue-700",
                      !isActive(subItem.path) && "text-slate-600"
                    )}
                    data-testid={`sidebar-${subItem.id}`}
                  >
                    {subItem.icon}
                    <span className="truncate">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User Section */}
      <div className="border-t border-slate-200 p-2">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs font-medium">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate">
                {user?.firstName || 'Usuário'}
              </div>
              <div className="text-xs text-slate-500">
                {user?.studyProfile || 'Equilibrado'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-100"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-100 mx-auto"
          >
            <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs font-medium">
              {user?.firstName?.[0] || 'U'}
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}