import { useMemo } from "react";
import { cn, toDateKey } from "@/lib/utils";
import type { CheckIn, Target } from "@/types";

interface ActivityGridProps {
  target: Target;
  checkIns: CheckIn[];
  weeks?: number;
}

/**
 * GitHub-contribution-style grid: one column per week, one cell per day,
 * most recent week on the right. Filled cells use the target's color.
 */
export function ActivityGrid({ target, checkIns, weeks = 10 }: ActivityGridProps) {
  const doneKeys = useMemo(
    () => new Set(checkIns.filter((c) => c.targetId === target.id).map((c) => c.periodKey)),
    [checkIns, target.id]
  );

  const days = weeks * 7;
  const cells = useMemo(() => {
    const today = new Date();
    // Align the grid so the last column ends on today's weekday column.
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    // Roll back to the most recent Sunday so weeks line up as columns.
    const startDow = start.getDay();
    start.setDate(start.getDate() - startDow);

    const totalCells = Math.ceil((days + startDow) / 7) * 7;
    const out: { key: string; date: Date; done: boolean; future: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toDateKey(d);
      out.push({
        key,
        date: d,
        done: doneKeys.has(key),
        future: d > today,
      });
    }
    return out;
  }, [days, doneKeys]);

  const columns: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex gap-[3px] overflow-hidden">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell) => (
            <div
              key={cell.key}
              title={cell.key}
              className={cn(
                "h-[10px] w-[10px] rounded-[2px]",
                cell.future ? "opacity-0" : "bg-muted"
              )}
              style={
                cell.done && !cell.future
                  ? { backgroundColor: target.colorHex }
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
