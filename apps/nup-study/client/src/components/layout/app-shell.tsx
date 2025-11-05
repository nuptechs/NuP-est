import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
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
  Command as CommandIcon,
  Settings,
  LogOut,
  User,
  Moon,
  Sun,
  ChevronLeft,
  Menu,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppSidebar from "./app-sidebar";
import MobileNav from "./mobile-nav";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function AppShell({ 
  children, 
  title, 
  subtitle, 
  showBackButton, 
  onBack 
}: AppShellProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const getUserInitials = () => {
    if (!user) return "??";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.email?.charAt(0).toUpperCase() || "??";
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Quick actions para diferentes contextos
  const getQuickActions = () => {
    const path = location;
    const actions = [];

    if (path === '/library' || path.startsWith('/library')) {
      actions.push(
        { label: 'Nova Área', shortcut: 'A', action: () => navigate('/library?create=area') },
        { label: 'Nova Matéria', shortcut: 'M', action: () => navigate('/library?create=subject') },
        { label: 'Upload Material', shortcut: 'U', action: () => navigate('/library?create=material') }
      );
    } else if (path === '/goals') {
      actions.push(
        { label: 'Nova Meta', shortcut: 'G', action: () => navigate('/goal-builder') }
      );
    } else {
      actions.push(
        { label: 'Biblioteca', shortcut: 'L', action: () => navigate('/library') },
        { label: 'Estudar', shortcut: 'S', action: () => navigate('/study') },
        { label: 'Quiz IA', shortcut: 'Q', action: () => navigate('/quiz') }
      );
    }

    return actions;
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex">
        <AppSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 gap-4 flex-shrink-0">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Back Button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Page Title */}
            {title && (
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md">
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
            {/* Quick Add */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  data-testid="button-quick-add"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Criar Novo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {getQuickActions().map((action, index) => (
                  <DropdownMenuItem 
                    key={index}
                    onClick={action.action}
                    className="flex items-center justify-between"
                  >
                    <span>{action.label}</span>
                    <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {action.shortcut}
                    </kbd>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 relative"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4" />
              {/* Notification Badge */}
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></span>
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => navigate('/admin/search-config')}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 p-0 rounded-full"
                  data-testid="button-user-menu"
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
                
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDark ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
                </DropdownMenuItem>
                
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <MobileNav />
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Digite um comando ou busque..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Páginas">
            <CommandItem onSelect={() => navigate('/dashboard')}>
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate('/library')}>
              <Search className="mr-2 h-4 w-4" />
              <span>Biblioteca</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate('/study')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Estudar</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Ações Rápidas">
            {getQuickActions().map((action, index) => (
              <CommandItem 
                key={index}
                onSelect={() => {
                  action.action();
                  setIsCommandOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
                <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                  {action.shortcut}
                </kbd>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}