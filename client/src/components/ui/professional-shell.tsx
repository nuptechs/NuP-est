import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Home,
  BookOpen,
  Target,
  BarChart3,
  Brain,
  Zap,
  Search,
  Settings,
  LogOut,
  Plus,
  Command as CommandIcon,
  User,
  Bell,
  Menu,
  X
} from "lucide-react";

interface ProfessionalShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Visão geral dos estudos",
  },
  {
    name: "Biblioteca",
    href: "/library",
    icon: BookOpen,
    description: "Organize seu conteúdo",
  },
  {
    name: "Metas",
    href: "/goals",
    icon: Target,
    description: "Acompanhe objetivos",
  },
  {
    name: "Estudar",
    href: "/study",
    icon: Brain,
    description: "Ferramentas de estudo",
  },
  {
    name: "Flashcards",
    href: "/flashcards",
    icon: Zap,
    description: "Memorização eficaz",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Progresso detalhado",
  },
];

export default function ProfessionalShell({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className
}: ProfessionalShellProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.email?.charAt(0).toUpperCase() || "U";
  };

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('auth-token');
    sessionStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-card border-r border-border">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 bg-card border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="ml-3 text-xl font-semibold text-foreground">NuP-est</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/" && location.startsWith(item.href));
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                  data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div>{item.name}</div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                  data-testid="user-menu-trigger"
                >
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="truncate">{user?.firstName || user?.email}</div>
                    <div className="text-xs text-muted-foreground">Ver perfil</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mr-4"
              onClick={() => setIsMobileSidebarOpen(true)}
              data-testid="mobile-menu-trigger"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2 text-muted-foreground">/</span>}
                      {crumb.href ? (
                        <button
                          onClick={() => navigate(crumb.href!)}
                          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-foreground">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Page Title */}
            {(title || subtitle) && (
              <div className={cn("ml-4", breadcrumbs && breadcrumbs.length > 0 && "ml-8")}>
                {title && (
                  <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCommandOpen(true)}
              data-testid="search-trigger"
              className="hidden sm:flex"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar...
              <kbd className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </Button>

            {/* Actions */}
            {actions}

            {/* Notifications */}
            <Button variant="ghost" size="sm" data-testid="notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-auto bg-background p-6",
          className
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Digite para buscar..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Navegação">
            {navigation.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  navigate(item.href);
                  setIsCommandOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  {item.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Ações Rápidas">
            <CommandItem
              onSelect={() => {
                navigate("/flashcards?create=true");
                setIsCommandOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Flashcard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/goals?create=true");
                setIsCommandOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border">
            <div className="flex items-center justify-between h-16 px-6 border-b border-border">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="ml-3 text-xl font-semibold text-foreground">NuP-est</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div>{item.name}</div>
                      <div className={cn(
                        "text-xs",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}