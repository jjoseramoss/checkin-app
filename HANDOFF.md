# TARIN — handoff summary

Status as of 2026-07-06. Written so this (or a future session/machine) can
pick up exactly where things left off.

## What exists

A working prototype: Vite + React + TypeScript + Tailwind CSS, hand-written
shadcn/ui-style components on top of Radix primitives. Everything currently
runs against mock data + `localStorage` — no network calls yet.

Pages/features:
- **Dashboard** (`src/pages/Dashboard.tsx`) — add/rename/delete targets, mark
  complete with an optional note, per-target streak, GitHub-style activity
  grid (`src/components/ActivityGrid.tsx`, month view on mobile / full year
  on large screens).
- **Feed** (`src/pages/Feed.tsx`) — day-grouped, reverse-chronological
  check-ins from you + your connections (accepted friends, or anyone with a
  pending request either direction — see `src/hooks/useFeed.ts`). Tapping an
  avatar opens that person's profile (`UserProfileDialog`).
- **Weight tracker** (`src/pages/WeightTracker.tsx`) — current weight, a
  week/month/year chart (`WeightChart.tsx`), log-weight input.
- **Diet tracker** (`src/pages/DietTracker.tsx`) — breakfast/lunch/dinner/
  snacks, growable free-text entries per section per day.
- **Friends** (`src/pages/Friends.tsx`) — search/discover, incoming invites
  (accept/decline), your friends list, view-profile dialog with add/remove.
- **Profile** (`src/pages/Profile.tsx`) — edit avatar/name/bio, pick up to 3
  featured targets, shows current weight + friend count, log out.
- **Auth** (`src/pages/Auth.tsx`) — simple local gate (email/password form,
  no real backend yet — any submission logs you in). This is the seam that
  becomes real Supabase auth in phase 2 below.
- Dark mode (`src/hooks/useTheme.tsx`), responsive dashboard-style desktop
  layout with a sidebar (`Sidebar.tsx`) + top bar (`TopBar.tsx`), mobile
  bottom nav with a "More" sheet for secondary routes (`BottomNav.tsx`).
- Branding: app is called **TARIN**, icon at `public/target.png`.
- Data layer is intentionally isolated per feature — `useCheckinData`,
  `useMyProfile`, `useWeightData`, `useDietData`, `useFriends`, `useFeed`,
  `useAuth` — each hook owns one concern and is the only place that needs
  rewriting to swap in Supabase. Components never touch `localStorage`
  directly.

Also in the folder:
- `README.md` — how to run the prototype.
- `SUPABASE_SETUP.md` — the full migration plan, in 3 phases (see below).
- `.env.example` — committed, shows the two env vars the app needs.
- `.env` — gitignored, currently empty placeholders, waiting to be filled in.

## Supabase migration — where things stand

This is a 3-phase migration, tracked in detail in `SUPABASE_SETUP.md`.
**Only phase 1 has started.** Do not jump ahead — each phase depends on the
last one actually being verified, not just written.

### Phase 1 — Database & auth infrastructure (in progress)

Nothing in the app code changes yet. This is purely: create the Supabase
project, run the schema, set RLS, set up the storage bucket, fill in `.env`.
Full checklist and copy-paste SQL is in `SUPABASE_SETUP.md` section 0.

Schema covers all 6 tables the app needs: `profiles`, `targets`,
`check_ins`, `weight_entries`, `diet_items`, `friendships`. RLS is scoped
per-feature (public profiles/targets for discovery, friend-gated check-ins
for the feed, fully private weight/diet, friendships visible only to the
two people involved) — see `SUPABASE_SETUP.md` section 4 for the reasoning.

**Status**: waiting on the user to actually create the project and run the
SQL in the Supabase dashboard, then confirm before phase 2 starts.

### Phase 2 — Rewire the hooks (not started)

Once phase 1 is confirmed done: `npm install @supabase/supabase-js`, create
`src/lib/supabase.ts`, then swap each hook's internals (table in
`SUPABASE_SETUP.md`, "What happens in phase 2"). Components using these
hooks should need zero changes, since each hook's return shape stays the
same — only what's inside changes.

Auth specifically: `useAuth` gets rewired to real
`supabase.auth.signUp`/`signInWithPassword`/`signOut`, gated on
`supabase.auth.getSession()` + `onAuthStateChange`. `Auth.tsx`'s UI doesn't
need to change, just what `onAuthed` actually does.

### Phase 3 — Caching & optimization (not started, deferred until phase 2 works end-to-end)

The plan: cache reads in localStorage (or a small query-caching library) so
pages render instantly from last-known data while revalidating in the
background; optimistic updates for actions that need to feel instant
(check off a target, log weight, send a friend request); realtime
subscriptions on `check_ins`/`friendships` for connections so the feed and
invites update live; cap how much history gets fetched per query (e.g. only
the last 365 days for the activity grid) instead of pulling everything.

Full detail in `SUPABASE_SETUP.md`, "What happens in phase 3."

## Picking this up on a different machine/session

- Node 18+, `npm install && npm run dev`.
- If `SUPABASE_SETUP.md`'s checklist (section 0) isn't fully checked off,
  phase 1 isn't done — don't start editing hooks yet.
- `.env` is gitignored and currently has empty placeholder keys — real
  Supabase credentials go there once the project exists (never in
  `.env.example`, which is committed).
- Git note: this repo has had branches diverge before (a `supabase-integration`
  branch once got cut from `main` before `main` had the full feature set
  merged in) — before starting new work, double check `git log` shows the
  full commit history you expect, not just the original bare scaffold.
