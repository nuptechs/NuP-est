import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Settings,
  LogOut,
  Home,
  BookOpen,
  Target,
  BarChart3,
  Brain,
  FileText,
  Calendar,
  Bell,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamsShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  primaryActions?: React.ReactNode;
}

export default function TeamsShell({ 
  children, 
  title, 
  subtitle, 
  breadcrumbs = [],
  primaryActions 
}: TeamsShellProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const railItems = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      path: "/",
      active: location === "/"
    },
    {
      id: "library",
      label: "Biblioteca",
      icon: <BookOpen className="h-5 w-5" />,
      path: "/library",
      active: location.startsWith("/library")
    },
    {
      id: "goals",
      label: "Metas",
      icon: <Target className="h-5 w-5" />,
      path: "/goals",
      active: location.startsWith("/goals")
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      path: "/analytics",
      active: location.startsWith("/analytics")
    },
    {
      id: "ai",
      label: "AI Assistant",
      icon: <Brain className="h-5 w-5" />,
      path: "/ai-assistant",
      active: location.startsWith("/ai-assistant")
    }
  ];

  const getPageTitle = () => {
    if (title) return title;
    if (location === "/") return "Home";
    if (location === "/library") return "Biblioteca";
    if (location === "/analytics") return "Analytics";
    if (location === "/goals") return "Metas";
    if (location === "/ai-assistant") return "AI Assistant";
    return "NuP-est";
  };

  const getUserInitials = () => {
    if (!user) return "??";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.email?.charAt(0).toUpperCase() || "??";
  };

  const handleQuickAction = (type: string) => {
    switch (type) {
      case "area":
        navigate("/library?create=area");
        break;
      case "subject":
        navigate("/library?create=subject");
        break;
      case "material":
        navigate("/library?create=material");
        break;
      case "goal":
        navigate("/goals?create=goal");
        break;
    }
    setIsCommandOpen(false);
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Rail Navigation */}
      <div className={cn(
        "bg-surface border-r border-border flex flex-col transition-all duration-200",
        isRailCollapsed ? "w-12" : "w-60"
      )}>
        {/* Rail Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-border">
          {!isRailCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">N</span>
              </div>
              <span className="font-semibold text-foreground">NuP-est</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsRailCollapsed(!isRailCollapsed)}
            data-testid="toggle-rail"
          >
            {isRailCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-2 space-y-1">
          {railItems.map((item) => (
            <Button
              key={item.id}
              variant={item.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isRailCollapsed && "w-8 h-8 p-0 justify-center gap-0"
              )}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.id}`}
            >
              {item.icon}
              {!isRailCollapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </div>

        {/* User Section */}
        <div className="p-2 border-t border-border">
          {isRailCollapsed ? (
            <Button
              variant="ghost"
              className="w-8 h-8 p-0 mx-auto"
              data-testid="user-menu-collapsed"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-muted">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10"
                  data-testid="user-menu"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 gap-4">
          {/* Left Section - Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            {breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <Button
                        variant="ghost"
                        className="h-auto p-1 text-sm hover:text-foreground"
                        onClick={() => navigate(crumb.href!)}
                      >
                        {crumb.label}
                      </Button>
                    ) : (
                      <span className={index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            ) : (
              <h1 className="text-lg font-semibold text-foreground truncate">
                {getPageTitle()}
              </h1>
            )}
            {subtitle && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {subtitle}
              </span>
            )}
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar ou pressione ⌘K"
                className="pl-10 bg-muted/30 border-border"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsCommandOpen(true)}
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {primaryActions}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-testid="notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-1"
                  data-testid="quick-actions"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleQuickAction("area")}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Nova Área
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("subject")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Nova Matéria
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("material")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Novo Material
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleQuickAction("goal")}>
                  <Target className="h-4 w-4 mr-2" />
                  Nova Meta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Pesquisar ou navegar..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Páginas">
            <CommandItem onSelect={() => {
              navigate("/");
              setIsCommandOpen(false);
            }}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/library");
              setIsCommandOpen(false);
            }}>
              <BookOpen className="mr-2 h-4 w-4" />
              Biblioteca
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/goals");
              setIsCommandOpen(false);
            }}>
              <Target className="mr-2 h-4 w-4" />
              Metas
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/analytics");
              setIsCommandOpen(false);
            }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={() => handleQuickAction("area")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Área de Conhecimento
            </CommandItem>
            <CommandItem onSelect={() => handleQuickAction("subject")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Matéria
            </CommandItem>
            <CommandItem onSelect={() => handleQuickAction("material")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </CommandItem>
            <CommandItem onSelect={() => handleQuickAction("goal")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}