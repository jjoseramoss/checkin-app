import { useMemo } from "react";
import { getUser, CURRENT_USER_ID } from "@/data/mock";
import { useCheckinData } from "@/hooks/useCheckinData";
import { TargetCard } from "@/components/TargetCard";
import { AddTargetDialog } from "@/components/AddTargetDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Dashboard() {
  const {
    myTargets,
    checkInsForTarget,
    isCompletedNow,
    streakFor,
    toggleComplete,
    addTarget,
    updateTarget,
    deleteTarget,
  } = useCheckinData();

  const me = getUser(CURRENT_USER_ID)!;

  const completedToday = useMemo(
    () => myTargets.filter((t) => isCompletedNow(t.id)).length,
    [myTargets, isCompletedNow]
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
            Your targets.
          </h1>
        </div>
        <Avatar className="h-11 w-11 border border-border">
          <AvatarImage src={me.avatarUrl} alt={me.displayName} />
          <AvatarFallback>{me.displayName[0]}</AvatarFallback>
        </Avatar>
      </header>

      {myTargets.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-display text-base font-bold text-foreground">
            {completedToday}/{myTargets.length}
          </span>
          done so far today
        </div>
      )}

      <AddTargetDialog onCreate={addTarget} />

      <div className="flex flex-col gap-3">
        {myTargets.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No targets yet — add your first one above.
          </p>
        )}
        {myTargets.map((t) => (
          <TargetCard
            key={t.id}
            target={t}
            checkIns={checkInsForTarget(t.id)}
            completed={isCompletedNow(t.id)}
            streak={streakFor(t.id)}
            onToggle={(note) => toggleComplete(t.id, note)}
            onDelete={() => deleteTarget(t.id)}
            onRename={(title) => updateTarget(t.id, { title })}
          />
        ))}
      </div>
    </div>
  );
}
