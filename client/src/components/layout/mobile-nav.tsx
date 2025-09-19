import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: "fa-home" },
  { name: "Busca", href: "/search", icon: "fa-search" },
  { name: "Biblioteca", href: "/library", icon: "fa-books" },
  { name: "Estudar", href: "/study", icon: "fa-graduation-cap" },
  { name: "Cards", href: "/flashcards", icon: "fa-layer-group" },
  { name: "Perfil", href: "/goals", icon: "fa-user" },
];

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/library" && ["/subjects", "/materials", "/knowledge-base"].includes(location));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center p-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`mobile-nav-${item.href.slice(1) || 'dashboard'}`}
            >
              <i className={`fas ${item.icon} text-xl`}></i>
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
