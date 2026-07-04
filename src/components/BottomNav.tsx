import { LayoutGrid, Rss, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type Route = "dashboard" | "feed" | "profile";

interface BottomNavProps {
  route: Route;
  onNavigate: (r: Route) => void;
}

const items: { key: Route; label: string; icon: typeof LayoutGrid }[] = [
  { key: "dashboard", label: "Targets", icon: LayoutGrid },
  { key: "feed", label: "Feed", icon: Rss },
  { key: "profile", label: "Profile", icon: UserRound },
];

export function BottomNav({ route, onNavigate }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-sm items-center justify-around px-6 py-2">
        {items.map(({ key, label, icon: Icon }) => {
          const active = route === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.4 : 1.8}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.12 : 0}
              />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
