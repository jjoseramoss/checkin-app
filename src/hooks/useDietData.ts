import { useCallback, useEffect, useRef, useState } from "react";
import type { DietDay, MealSection } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { todayKey } from "@/lib/utils";

const MIN_ROWS = 3;
const SECTIONS: MealSection[] = ["breakfast", "lunch", "dinner", "snacks"];

interface ItemRow {
  id: string;
  user_id: string;
  date: string;
  section: MealSection;
  text: string;
  protein: number | null;
  created_at: string;
}

interface EditPatch {
  text?: string;
  protein?: number | null;
}

function emptyDay(userId: string, date: string): DietDay {
  return { userId, date, breakfast: [], lunch: [], dinner: [], snacks: [] };
}

function newPlaceholderKey(): string {
  return `placeholder-${crypto.randomUUID()}`;
}

function padSection(keys: string[]): string[] {
  const next = [...keys];
  while (next.length < MIN_ROWS) next.push(newPlaceholderKey());
  return next;
}

/**
 * Real Supabase-backed diet log for the signed-in user.
 *
 * Every row shown in the UI has a permanent "slot key" that never changes —
 * that's the React key AND the id passed to onUpdate/onRemove. Padding rows
 * (kept up to MIN_ROWS per section) start out as pure client-side
 * placeholders with no database row behind them; the first time the user
 * types into one, a real diet_items row is created and quietly attached to
 * that *same* slot key. Nothing about the row's identity changes when that
 * happens, which is what stops React from unmounting/remounting the input
 * (and losing focus mid-keystroke) the moment a row gets persisted.
 */
export function useDietData(date: string = todayKey()) {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [, bumpVersion] = useState(0);
  const bump = useCallback(() => bumpVersion((v) => v + 1), []);

  // Ordered slot keys per section — the single source of truth for row order/identity.
  const slotsRef = useRef<Record<MealSection, string[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });
  // Slot key -> persisted row, once one exists for that slot.
  const rowsBySlotRef = useRef<Record<string, ItemRow>>({});
  // Slot key -> text/protein typed into a not-yet-persisted placeholder.
  const draftsRef = useRef<Record<string, EditPatch>>({});
  // In-flight "create the real row" promise per slot key, so rapid keystrokes
  // only ever trigger one insert.
  const creatingRef = useRef<Record<string, Promise<ItemRow | null>>>({});
  // Placeholders removed by the user while their insert was still in flight.
  const removedRef = useRef<Set<string>>(new Set());

  const reload = useCallback(async () => {
    draftsRef.current = {};
    creatingRef.current = {};
    removedRef.current = new Set();

    if (!userId) {
      slotsRef.current = { breakfast: [], lunch: [], dinner: [], snacks: [] };
      rowsBySlotRef.current = {};
      setIsLoading(false);
      bump();
      return;
    }

    const { data } = await supabase
      .from("diet_items")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: true });

    const fetched = (data as ItemRow[]) ?? [];
    const rowsBySlot: Record<string, ItemRow> = {};
    const slots: Record<MealSection, string[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    for (const row of fetched) {
      rowsBySlot[row.id] = row;
      slots[row.section].push(row.id);
    }
    for (const section of SECTIONS) {
      slots[section] = padSection(slots[section]);
    }

    slotsRef.current = slots;
    rowsBySlotRef.current = rowsBySlot;
    setIsLoading(false);
    bump();
  }, [userId, date, bump]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  const day: DietDay = emptyDay(userId ?? "", date);
  let totalProtein = 0;
  for (const section of SECTIONS) {
    for (const key of slotsRef.current[section]) {
      const persisted = rowsBySlotRef.current[key];
      if (persisted) {
        day[section].push({ id: key, text: persisted.text, protein: persisted.protein });
        totalProtein += persisted.protein ?? 0;
      } else {
        const draft = draftsRef.current[key];
        day[section].push({ id: key, text: draft?.text ?? "", protein: draft?.protein ?? null });
      }
    }
  }

  const addItem = useCallback(
    async (section: MealSection) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("diet_items")
        .insert({ user_id: userId, date, section, text: "", protein: null })
        .select()
        .single();
      if (error || !data) return;
      const row = data as ItemRow;
      slotsRef.current = {
        ...slotsRef.current,
        [section]: [...slotsRef.current[section], row.id],
      };
      rowsBySlotRef.current = { ...rowsBySlotRef.current, [row.id]: row };
      bump();
    },
    [userId, date, bump]
  );

  const applyEdit = useCallback(
    async (section: MealSection, key: string, patch: EditPatch) => {
      const existing = rowsBySlotRef.current[key];
      if (existing) {
        rowsBySlotRef.current = { ...rowsBySlotRef.current, [key]: { ...existing, ...patch } };
        bump();
        await supabase.from("diet_items").update(patch).eq("id", existing.id);
        return;
      }

      if (!userId) return;

      const merged: EditPatch = { ...draftsRef.current[key], ...patch };
      draftsRef.current[key] = merged;
      bump();

      // A create for this slot is already running — it'll pick up the
      // latest draft text once it resolves, so there's nothing more to do.
      if (creatingRef.current[key]) return;

      creatingRef.current[key] = supabase
        .from("diet_items")
        .insert({
          user_id: userId,
          date,
          section,
          text: merged.text ?? "",
          protein: merged.protein ?? null,
        })
        .select()
        .single()
        .then(({ data, error }) => (error ? null : (data as ItemRow)));

      const created = await creatingRef.current[key];
      delete creatingRef.current[key];

      if (!created) return;

      if (removedRef.current.has(key)) {
        removedRef.current.delete(key);
        await supabase.from("diet_items").delete().eq("id", created.id);
        return;
      }

      // Pick up any keystrokes that landed while the insert was in flight.
      const latest = draftsRef.current[key];
      delete draftsRef.current[key];
      let finalRow = created;
      if (latest && (latest.text !== created.text || latest.protein !== created.protein)) {
        const { data } = await supabase
          .from("diet_items")
          .update({ text: latest.text ?? created.text, protein: latest.protein ?? created.protein })
          .eq("id", created.id)
          .select()
          .single();
        if (data) finalRow = data as ItemRow;
      }
      // Same slot key throughout — this is what keeps the input mounted.
      rowsBySlotRef.current = { ...rowsBySlotRef.current, [key]: finalRow };
      bump();
    },
    [userId, date, bump]
  );

  const updateItem = useCallback(
    (section: MealSection, id: string, text: string) => applyEdit(section, id, { text }),
    [applyEdit]
  );

  const updateProtein = useCallback(
    (section: MealSection, id: string, protein: number | null) => applyEdit(section, id, { protein }),
    [applyEdit]
  );

  const removeItem = useCallback(
    async (section: MealSection, key: string) => {
      const existing = rowsBySlotRef.current[key];

      slotsRef.current = {
        ...slotsRef.current,
        [section]: slotsRef.current[section].filter((k) => k !== key),
      };

      if (existing) {
        const nextRows = { ...rowsBySlotRef.current };
        delete nextRows[key];
        rowsBySlotRef.current = nextRows;
      } else {
        if (creatingRef.current[key]) removedRef.current.add(key);
        delete draftsRef.current[key];
      }

      // Keep at least MIN_ROWS visible.
      slotsRef.current = { ...slotsRef.current, [section]: padSection(slotsRef.current[section]) };
      bump();

      if (existing) {
        await supabase.from("diet_items").delete().eq("id", existing.id);
      }
    },
    [bump]
  );

  return { day, isLoading, totalProtein, addItem, updateItem, updateProtein, removeItem };
}
