import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type View = "landing" | "login" | "signup";

/**
 * Email/password auth gate, backed by real Supabase auth (useAuth). On
 * success there's nothing else to do here — App.tsx's own useAuth() call
 * shares the same session state and swaps over to the main app on its own.
 */
export function Auth() {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goTo(next: View) {
    setError(null);
    setInfo(null);
    setView(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (view === "login") {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
      } else if (view === "signup") {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else if (result.needsEmailConfirmation) {
          setInfo("Account created — check your email to confirm it, then log in.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <img src="/target.png" alt="TARIN" className="h-20 w-20 object-contain md:h-24 md:w-24" />
        <h1 className="font-display text-5xl font-black tracking-tight md:text-6xl">TARIN</h1>
      </div>

      {view === "landing" && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" onClick={() => goTo("login")}>
            Log in
          </Button>
          <Button size="lg" variant="outline" onClick={() => goTo("signup")}>
            Sign up
          </Button>
        </div>
      )}

      {view !== "landing" && (
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {view === "signup" && (
              <span className="text-xs text-muted-foreground">At least 6 characters.</span>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}

          <Button type="submit" size="lg" className="mt-1" disabled={submitting}>
            {submitting ? "Please wait…" : view === "login" ? "Log in" : "Create account"}
          </Button>
          <button
            type="button"
            onClick={() => goTo("landing")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
