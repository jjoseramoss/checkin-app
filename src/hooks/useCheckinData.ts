import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckIn, Frequency, Target } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { todayKey, weekKey } from "@/lib/utils";

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

interface CheckInRow {
  id: string;
  target_id: string;
  user_id: string;
  period_key: string;
  note: string | null;
  completed_at: string;
}

function targetFromRow(r: TargetRow): Target {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    emoji: r.emoji,
    frequency: r.frequency,
    weeklyGoal: r.weekly_goal ?? undefined,
    colorHex: r.color_hex,
    createdAt: r.created_at,
    archived: r.archived,
  };
}

function checkInFromRow(r: CheckInRow): CheckIn {
  return {
    id: r.id,
    targetId: r.target_id,
    userId: r.user_id,
    periodKey: r.period_key,
    note: r.note ?? undefined,
    completedAt: r.completed_at,
  };
}

/**
 * Real Supabase-backed targets + check-ins for the signed-in user. A brand
 * new account starts with zero rows in both tables, so this is genuinely
 * empty until the user creates their first target.
 */
export function useCheckinData() {
  const { userId } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setTargets([]);
      setCheckIns([]);
      setIsLoading(false);
      return;
    }
    const [{ data: targetRows }, { data: checkInRows }] = await Promise.all([
      supabase.from("targets").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("check_ins").select("*").eq("user_id", userId),
    ]);
    setTargets(((targetRows as TargetRow[]) ?? []).map(targetFromRow));
    setCheckIns(((checkInRows as CheckInRow[]) ?? []).map(checkInFromRow));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  const myTargets = useMemo(() => targets.filter((t) => !t.archived), [targets]);

  const currentPeriodKey = useCallback((t: Target) => (t.frequency === "daily" ? todayKey() : weekKey()), []);

  const isCompletedNow = useCallback(
    (targetId: string) => {
      const t = targets.find((x) => x.id === targetId);
      if (!t) return false;
      const period = currentPeriodKey(t);
      return checkIns.some((c) => c.targetId === targetId && c.periodKey === period);
    },
    [targets, checkIns, currentPeriodKey]
  );

  const streakFor = useCallback(
    (targetId: string) => {
      const t = targets.find((x) => x.id === targetId);
      if (!t) return 0;
      const keys = checkIns
        .filter((c) => c.targetId === targetId)
        .map((c) => c.periodKey)
        .sort()
        .reverse();
      const keySet = new Set(keys);
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 400; i++) {
        const key = t.frequency === "daily" ? cursor.toISOString().slice(0, 10) : weekKey(cursor);
        if (keySet.has(key)) {
          streak++;
          cursor.setDate(cursor.getDate() - (t.frequency === "daily" ? 1 : 7));
        } else if (i === 0) {
          cursor.setDate(cursor.getDate() - (t.frequency === "daily" ? 1 : 7));
        } else {
          break;
        }
      }
      return streak;
    },
    [targets, checkIns]
  );

  const toggleComplete = useCallback(
    async (targetId: string, note?: string) => {
      if (!userId) return;
      const t = targets.find((x) => x.id === targetId);
      if (!t) return;
      const period = currentPeriodKey(t);
      const existing = checkIns.find((c) => c.targetId === targetId && c.periodKey === period);

      if (existing) {
        const { error } = await supabase.from("check_ins").delete().eq("id", existing.id);
        if (!error) setCheckIns((prev) => prev.filter((c) => c.id !== existing.id));
        return;
      }

      const { data, error } = await supabase
        .from("check_ins")
        .insert({
          target_id: targetId,
          user_id: userId,
          period_key: period,
          note: note?.trim() || null,
        })
        .select()
        .single();
      if (!error && data) setCheckIns((prev) => [checkInFromRow(data as CheckInRow), ...prev]);
    },
    [targets, checkIns, userId, currentPeriodKey]
  );

  const addTarget = useCallback(
    async (input: Pick<Target, "title" | "emoji" | "frequency" | "colorHex" | "weeklyGoal">) => {
      if (!userId) return undefined;
      const { data, error } = await supabase
        .from("targets")
        .insert({
          user_id: userId,
          title: input.title,
          emoji: input.emoji,
          frequency: input.frequency,
          weekly_goal: input.weeklyGoal ?? null,
          color_hex: input.colorHex,
        })
        .select()
        .single();
      if (error || !data) return undefined;
      const target = targetFromRow(data as TargetRow);
      setTargets((prev) => [...prev, target]);
      return target;
    },
    [userId]
  );

  const updateTarget = useCallback(async (id: string, patch: Partial<Target>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
    if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency;
    if (patch.weeklyGoal !== undefined) dbPatch.weekly_goal = patch.weeklyGoal;
    if (patch.colorHex !== undefined) dbPatch.color_hex = patch.colorHex;
    if (patch.archived !== undefined) dbPatch.archived = patch.archived;
    if (Object.keys(dbPatch).length === 0) return;

    const { data, error } = await supabase.from("targets").update(dbPatch).eq("id", id).select().single();
    if (!error && data) {
      const updated = targetFromRow(data as TargetRow);
      setTargets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }, []);

  const deleteTarget = useCallback(async (id: string) => {
    const { error } = await supabase.from("targets").delete().eq("id", id);
    if (!error) {
      setTargets((prev) => prev.filter((t) => t.id !== id));
      setCheckIns((prev) => prev.filter((c) => c.targetId !== id));
    }
  }, []);

  const checkInsForTarget = useCallback(
    (targetId: string) => checkIns.filter((c) => c.targetId === targetId),
    [checkIns]
  );

  return {
    targets,
    checkIns,
    myTargets,
    isLoading,
    isCompletedNow,
    streakFor,
    toggleComplete,
    addTarget,
    updateTarget,
    deleteTarget,
    checkInsForTarget,
  };
}
