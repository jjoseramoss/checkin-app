import { getUser, CURRENT_USER_ID } from "@/data/mock";
import { useCheckinData } from "@/hooks/useCheckinData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export function Profile() {
  const me = getUser(CURRENT_USER_ID)!;
  const { myTargets, streakFor } = useCheckinData();
  const bestStreak = Math.max(0, ...myTargets.map((t) => streakFor(t.id)));

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
          Profile.
        </h1>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarImage src={me.avatarUrl} alt={me.displayName} />
            <AvatarFallback className="text-2xl">{me.displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl font-bold">{me.displayName}</p>
            <p className="text-sm text-muted-foreground">@{me.username}</p>
          </div>
          {me.bio && <p className="text-sm text-foreground/80">{me.bio}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="font-display text-2xl font-black">{myTargets.length}</span>
            <span className="text-xs text-muted-foreground">active targets</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="font-display text-2xl font-black">{bestStreak}</span>
            <span className="text-xs text-muted-foreground">best current streak</span>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Sign-in, editable profile picture, and username will be wired up once
        Supabase auth is connected.
      </p>
    </div>
  );
}
