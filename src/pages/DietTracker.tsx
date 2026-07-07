import { useCallback } from "react";
import { Drumstick } from "lucide-react";
import { useDietData } from "@/hooks/useDietData";
import { MealSectionCard } from "@/components/MealSectionCard";
import { Card, CardContent } from "@/components/ui/card";
import type { MealSection } from "@/types";
import { todayKey } from "@/lib/utils";

const SECTIONS: { key: MealSection; title: string; emoji: string }[] = [
  { key: "breakfast", title: "Breakfast", emoji: "🍳" },
  { key: "lunch", title: "Lunch", emoji: "🥪" },
  { key: "dinner", title: "Dinner", emoji: "🍝" },
  { key: "snacks", title: "Snacks", emoji: "🍎" },
];

export function DietTracker() {
  const { day, totalProtein, addItem, updateItem, updateProtein, removeItem } = useDietData(todayKey());

  const dayLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Stable per-section callbacks so MealSectionCard's effect deps don't churn.
  const makeAdd = useCallback((section: MealSection) => () => addItem(section), [addItem]);
  const makeUpdate = useCallback(
    (section: MealSection) => (id: string, text: string) => updateItem(section, id, text),
    [updateItem]
  );
  const makeUpdateProtein = useCallback(
    (section: MealSection) => (id: string, protein: number | null) => updateProtein(section, id, protein),
    [updateProtein]
  );
  const makeRemove = useCallback(
    (section: MealSection) => (id: string) => removeItem(section, id),
    [removeItem]
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-8">
      <header className="flex items-start justify-between md:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {dayLine}
          </p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
            Diet tracker.
          </h1>
        </div>
      </header>

      <div className="hidden items-center justify-between md:flex">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {dayLine}
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Drumstick className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total protein today</span>
            <span className="font-display text-xl font-bold">{totalProtein}g</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {SECTIONS.map((s) => (
          <MealSectionCard
            key={s.key}
            title={s.title}
            emoji={s.emoji}
            items={day[s.key]}
            onAdd={makeAdd(s.key)}
            onUpdate={makeUpdate(s.key)}
            onUpdateProtein={makeUpdateProtein(s.key)}
            onRemove={makeRemove(s.key)}
          />
        ))}
      </div>
    </div>
  );
}
