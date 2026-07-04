# Check In — Prototype

A local, no-login prototype of the check-in app: dashboard (add/complete/edit/delete targets with a GitHub-style activity grid) and an Instagram-style friend feed. State is seeded with mock data and persisted to `localStorage` so it survives refreshes.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). On your phone, open the same URL on your local network (or deploy it) and use "Add to Home Screen" to try the app-like mobile experience — the layout is capped at a phone-sized column and has a bottom tab bar.

## What's here

- **Dashboard** (`src/pages/Dashboard.tsx`) — add a target, mark it complete with an optional note, rename, delete. Each target shows a streak count and a 12-week activity grid.
- **Feed** (`src/pages/Feed.tsx`) — reverse-chronological check-ins from you and mock friends, with notes.
- **Profile** (`src/pages/Profile.tsx`) — placeholder stats; real editing arrives with Supabase auth.
- **Data layer** (`src/hooks/useCheckinData.ts`, `src/data/mock.ts`) — this is the seam that gets swapped for Supabase queries/mutations. Everything reads/writes through this hook, so wiring up a real backend later means replacing the hook's internals, not the UI.

## Not included yet (by design)

- Auth (Google / email via Supabase)
- Real user profiles / avatars upload
- Cross-device sync (currently per-browser `localStorage`)

See the separate Supabase setup guide for the step-by-step plan to add these.

## Stack

Vite + React + TypeScript + Tailwind CSS + hand-rolled shadcn/ui-style components (Radix primitives under the hood) + lucide-react icons.
