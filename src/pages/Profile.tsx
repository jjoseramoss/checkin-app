import { Scale, LogOut } from "lucide-react";
import { useCheckinData } from "@/hooks/useCheckinData";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useWeightData } from "@/hooks/useWeightData";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ChooseTargetsDialog } from "@/components/ChooseTargetsDialog";

export function Profile() {
  const {
    profile: me,
    pinnedTargetIds,
    updateProfile,
    uploadAvatar,
    setPinnedTargets,
    maxPinned,
  } = useMyProfile();
  const { myTargets, streakFor } = useCheckinData();
  const { latestEntry } = useWeightData();
  const { friendCount } = useFriends();
  const { logout } = useAuth();

  const bestStreak = Math.max(0, ...myTargets.map((t) => streakFor(t.id)));
  const pinnedTargets = myTargets.filter((t) => pinnedTargetIds.includes(t.id));

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-6 md:mx-auto md:w-full md:max-w-xl md:px-10 md:pb-12 md:pt-8">
      <header className="flex items-start justify-between md:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Account
          </p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
            Profile.
          </h1>
        </div>
        <ThemeSwitch className="mt-1" />
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarImage src={me.avatarUrl} alt={me.displayName} />
            <AvatarFallback className="text-2xl">{me.displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl font-bold">{me.displayName}</p>
            <p className="text-sm text-muted-foreground">
              @{me.username} · {friendCount} {friendCount === 1 ? "friend" : "friends"}
            </p>
          </div>
          {me.bio && <p className="text-sm text-foreground/80">{me.bio}</p>}
          <EditProfileDialog profile={me} onSave={updateProfile} onUploadAvatar={uploadAvatar} />
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

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Current weight</span>
            <span className="font-display text-xl font-bold">
              {latestEntry ? `${latestEntry.weight.toFixed(1)} lbs` : "Not logged yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Featured targets
          </span>
          <ChooseTargetsDialog
            targets={myTargets}
            pinnedTargetIds={pinnedTargetIds}
            maxPinned={maxPinned}
            onSave={setPinnedTargets}
          />
        </div>
        {pinnedTargets.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing featured yet — choose up to {maxPinned} targets to show here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pinnedTargets.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                    style={{ backgroundColor: `${t.colorHex}22` }}
                  >
                    {t.emoji}
                  </div>
                  <span className="flex-1 font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {streakFor(t.id)} day streak
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" onClick={logout} className="w-full">
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
