import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckIn, Target } from "@/types";
import {
  CURRENT_USER_ID,
  checkIns as seedCheckIns,
  targets as seedTargets,
} from "@/data/mock";
import { todayKey, weekKey } from "@/lib/utils";

const TARGETS_KEY = "checkin.targets.v1";
const CHECKINS_KEY = "checkin.checkins.v1";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Prototype data layer. Backed by localStorage + seeded mock data so the
 * demo feels persistent across reloads. This is the piece that gets swapped
 * for Supabase queries/mutations once auth + a real backend are wired up.
 */
export function useCheckinData() {
  const [targets, setTargets] = useState<Target[]>(() =>
    loadFromStorage(TARGETS_KEY, seedTargets)
  );
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() =>
    loadFromStorage(CHECKINS_KEY, seedCheckIns)
  );

  useEffect(() => {
    window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    window.localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns));
  }, [checkIns]);

  const myTargets = useMemo(
    () =>
      targets
        .filter((t) => t.userId === CURRENT_USER_ID && !t.archived)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [targets]
  );

  const currentPeriodKey = useCallback(
    (t: Target) => (t.frequency === "daily" ? todayKey() : weekKey()),
    []
  );

  const isCompletedNow = useCallback(
    (targetId: string) => {
      const t = targets.find((x) => x.id === targetId);
      if (!t) return false;
      const period = currentPeriodKey(t);
      return checkIns.some(
        (c) => c.targetId === targetId && c.periodKey === period
      );
    },
    [targets, checkIns, currentPeriodKey]
  );

  const streakFor = useCallback(
    (targetId: string) => {
      // Count consecutive completed days/weeks backward from the current period.
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
        const key =
          t.frequency === "daily"
            ? cursor.toISOString().slice(0, 10)
            : weekKey(cursor);
        if (keySet.has(key)) {
          streak++;
          cursor.setDate(cursor.getDate() - (t.frequency === "daily" ? 1 : 7));
        } else if (i === 0) {
          // today/this-week not done yet doesn't break an existing streak
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
    (targetId: string, note?: string) => {
      const t = targets.find((x) => x.id === targetId);
      if (!t) return;
      const period = currentPeriodKey(t);
      setCheckIns((prev) => {
        const existing = prev.find(
          (c) => c.targetId === targetId && c.periodKey === period
        );
        if (existing) {
          return prev.filter((c) => c.id !== existing.id);
        }
        const entry: CheckIn = {
          id: `${targetId}-${period}-${Date.now()}`,
          targetId,
          userId: CURRENT_USER_ID,
          periodKey: period,
          note: note?.trim() || undefined,
          completedAt: new Date().toISOString(),
        };
        return [entry, ...prev];
      });
    },
    [targets, currentPeriodKey]
  );

  const addTarget = useCallback(
    (input: Pick<Target, "title" | "emoji" | "frequency" | "colorHex" | "weeklyGoal">) => {
      const target: Target = {
        id: `t-${Date.now()}`,
        userId: CURRENT_USER_ID,
        createdAt: new Date().toISOString(),
        ...input,
      };
      setTargets((prev) => [...prev, target]);
      return target;
    },
    []
  );

  const updateTarget = useCallback((id: string, patch: Partial<Target>) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTarget = useCallback((id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setCheckIns((prev) => prev.filter((c) => c.targetId !== id));
  }, []);

  const checkInsForTarget = useCallback(
    (targetId: string) => checkIns.filter((c) => c.targetId === targetId),
    [checkIns]
  );

  return {
    targets,
    checkIns,
    myTargets,
    isCompletedNow,
    streakFor,
    toggleComplete,
    addTarget,
    updateTarget,
    deleteTarget,
    checkInsForTarget,
  };
}
