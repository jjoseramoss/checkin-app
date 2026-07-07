import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthResult {
  error: string | null;
  /** True when signup succeeded but email confirmation is required before a session exists. */
  needsEmailConfirmation?: boolean;
}

/**
 * Real Supabase auth (email/password). Session state is reactive — every
 * component that calls useAuth() shares the same underlying supabase client,
 * so signing in from the Auth screen automatically flips `isAuthed` for
 * whoever else is watching it (e.g. App.tsx), no manual wiring needed.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) return { error: null, needsEmailConfirmation: true };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    isAuthed: !!session,
    isLoading,
    userId: session?.user.id ?? null,
    signUp,
    signIn,
    logout,
  };
}
