import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Bell,
  HelpCircle,
  Palette,
  User,
  LogOut,
  Grid3X3,
  List,
  Calendar,
  BarChart3
} from "lucide-react";

interface TopbarProps {
  currentView?: string;
  onSearchClick?: () => void;
}

export default function ClickUpTopbar({ currentView = "List", onSearchClick }: TopbarProps) {
  const [location, navigate] = useLocation();
  const [searchValue, setSearchValue] = useState("");

  const views = [
    { id: "list", label: "List", icon: <List className="h-4 w-4" /> },
    { id: "board", label: "Board", icon: <Grid3X3 className="h-4 w-4" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
    { id: "gantt", label: "Chart", icon: <BarChart3 className="h-4 w-4" /> }
  ];

  const getPageTitle = () => {
    if (location === "/") return "Dashboard";
    if (location === "/library") return "Biblioteca";
    if (location === "/analytics") return "Analytics";
    if (location === "/goals") return "Metas";
    if (location === "/ai-assistant") return "AI Assistant";
    return "NuP-est";
  };

  const handleCreateNew = (type: string) => {
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
        navigate("/goal-builder");
        break;
    }
  };

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-4">
      {/* Left Section - Page Title & Views */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-900">
          {getPageTitle()}
        </h1>
        
        {/* Views Bar (only show on certain pages) */}
        {(location === "/library" || location === "/analytics") && (
          <div className="flex items-center bg-slate-50 rounded-lg p-1">
            {views.map((view) => (
              <Button
                key={view.id}
                variant={currentView === view.label ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-3 gap-1.5 text-xs",
                  currentView === view.label 
                    ? "bg-white shadow-sm" 
                    : "hover:bg-slate-100"
                )}
              >
                {view.icon}
                {view.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search or jump to..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClick={onSearchClick}
            className="pl-10 pr-16 h-9 bg-slate-50 border-slate-200 focus:bg-white"
            data-testid="input-global-search"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 font-mono">
            ⌘K
          </div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-2">
        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:bg-slate-100"
              data-testid="button-quick-create"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleCreateNew("area")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Área
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateNew("subject")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Matéria
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateNew("material")}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Material
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateNew("goal")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-slate-100 relative"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
        </Button>

        {/* Help */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-slate-100"
          data-testid="button-help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:bg-slate-100"
              data-testid="button-user-menu"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Palette className="h-4 w-4 mr-2" />
              Tema
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}