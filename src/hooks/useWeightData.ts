import { useCallback, useEffect, useState } from "react";
import type { WeightEntry } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { todayKey, daysAgoKey } from "@/lib/utils";

export type WeightRange = "week" | "month" | "year";

interface WeightRow {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  created_at: string;
}

function fromRow(r: WeightRow): WeightEntry {
  return { id: r.id, userId: r.user_id, date: r.date, weight: Number(r.weight), createdAt: r.created_at };
}

/**
 * Real Supabase-backed weight log for the signed-in user. Empty until they
 * log their first entry — one row per (user, date), upserted on re-log.
 */
export function useWeightData() {
  const { userId } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("weight_entries")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    setEntries(((data as WeightRow[]) ?? []).map(fromRow));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  const latestEntry = entries.length ? entries[entries.length - 1] : undefined;

  const logWeight = useCallback(
    async (weight: number, date: string = todayKey()) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("weight_entries")
        .upsert({ user_id: userId, date, weight }, { onConflict: "user_id,date" })
        .select()
        .single();
      if (!error && data) {
        const entry = fromRow(data as WeightRow);
        setEntries((prev) => [...prev.filter((e) => e.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)));
      }
    },
    [userId]
  );

  const entriesInRange = useCallback(
    (range: WeightRange) => {
      const daysBack = range === "week" ? 7 : range === "month" ? 30 : 365;
      const cutoff = daysAgoKey(daysBack);
      return entries.filter((e) => e.date >= cutoff);
    },
    [entries]
  );

  return { entries, latestEntry, isLoading, logWeight, entriesInRange };
}
