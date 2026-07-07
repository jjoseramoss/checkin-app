import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { useFriends } from "@/hooks/useFriends";
import { FeedItem } from "@/components/FeedItem";
import { UserProfileDialog, type FriendStatus } from "@/components/UserProfileDialog";
import { formatDayLabel, toDateKey } from "@/lib/utils";

export function Feed() {
  // Fully reactive: driven by check-ins + friendship state, so new activity
  // (yours or a connection's) appears automatically — same shape a Supabase
  // realtime subscription will fill in later.
  const { userId } = useAuth();
  const { entries } = useFeed();
  const { statusFor, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriends();

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const days = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = toDateKey(new Date(entry.checkIn.completedAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [entries]);

  const viewingEntry = entries.find((e) => e.user.id === viewingUserId);
  const viewingUser = viewingEntry?.user ?? null;
  const viewingStatus: FriendStatus = !viewingUserId
    ? "none"
    : viewingUserId === userId
      ? "self"
      : statusFor(viewingUserId);

  return (
    <div className="flex flex-col gap-6 px-4 pb-28 pt-6 md:mx-auto md:w-full md:max-w-2xl md:px-10 md:pb-12 md:pt-8">
      <header className="md:hidden">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Friends
        </p>
        <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
          Activity feed.
        </h1>
      </header>

      {days.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing yet. Complete a target to see it here.
        </p>
      )}

      {days.map(([dateKey, dayEntries]) => (
        <section key={dateKey} className="flex flex-col gap-3">
          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-1.5 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {formatDayLabel(dateKey)}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {dayEntries.map(({ checkIn, target, user, streak }) => (
              <FeedItem
                key={checkIn.id}
                checkIn={checkIn}
                target={target}
                user={user}
                streak={streak}
                onAvatarClick={() => setViewingUserId(user.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <UserProfileDialog
        user={viewingUser}
        status={viewingStatus}
        onOpenChange={(open) => !open && setViewingUserId(null)}
        onAdd={() => viewingUserId && sendRequest(viewingUserId)}
        onAccept={() => {
          if (viewingUserId) acceptRequest(viewingUserId);
          setViewingUserId(null);
        }}
        onDecline={() => {
          if (viewingUserId) declineRequest(viewingUserId);
          setViewingUserId(null);
        }}
        onRemove={() => {
          if (viewingUserId) removeFriend(viewingUserId);
          setViewingUserId(null);
        }}
      />
    </div>
  );
}
