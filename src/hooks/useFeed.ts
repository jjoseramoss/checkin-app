import { useEffect, useState } from "react";
import type { CheckIn, Frequency, Target, UserProfile } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCheckinData } from "@/hooks/useCheckinData";
import { useMyProfile } from "@/hooks/useMyProfile";

export interface FeedEntry {
  checkIn: CheckIn;
  target: Target;
  user: UserProfile;
  streak: number;
}

interface CheckInRow {
  id: string;
  target_id: string;
  user_id: string;
  period_key: string;
  note: string | null;
  completed_at: string;
}

interface TargetRow {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  frequency: Frequency;
  weekly_goal: number | null;
  color_hex: string;
  created_at: string;
  archived: boolean;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

/**
 * The feed's data layer. Visibility (yours + accepted/pending connections)
 * is enforced entirely by the check_ins RLS policy via are_connected() —
 * this query is just "give me recent check-ins", and Postgres only ever
 * hands back rows this user is allowed to see. "Automatic" means it's fully
 * reactive on mount; a realtime subscription can replace the effect later
 * without changing the shape consumers see.
 */
export function useFeed() {
  const { userId } = useAuth();
  const { streakFor } = useCheckinData();
  const { profile: me } = useMyProfile();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setEntries([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const { data: checkInRows } = await supabase
        .from("check_ins")
        .select("*")
        .order("completed_at", { ascending: false })
        .limit(60);

      const rows = (checkInRows as CheckInRow[]) ?? [];
      // Your own check-ins only show up in the feed when they carry a note —
      // matches the original "share something worth seeing" behavior.
      const relevant = rows.filter((c) => c.user_id !== userId || !!c.note);

      if (relevant.length === 0) {
        if (!cancelled) {
          setEntries([]);
          setIsLoading(false);
        }
        return;
      }

      const targetIds = Array.from(new Set(relevant.map((c) => c.target_id)));
      const otherUserIds = Array.from(new Set(relevant.map((c) => c.user_id).filter((id) => id !== userId)));

      const [{ data: targetRows }, { data: profileRows }] = await Promise.all([
        supabase.from("targets").select("*").in("id", targetIds),
        supabase.from("profiles").select("id, username, display_name, avatar_url, bio").in("id", otherUserIds),
      ]);

      const targetMap = new Map(((targetRows as TargetRow[]) ?? []).map((t) => [t.id, t]));
      const profileMap = new Map(((profileRows as ProfileRow[]) ?? []).map((p) => [p.id, p]));

      const built: FeedEntry[] = [];
      for (const c of relevant) {
        const t = targetMap.get(c.target_id);
        if (!t) continue;

        let user: UserProfile | undefined;
        if (c.user_id === userId) {
          user = me;
        } else {
          const p = profileMap.get(c.user_id);
          user = p ? { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url ?? "", bio: p.bio ?? undefined } : undefined;
        }
        if (!user) continue;

        built.push({
          checkIn: {
            id: c.id,
            targetId: c.target_id,
            userId: c.user_id,
            periodKey: c.period_key,
            note: c.note ?? undefined,
            completedAt: c.completed_at,
          },
          target: {
            id: t.id,
            userId: t.user_id,
            title: t.title,
            emoji: t.emoji,
            frequency: t.frequency,
            weeklyGoal: t.weekly_goal ?? undefined,
            colorHex: t.color_hex,
            createdAt: t.created_at,
            archived: t.archived,
          },
          user,
          streak: c.user_id === userId ? streakFor(t.id) : 0,
        });
      }

      if (!cancelled) {
        setEntries(built);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, me, streakFor]);

  return { entries, isLoading };
}
