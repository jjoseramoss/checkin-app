import { useRef, useState, type ChangeEvent } from "react";
import { Check, Rss, Scale, Target as TargetIcon, Upload, UtensilsCrossed, Users } from "lucide-react";
import type { UserProfile } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OnboardingFlowProps {
  profile: UserProfile;
  updateProfile: (patch: { username?: string }) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ error: string | null }>;
  onDone: () => void;
}

const FEATURES = [
  { icon: TargetIcon, title: "Targets", description: "Track daily or weekly habits with streaks and a contribution grid." },
  { icon: Rss, title: "Feed", description: "See your activity and your friends' — automatically, as it happens." },
  { icon: Scale, title: "Weight", description: "Log your weight and watch your progress over week, month, or year." },
  { icon: UtensilsCrossed, title: "Diet", description: "Jot down what you eat across breakfast, lunch, dinner, and snacks." },
  { icon: Users, title: "Friends", description: "Find people, send requests, and check out their public targets." },
];

/**
 * Mandatory, one-time flow shown right after a user's first sign-up (gated
 * on profiles.onboarded). Step 1 lets them set a username and, optionally,
 * a profile picture — leaving either untouched keeps the auto-generated
 * default. Step 2 is a short tour of what the app can do. Both dialogs are
 * non-dismissable (no X, no outside click, no escape) so a new user always
 * lands somewhere intentional before hitting the app.
 */
export function OnboardingFlow({ profile, updateProfile, uploadAvatar, onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<"profile" | "tour">("profile");
  const [username, setUsername] = useState(profile.username);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleContinue() {
    if (!username.trim()) {
      setError("Pick a username to continue.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (pendingFileRef.current) {
        const result = await uploadAvatar(pendingFileRef.current);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      if (username.trim() !== profile.username) {
        const result = await updateProfile({ username: username.trim() });
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setStep("tour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={step === "profile"} onOpenChange={() => {}}>
        <DialogContent
          showClose={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Welcome to TARIN</DialogTitle>
            <DialogDescription>Set up your profile — you can always change this later.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20 border border-border">
                <AvatarImage src={avatarPreview} alt={username} />
                <AvatarFallback className="text-2xl">{username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Add a photo
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onboarding-username">Username</Label>
              <Input
                id="onboarding-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button onClick={handleContinue} disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={step === "tour"} onOpenChange={() => {}}>
        <DialogContent
          showClose={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Here's what you can do</DialogTitle>
            <DialogDescription>A quick look around before you dive in.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={onDone}>
              <Check className="h-4 w-4" /> Get started
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
