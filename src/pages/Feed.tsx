import { useMemo } from "react";
import { checkIns, getTarget, getUser, CURRENT_USER_ID } from "@/data/mock";
import { useCheckinData } from "@/hooks/useCheckinData";
import { FeedItem } from "@/components/FeedItem";

export function Feed() {
  // Merge live (prototype) check-ins for "me" with the seeded friend activity
  // so actions taken on the Dashboard show up here immediately.
  const { checkIns: liveCheckIns, streakFor } = useCheckinData();

  const feed = useMemo(() => {
    const friendCheckIns = checkIns.filter((c) => c.userId !== CURRENT_USER_ID);
    const mine = liveCheckIns.filter((c) => c.userId === CURRENT_USER_ID && c.note);
    const combined = [...mine, ...friendCheckIns]
      .filter((c) => getTarget(c.targetId))
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 30);
    return combined;
  }, [liveCheckIns]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Friends
        </p>
        <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
          Activity feed.
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {feed.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing yet. Complete a target to see it here.
          </p>
        )}
        {feed.map((c) => {
          const target = getTarget(c.targetId);
          const user = getUser(c.userId);
          if (!target || !user) return null;
          const streak = c.userId === CURRENT_USER_ID ? streakFor(target.id) : 0;
          return (
            <FeedItem key={c.id} checkIn={c} target={target} user={user} streak={streak} />
          );
        })}
      </div>
    </div>
  );
}
