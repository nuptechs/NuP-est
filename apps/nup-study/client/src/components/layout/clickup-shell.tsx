import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import ClickUpSidebar from "./clickup-sidebar";
import ClickUpTopbar from "./clickup-topbar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Plus, BookOpen, Target, BarChart3, Brain } from "lucide-react";

interface ClickUpShellProps {
  children: React.ReactNode;
}

export default function ClickUpShell({ children }: ClickUpShellProps) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [, navigate] = useLocation();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      
      // Q for sidebar toggle (handled in sidebar component)
      if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Check if not in an input/textarea
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          // Trigger sidebar collapse via custom event
          window.dispatchEvent(new CustomEvent('toggle-sidebar'));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCommandPalette = () => {
    setIsCommandOpen(true);
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <ClickUpSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <ClickUpTopbar onSearchClick={handleOpenCommandPalette} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => {
              navigate("/library?create=area");
              setIsCommandOpen(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Área de Conhecimento
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/library?create=subject");
              setIsCommandOpen(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Matéria
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/library?create=material");
              setIsCommandOpen(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Material
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => {
              navigate("/");
              setIsCommandOpen(false);
            }}>
              <Search className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/library");
              setIsCommandOpen(false);
            }}>
              <BookOpen className="mr-2 h-4 w-4" />
              Biblioteca
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/analytics");
              setIsCommandOpen(false);
            }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/goals");
              setIsCommandOpen(false);
            }}>
              <Target className="mr-2 h-4 w-4" />
              Metas
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate("/ai-assistant");
              setIsCommandOpen(false);
            }}>
              <Brain className="mr-2 h-4 w-4" />
              AI Assistant
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}