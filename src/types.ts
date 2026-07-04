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
