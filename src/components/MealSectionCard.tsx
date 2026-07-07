import { Plus, X } from "lucide-react";
import type { MealItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface MealSectionCardProps {
  title: string;
  emoji: string;
  items: MealItem[];
  onAdd: () => void;
  onUpdate: (id: string, text: string) => void;
  onUpdateProtein: (id: string, protein: number | null) => void;
  onRemove: (id: string) => void;
}

/**
 * One meal section (Breakfast/Lunch/Dinner/Snacks): a growable list of
 * plain-text inputs, each with its own protein amount. The hook backing
 * `items` always pads this list up to 3 rows with client-side-only
 * placeholders — nothing is saved until the user actually types into one,
 * so this component itself never needs to create rows just to stay non-empty.
 */
export function MealSectionCard({
  title,
  emoji,
  items,
  onAdd,
  onUpdate,
  onUpdateProtein,
  onRemove,
}: MealSectionCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="flex items-center gap-1.5 font-display font-bold">
          <span>{emoji}</span> {title}
        </span>

        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              placeholder={`What did you have for ${title.toLowerCase()}?`}
              value={item.text}
              onChange={(e) => onUpdate(item.id, e.target.value)}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <label htmlFor={`protein-${item.id}`} className="text-xs font-medium text-muted-foreground">
                Protein:
              </label>
              <Input
                id={`protein-${item.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                value={item.protein ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onUpdateProtein(item.id, raw === "" ? null : Number(raw));
                }}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label="Remove item"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </CardContent>
    </Card>
  );
}
