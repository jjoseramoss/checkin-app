import type { CheckIn, Target, UserProfile } from "@/types";
import { toDateKey, weekKey } from "@/lib/utils";

export const CURRENT_USER_ID = "u-jose";

export const users: UserProfile[] = [
  {
    id: "u-jose",
    username: "jose",
    displayName: "Jose Ramos",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=jose",
    bio: "75 Hard, attempt #2.",
  },
  {
    id: "u-marco",
    username: "marco.a",
    displayName: "Marco Alvarez",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=marco",
    bio: "Chasing a sub-4 marathon.",
  },
  {
    id: "u-sam",
    username: "samlogs",
    displayName: "Sam Nguyen",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=sam",
    bio: "Reading more, scrolling less.",
  },
  {
    id: "u-ana",
    username: "ana.k",
    displayName: "Ana Kowalski",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=ana",
    bio: "10k steps or bust.",
  },
];

function daysAgoISO(n: number, hour = 8, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const targets: Target[] = [
  {
    id: "t-workout",
    userId: "u-jose",
    title: "Workout",
    emoji: "🏋️",
    frequency: "daily",
    colorHex: "#b3813f",
    createdAt: daysAgoISO(40),
  },
  {
    id: "t-water",
    userId: "u-jose",
    title: "Drink a gallon of water",
    emoji: "💧",
    frequency: "daily",
    colorHex: "#3f7fb3",
    createdAt: daysAgoISO(40),
  },
  {
    id: "t-read",
    userId: "u-jose",
    title: "Read 10 pages",
    emoji: "📚",
    frequency: "daily",
    colorHex: "#6f5aa3",
    createdAt: daysAgoISO(25),
  },
  {
    id: "t-fast",
    userId: "u-jose",
    title: "Fast until 12pm",
    emoji: "⏳",
    frequency: "daily",
    colorHex: "#a34c4c",
    createdAt: daysAgoISO(15),
  },
  {
    id: "t-steps",
    userId: "u-jose",
    title: "Walk 10k steps",
    emoji: "👣",
    frequency: "daily",
    colorHex: "#4c9a6a",
    createdAt: daysAgoISO(40),
  },
  {
    id: "t-run",
    userId: "u-marco",
    title: "Run 5k",
    emoji: "🏃",
    frequency: "daily",
    colorHex: "#b3813f",
    createdAt: daysAgoISO(50),
  },
  {
    id: "t-guitar",
    userId: "u-sam",
    title: "Practice guitar",
    emoji: "🎸",
    frequency: "weekly",
    weeklyGoal: 4,
    colorHex: "#6f5aa3",
    createdAt: daysAgoISO(30),
  },
  {
    id: "t-steps-ana",
    userId: "u-ana",
    title: "Walk 10k steps",
    emoji: "👣",
    frequency: "daily",
    colorHex: "#4c9a6a",
    createdAt: daysAgoISO(20),
  },
];

// Deterministic pseudo-random streak generator so the activity grid looks lived-in.
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildDailyHistory(
  targetId: string,
  userId: string,
  seed: number,
  days: number,
  hitRate: number
): CheckIn[] {
  const rand = seededRandom(seed);
  const entries: CheckIn[] = [];
  for (let i = days; i >= 1; i--) {
    if (rand() < hitRate) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      entries.push({
        id: `${targetId}-${i}`,
        targetId,
        userId,
        periodKey: toDateKey(d),
        completedAt: daysAgoISO(i, 6 + Math.floor(rand() * 14)),
      });
    }
  }
  return entries;
}

export const checkIns: CheckIn[] = [
  ...buildDailyHistory("t-workout", "u-jose", 1, 34, 0.82),
  ...buildDailyHistory("t-water", "u-jose", 2, 34, 0.7),
  ...buildDailyHistory("t-read", "u-jose", 3, 24, 0.6),
  ...buildDailyHistory("t-fast", "u-jose", 4, 14, 0.75),
  ...buildDailyHistory("t-steps", "u-jose", 5, 34, 0.88),
  ...buildDailyHistory("t-run", "u-marco", 6, 34, 0.65),
  ...buildDailyHistory("t-steps-ana", "u-ana", 7, 19, 0.9),

  // Notes on a handful of recent, real entries so the feed has substance.
  {
    id: "note-1",
    targetId: "t-workout",
    userId: "u-jose",
    periodKey: toDateKey(new Date()),
    note: "Push day — hit a new bench PR, 185lb x 5.",
    completedAt: daysAgoISO(0, 7, 20),
  },
  {
    id: "note-2",
    targetId: "t-run",
    userId: "u-marco",
    periodKey: toDateKey(new Date()),
    note: "Easy 5k before work, felt smooth. 24:10.",
    completedAt: daysAgoISO(0, 6, 45),
  },
  {
    id: "note-3",
    targetId: "t-guitar",
    userId: "u-sam",
    periodKey: weekKey(),
    note: "Finally nailed the bridge to that Radiohead song.",
    completedAt: daysAgoISO(1, 20, 5),
  },
  {
    id: "note-4",
    targetId: "t-steps-ana",
    userId: "u-ana",
    periodKey: toDateKey(new Date()),
    note: "Hit 12,400 steps — took the long way home.",
    completedAt: daysAgoISO(0, 18, 30),
  },
  {
    id: "note-5",
    targetId: "t-water",
    userId: "u-jose",
    periodKey: toDateKey(new Date()),
    note: "",
    completedAt: daysAgoISO(0, 9, 0),
  },
  {
    id: "note-6",
    targetId: "t-read",
    userId: "u-jose",
    periodKey: toDateKey(new Date(Date.now() - 86400000)),
    note: "Started Atomic Habits again, 20 pages in.",
    completedAt: daysAgoISO(1, 22, 0),
  },
].filter(
  (c, idx, arr) =>
    // de-dupe if a seeded entry landed on the same period as a hand-written note
    arr.findIndex(
      (o) => o.targetId === c.targetId && o.periodKey === c.periodKey
    ) === idx
);

export function getUser(userId: string): UserProfile | undefined {
  return users.find((u) => u.id === userId);
}

export function getTarget(targetId: string): Target | undefined {
  return targets.find((t) => t.id === targetId);
}
