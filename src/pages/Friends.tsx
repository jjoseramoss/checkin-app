import { useMemo, useState } from "react";
import { UserPlus, Check, X } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { FriendCard } from "@/components/FriendCard";
import { UserProfileDialog, type FriendStatus } from "@/components/UserProfileDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Friends() {
  const {
    friendIds,
    incomingIds,
    discoverable,
    profiles,
    friendCount,
    statusFor,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriends();

  const [query, setQuery] = useState("");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const friends = friendIds.map((id) => profileById.get(id)).filter((u): u is NonNullable<typeof u> => !!u);
  const incoming = incomingIds.map((id) => profileById.get(id)).filter((u): u is NonNullable<typeof u> => !!u);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return discoverable;
    return discoverable.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [discoverable, query]);

  const viewingUser = viewingUserId ? profileById.get(viewingUserId) ?? null : null;
  const viewingStatus: FriendStatus = viewingUserId ? statusFor(viewingUserId) : "none";

  return (
    <div className="flex flex-col gap-6 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {friendCount} {friendCount === 1 ? "friend" : "friends"}
        </p>
        <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
          Friends.
        </h1>
      </header>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Invites
          </span>
          {incoming.map((u) => (
            <FriendCard
              key={u.id}
              user={u}
              onOpenProfile={() => setViewingUserId(u.id)}
              action={
                <>
                  <button
                    onClick={() => acceptRequest(u.id)}
                    aria-label="Accept"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => declineRequest(u.id)}
                    aria-label="Decline"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              }
            />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Find friends
        </span>
        <Input
          placeholder="Search by name or username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {discoverable.length === 0 ? "No one left to add." : "No matches."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((u) => {
              const status = statusFor(u.id);
              return (
                <FriendCard
                  key={u.id}
                  user={u}
                  onOpenProfile={() => setViewingUserId(u.id)}
                  action={
                    status === "outgoing" ? (
                      <Button size="sm" variant="outline" disabled>
                        Sent
                      </Button>
                    ) : (
                      <button
                        onClick={() => sendRequest(u.id)}
                        aria-label="Add friend"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Your friends
        </span>
        {friends.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No friends yet — find someone above.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((u) => (
              <FriendCard
                key={u.id}
                user={u}
                onOpenProfile={() => setViewingUserId(u.id)}
                action={
                  <Button size="sm" variant="ghost" onClick={() => removeFriend(u.id)}>
                    Remove
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

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
