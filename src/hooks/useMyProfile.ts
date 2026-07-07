import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const MAX_PINNED = 3;

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  pinned_target_ids: string[] | null;
  onboarded: boolean;
}

const EMPTY_PROFILE: UserProfile = { id: "", username: "", displayName: "", avatarUrl: "" };

function toProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? "",
    bio: row.bio ?? undefined,
  };
}

interface ProfilePatch {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Real Supabase-backed profile for the signed-in user. Every consumer that
 * calls this hook gets its own fetch — there's no shared cache yet (that's
 * deferred to the phase 3 optimization pass), so a change made through one
 * instance won't be visible in another until it remounts or reloads itself.
 */
export function useMyProfile() {
  const { userId } = useAuth();
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setRow(null);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, pinned_target_ids, onboarded")
      .eq("id", userId)
      .single();
    if (!error && data) setRow(data as ProfileRow);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  function friendlyError(message: string): string {
    return message.toLowerCase().includes("duplicate") ? "That username is taken — try another." : message;
  }

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<{ error: string | null }> => {
      if (!userId) return { error: "Not signed in" };
      const dbPatch: Record<string, unknown> = {};
      if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
      if (patch.username !== undefined) dbPatch.username = patch.username;
      if (patch.bio !== undefined) dbPatch.bio = patch.bio;
      if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
      if (Object.keys(dbPatch).length === 0) return { error: null };

      const { data, error } = await supabase
        .from("profiles")
        .update(dbPatch)
        .eq("id", userId)
        .select("id, username, display_name, avatar_url, bio, pinned_target_ids, onboarded")
        .single();
      if (error) return { error: friendlyError(error.message) };
      setRow(data as ProfileRow);
      return { error: null };
    },
    [userId]
  );

  const setPinnedTargets = useCallback(
    async (ids: string[]) => {
      if (!userId) return;
      const trimmed = ids.slice(0, MAX_PINNED);
      const { data, error } = await supabase
        .from("profiles")
        .update({ pinned_target_ids: trimmed })
        .eq("id", userId)
        .select("id, username, display_name, avatar_url, bio, pinned_target_ids, onboarded")
        .single();
      if (!error && data) setRow(data as ProfileRow);
    },
    [userId]
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ error: string | null }> => {
      if (!userId) return { error: "Not signed in" };
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately even if the path is unchanged.
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      return updateProfile({ avatarUrl });
    },
    [userId, updateProfile]
  );

  const completeOnboarding = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", userId)
      .select("id, username, display_name, avatar_url, bio, pinned_target_ids, onboarded")
      .single();
    if (!error && data) setRow(data as ProfileRow);
  }, [userId]);

  return {
    profile: row ? toProfile(row) : EMPTY_PROFILE,
    pinnedTargetIds: row?.pinned_target_ids ?? [],
    // Default true so we never flash the onboarding modal before the real value has loaded.
    onboarded: row?.onboarded ?? true,
    isLoading,
    updateProfile,
    setPinnedTargets,
    uploadAvatar,
    completeOnboarding,
    maxPinned: MAX_PINNED,
  };
}
