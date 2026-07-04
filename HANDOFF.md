# Check In app — handoff summary

Status as of 2026-07-03. Written so you can pick this up on a different machine.

## What exists

A working prototype in the `checkin-app` folder: Vite + React + TypeScript + Tailwind CSS, with hand-written shadcn/ui-style components on top of Radix primitives. No auth yet — everything runs against mock data + `localStorage`.

Pages/features:
- **Dashboard** (`src/pages/Dashboard.tsx`) — add, rename, delete targets; mark complete with an optional note; per-target streak count; 12-week GitHub-style activity grid (`src/components/ActivityGrid.tsx`).
- **Feed** (`src/pages/Feed.tsx`) — Instagram-style reverse-chronological check-ins across you + mock friends.
- **Profile** (`src/pages/Profile.tsx`) — placeholder stats, no editing yet.
- Mobile-first: capped phone-width column, bottom tab bar (`src/components/BottomNav.tsx`), styled with Archivo (display font) + Inter, earthy palette inspired by the Everest reference image.
- Data layer (`src/hooks/useCheckinData.ts`, `src/data/mock.ts`) is intentionally isolated — this is the only piece that needs rewriting to swap in Supabase.

Also in the folder:
- `README.md` — how to run the prototype (`npm install && npm run dev`).
- `SUPABASE_SETUP.md` — full step-by-step: project creation, Google + email auth, database schema (`profiles`, `targets`, `check_ins`), row-level security policies (public read / owner-only write — this is what lets friends view your feed), avatar storage bucket, and `.env` wiring.

## Known limitation

The prototype was built in a sandbox with no access to the npm registry, so it was hand-written and reviewed but **never actually run**. First thing to do on your PC:

```bash
cd checkin-app
npm install
npm run dev
```

If anything breaks on install/build, that's the first thing to fix — check terminal output for missing deps or type errors and report back what you see.

## What's next (in order)

1. **Verify the prototype runs** — `npm install`, `npm run dev`, click through Dashboard/Feed/Profile, confirm nothing errors.
2. **Style pass against your reference images** — you mentioned sharing more images; once you do, adjust `tailwind.config.ts` / `src/index.css` (colors, fonts) and component spacing to match.
3. **Set up Supabase** — follow `SUPABASE_SETUP.md` steps 1–6 (project, auth providers, schema, RLS, storage).
4. **Wire auth into the app** — add a sign-in screen, gate `App.tsx` on `supabase.auth.getSession()`.
5. **Swap the data layer** — replace `localStorage` reads/writes in `useCheckinData.ts` with real `supabase.from(...)` calls (step 8 in `SUPABASE_SETUP.md` outlines exactly what changes).
6. **Profile customization** — avatar upload to the `avatars` storage bucket, username/bio editing.
7. **Real friends model** — decide if this stays "everyone sees everyone" (current RLS policies) or becomes a follow/friend-request system; only the `select` RLS policies would need to change.

## Picking this up on your PC

- Move/re-clone the `checkin-app` folder (or push it to a git repo first, which is recommended before switching machines).
- You'll need Node 18+ and normal internet access for `npm install` (this sandbox didn't have registry access — your PC should be fine).
- No `.env` secrets exist yet since Supabase isn't connected — nothing sensitive to carry over.
