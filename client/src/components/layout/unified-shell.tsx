/**
 * Unified Shell Component
 * Consolida AppShell e ProfessionalShell em um único componente limpo
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { layout, navigationItems } from "@/lib/design-system";

interface UnifiedShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// Icon mapping
const iconMap: Record<string, any> = {
  Home,
  BookOpen,
  Brain,
  Zap,
  Target,
  BarChart3,
};

export default function UnifiedShell({ 
  children, 
  title, 
  subtitle,
  actions
}: UnifiedShellProps) {
  const { user } = useAuth();
  const { currentTheme, currentMode, setTheme, setMode, availableThemes } = useTheme();
  const [location, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return currentMode === 'dark';
  });

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
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border">
        {/* Logo */}
        <div className="flex items-center h-14 px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">NuP-Study</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-muted"
                )}
                data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                data-testid="user-menu-trigger"
              >
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="truncate font-medium">{user?.firstName || user?.email}</div>
                  <div className="text-xs text-muted-foreground">Ver perfil</div>
                </div>
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 gap-4 flex-shrink-0">
          {/* Left Section - Reserved for Page Content */}
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
