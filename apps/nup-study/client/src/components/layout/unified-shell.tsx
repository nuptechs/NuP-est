/**
 * Unified Shell Component
 * Consolida AppShell e ProfessionalShell em um único componente limpo
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@nup/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Search,
  Plus,
  LogOut,
  User,
  Moon,
  Sun,
  X,
  Home,
  BookOpen,
  Brain,
  Zap,
  Target,
  BarChart3,
  Palette,
  Check,
  Settings,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { layout, navigationItems } from "@/lib/design-system";
import type { BreadcrumbItem } from "@/components/ui/page-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

interface UnifiedShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

// Icon mapping
const iconMap: Record<string, any> = {
  Home,
  BookOpen,
  Brain,
  Zap,
  Target,
  BarChart3,
  Settings,
  Network: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/><path d="M2 9h2"/></svg>,
};

export default function UnifiedShell({ 
  children, 
  title, 
  subtitle,
  actions,
  breadcrumbs
}: UnifiedShellProps) {
  const { user } = useAuth();
  const { currentTheme, currentMode, setTheme, setMode, availableThemes } = useTheme();
  const [location, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [isDark, setIsDark] = useState(() => {
    return currentMode === 'dark';
  });

  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const getUserInitials = () => {
    if (!user) return "??";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.email?.charAt(0).toUpperCase() || "??";
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setMode(newMode);
    setIsDark(!isDark);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex lg:flex-col bg-card border-r border-border transition-all duration-300 ease-in-out relative",
          isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 border-b border-border overflow-hidden">
          <div className={cn(
            "flex items-center transition-all duration-300",
            isSidebarCollapsed ? "px-3 justify-center w-full" : "px-6 gap-3"
          )}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-semibold text-foreground whitespace-nowrap">NuP-Study</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <TooltipProvider key={item.href} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "w-full flex items-center text-sm font-medium rounded-lg transition-all",
                        isSidebarCollapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-muted"
                      )}
                      data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        !isSidebarCollapsed && "mr-3"
                      )} />
                      {!isSidebarCollapsed && <span>{item.name}</span>}
                    </button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  "w-full flex items-center text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors",
                  isSidebarCollapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5"
                )}
                data-testid="user-menu-trigger"
              >
                <Avatar className={cn(
                  "w-8 h-8 flex-shrink-0",
                  !isSidebarCollapsed && "mr-3"
                )}>
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!isSidebarCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate font-medium">{user?.firstName || user?.email}</div>
                    <div className="text-xs text-muted-foreground">Ver perfil</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.firstName || user?.email || 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate('/onboarding?mode=edit')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/admin/search-config')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
              </DropdownMenuItem>
              
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 justify-center">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setTheme(theme.name)}
                      className="relative group"
                      title={theme.displayName}
                    >
                      <div 
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          currentTheme.name === theme.name 
                            ? 'border-foreground scale-110' 
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      {currentTheme.name === theme.name && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => window.location.href = '/api/logout'}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebarCollapse}
          className="absolute -right-3 top-20 bg-card border border-border rounded-full p-1 shadow-md hover:bg-accent transition-colors z-10"
          data-testid="button-toggle-sidebar"
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-foreground" />
          )}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 gap-4 flex-shrink-0">
          {/* Left Section - Breadcrumbs or Brain Icon */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Brain Icon - Opens Sidebar on Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-9 w-9 p-0 flex-shrink-0"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="button-mobile-menu"
            >
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
            </Button>
            
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <TooltipProvider>
                <nav className="flex items-center space-x-1 text-sm flex-1 overflow-hidden">
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const totalCrumbs = breadcrumbs.length;
                    
                    let hiddenClasses = "flex";
                    const isLastTwo = index >= totalCrumbs - 2;
                    const isThirdFromLast = index === totalCrumbs - 3;
                    const isBeforeThird = index < totalCrumbs - 3;
                    
                    if (isBeforeThird) {
                      hiddenClasses = "hidden lg:flex";
                    } else if (isThirdFromLast) {
                      hiddenClasses = "hidden md:flex";
                    }

                    const content = (
                      <div
                        className={`${hiddenClasses} items-center`}
                        key={index}
                        data-testid={`breadcrumb-${index}`}
                      >
                        {index > 0 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                        )}
                        
                        {(item.href || item.onClick) && !isLast ? (
                          item.onClick ? (
                            <button
                              onClick={item.onClick}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent max-w-[200px] truncate"
                              data-testid={`button-breadcrumb-${index}`}
                            >
                              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                              <span className="truncate">{item.label}</span>
                            </button>
                          ) : (
                            <Link
                              href={item.href!}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent max-w-[200px] truncate"
                              data-testid={`link-breadcrumb-${index}`}
                            >
                              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        ) : (
                          <span
                            className={`flex items-center gap-1.5 px-2 py-1 max-w-[200px] truncate ${
                              isLast 
                                ? "text-foreground font-medium" 
                                : "text-muted-foreground"
                            }`}
                            data-testid={`text-breadcrumb-${index}`}
                          >
                            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                            <span className="truncate">{item.label}</span>
                          </span>
                        )}
                      </div>
                    );

                    if (index < breadcrumbs.length - 2) {
                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            {content}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return content;
                  })}

                  {breadcrumbs.length > 2 && (
                    <div className="md:hidden flex items-center text-muted-foreground px-2">
                      <span>...</span>
                      <ChevronRight className="h-4 w-4 mx-1" />
                    </div>
                  )}
                </nav>
              </TooltipProvider>
            )}
          </div>

          {/* Center Section - Search */}
          <div className="max-w-md hidden md:block flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar... (⌘K)"
                className="w-full pl-9 pr-4 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                onClick={() => setIsCommandOpen(true)}
                readOnly
                data-testid="input-global-search"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Custom Actions */}
            {actions}

            {/* Search (Mobile) */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-9 w-9 p-0"
              onClick={() => setIsCommandOpen(true)}
              data-testid="button-search-mobile"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* User Menu (Mobile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="lg:hidden h-9 w-9 p-0 rounded-full"
                  data-testid="button-user-menu-mobile"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.firstName || user?.email || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => navigate('/onboarding?mode=edit')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/admin/search-config')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDark ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
                </DropdownMenuItem>
                
                <div className="px-2 py-2">
                  <div className="flex items-center gap-2 justify-center">
                    {availableThemes.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => setTheme(theme.name)}
                        className="relative group"
                        title={theme.displayName}
                      >
                        <div 
                          className={`w-8 h-8 rounded-md border-2 transition-all ${
                            currentTheme.name === theme.name 
                              ? 'border-foreground scale-110' 
                              : 'border-border hover:scale-105'
                          }`}
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        {currentTheme.name === theme.name && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/api/logout'}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          {/* Page Content */}
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop - Opaco para bloquear conteúdo */}
          <div 
            className="fixed inset-0 bg-black/80 dark:bg-black/90 animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar - Background sólido sem transparência */}
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border shadow-2xl animate-in slide-in-from-left z-10">
            {/* Logo */}
            <div className="flex items-center justify-between h-14 px-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold text-foreground">NuP-Study</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Navigation */}
            <nav className="px-3 py-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      navigate(item.href);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Digite um comando ou busque..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Páginas">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => {
                    navigate(item.href);
                    setIsCommandOpen(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {item.description}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="Ações Rápidas">
            <CommandItem
              onSelect={() => {
                navigate("/library?create=material");
                setIsCommandOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Upload Material</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/goal-builder");
                setIsCommandOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Nova Meta</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/quiz");
                setIsCommandOpen(false);
              }}
            >
              <Brain className="mr-2 h-4 w-4" />
              <span>Quiz IA</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
