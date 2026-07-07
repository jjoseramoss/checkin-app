export type Frequency = "daily" | "weekly";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
}

export interface Target {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  frequency: Frequency;
  /** For weekly targets: how many times per week counts as "done". */
  weeklyGoal?: number;
  colorHex: string;
  createdAt: string; // ISO
  archived?: boolean;
}

export interface CheckIn {
  id: string;
  targetId: string;
  userId: string;
  /** YYYY-MM-DD for daily targets, YYYY-Www for weekly targets */
  periodKey: string;
  note?: string;
  completedAt: string; // ISO timestamp
}

export interface WeightEntry {
  id: string;
  userId: string;
  /** YYYY-MM-DD, one entry per day (logging again the same day overwrites it) */
  date: string;
  weight: number;
  createdAt: string; // ISO timestamp
}

export type MealSection = "breakfast" | "lunch" | "dinner" | "snacks";

export interface MealItem {
  id: string;
  text: string;
  protein: number | null;
}

export interface DietDay {
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
}
