# Supabase setup — step by step

This wires up a real backend for every feature currently in the app: targets +
check-ins, the friend-gated feed, weight tracking, diet tracking, friends
(search/invite/accept), profile editing + pinned targets, and email/password
auth.

Follow the steps in order. **Do not skip ahead to wiring the app's hooks —
that's a separate phase that comes after this one.** This document only gets
the database and auth provider ready.

---

## 0. Status

- [ ] Step 1 — Create the Supabase project
- [ ] Step 2 — Turn on email/password auth
- [ ] Step 3 — Run the database schema
- [ ] Step 4 — Run row-level security policies
- [ ] Step 5 — Create the avatars storage bucket
- [ ] Step 6 — Fill in `.env`
- [ ] Step 7 — Sanity-check everything in the Supabase dashboard

Check these off as you go. Once all seven are done, tell me and we'll move to
phase 2 (rewiring the hooks) and phase 3 (caching/optimization) — both
described at the bottom of this doc so nothing gets lost.

**Update:** phase 2 is complete — every hook (`useMyProfile`, `useCheckinData`,
`useWeightData`, `useDietData`, `useFriends`, `useFeed`) now talks to Supabase
directly, and `src/data/mock.ts` is no longer imported anywhere in the live
app (it's dead code, safe to ignore or delete). One thing is still pending on
your end: **Step 8 below**, a one-time SQL migration for the new onboarding
flow.

---

## 1. Create the project

1. Go to **supabase.com** → click **Sign in** (or **Start your project**) →
   sign in with GitHub or email.
2. Click **New project**.
3. Fill in the fields:
   - **Organization**: pick your existing one, or click **New organization**
     and name it anything (e.g. `personal`).
   - **Name**: `tarin` (or whatever you'd like — this is just a label).
   - **Database Password**: click **Generate a password**, then copy it
     somewhere safe (a password manager or note). You won't need this for the
     app itself, only if you ever connect a direct Postgres client.
   - **Region**: pick the one closest to you.
   - **Pricing Plan**: Free is fine to start.
4. Click **Create new project**. Wait 1–2 minutes while it provisions.
5. Once it's ready, in the left sidebar click the **gear icon → Project
   Settings**, then **API** in the settings list. You'll see two values you
   need later:
   - **Project URL** — looks like `https://abcdefghijk.supabase.co`
   - **Project API keys → `anon` `public`** — a long string starting with
     `eyJ...`
   Keep this tab open, or copy both values into a scratch note — you'll paste
   them into `.env` in Step 6.

---

## 2. Turn on email/password auth

We're only using email + password (no Google/social login), so this is short.

1. Left sidebar → **Authentication** → **Providers**.
2. Click **Email**. Confirm it's enabled (it is by default). While you're
   testing locally, you have two options for **Confirm email**:
   - **ON** (default, recommended even for testing) — after signup, Supabase
     emails a confirmation link. In a test project, go to **Authentication →
     Users**, open the new user, and click **Send magic link** or just wait
     for the real email if you used a real address.
   - **OFF** — accounts are active immediately after signup, no email needed.
     Easiest for local development. To turn it off: in this same Email
     provider panel, toggle **Confirm email** off, then **Save**.
   Pick OFF for now if you just want to click through the app quickly; ON if
   you want to test the real flow.
3. Left sidebar → **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: add `http://localhost:5173/**`
   (These matter for password-reset/confirmation email links. If you deploy
   later, add your real domain here too.)

That's it for auth config — no OAuth app, no client IDs, nothing else needed.

---

## 3. Database schema

Left sidebar → **SQL Editor** → **New query**. Paste the block below and click
**Run**. This creates every table the app needs.

```sql
-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES — one row per user, auto-created on signup
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  -- Up to 3 target ids featured on the profile page.
  pinned_target_ids uuid[] not null default '{}',
  -- Flips to true once the first-run "customize your profile" + tour flow is done.
  onboarded boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pinned_target_ids_max_3
    check (array_length(pinned_target_ids, 1) is null or array_length(pinned_target_ids, 1) <= 3)
);

-- ============================================================
-- TARGETS — the recurring things a user is tracking
-- ============================================================
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  emoji text not null default '🎯',
  frequency text not null check (frequency in ('daily', 'weekly')),
  weekly_goal int,
  color_hex text not null default '#b3813f',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index targets_user_id_idx on public.targets(user_id);

-- ============================================================
-- CHECK-INS — one log entry per target per period (day or ISO week)
-- ============================================================
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.targets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_key text not null,          -- '2026-07-06' for daily, '2026-W27' for weekly
  note text,
  completed_at timestamptz not null default now(),
  unique (target_id, period_key)     -- prevents double check-ins for the same day/week
);

create index check_ins_user_id_completed_at_idx on public.check_ins(user_id, completed_at desc);

-- ============================================================
-- WEIGHT ENTRIES — one per user per day (logging again same day overwrites)
-- ============================================================
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  weight numeric(5,1) not null check (weight > 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index weight_entries_user_id_date_idx on public.weight_entries(user_id, date);

-- ============================================================
-- DIET ITEMS — free-text entries per meal section per day
-- ============================================================
create table public.diet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  section text not null check (section in ('breakfast', 'lunch', 'dinner', 'snacks')),
  text text not null default '',
  created_at timestamptz not null default now()
);

create index diet_items_user_id_date_idx on public.diet_items(user_id, date);

-- ============================================================
-- FRIENDSHIPS — one row per request; status moves pending -> accepted
-- ============================================================
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz not null default now(),
  constraint no_self_friendship check (requester_id <> addressee_id)
);

-- Prevents both A->B and B->A duplicate requests existing at once.
create unique index friendships_unique_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_requester_idx on public.friendships(requester_id);
create index friendships_addressee_idx on public.friendships(addressee_id);

-- ============================================================
-- Auto-create a profile row whenever someone signs up.
-- No username is collected at signup, so we generate one from the email
-- plus a short unique suffix so it can never collide.
-- ============================================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, onboarded)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

You should now see 6 new tables under **Table Editor**: `profiles`, `targets`,
`check_ins`, `weight_entries`, `diet_items`, `friendships`.

---

## 4. Row-level security (RLS)

This is what enforces, at the database level, exactly what the app's UI
already does:

- **Profiles & targets are publicly readable** — this is what lets the Find
  Friends search show a stranger's name/avatar/bio and preview their targets
  before you've connected.
- **Check-ins are only readable by you and people you're connected to**
  (accepted friend, or a pending request either direction) — this is the
  friend-gated feed.
- **Weight entries and diet items are private** — only you can ever read your
  own rows. Nothing in the app shows anyone else's weight or diet data, so
  the database shouldn't allow it either.
- **Friendships are only readable by the two people involved.**
- Everyone can only ever **write** their own rows, everywhere.

Run this next in the SQL Editor:

```sql
-- Helper: true if two users are the same, or have any friendship row
-- between them (pending OR accepted) — matches the feed's visibility rule.
create or replace function public.are_connected(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select user_a = user_b or exists (
    select 1 from public.friendships f
    where (f.requester_id = user_a and f.addressee_id = user_b)
       or (f.requester_id = user_b and f.addressee_id = user_a)
  );
$$;

alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.check_ins enable row level security;
alter table public.weight_entries enable row level security;
alter table public.diet_items enable row level security;
alter table public.friendships enable row level security;

-- PROFILES: public read, owner-only write
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- TARGETS: public read (needed for profile previews + discovery), owner-only write
create policy "Targets are viewable by everyone"
  on public.targets for select using (true);
create policy "Users can insert their own targets"
  on public.targets for insert with check (auth.uid() = user_id);
create policy "Users can update their own targets"
  on public.targets for update using (auth.uid() = user_id);
create policy "Users can delete their own targets"
  on public.targets for delete using (auth.uid() = user_id);

-- CHECK-INS: readable only by you + your connections (this is the feed gate)
create policy "Check-ins are viewable by connections"
  on public.check_ins for select using (public.are_connected(auth.uid(), user_id));
create policy "Users can insert their own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);
create policy "Users can update their own check-ins"
  on public.check_ins for update using (auth.uid() = user_id);
create policy "Users can delete their own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);

-- WEIGHT ENTRIES: fully private
create policy "Users can view their own weight entries"
  on public.weight_entries for select using (auth.uid() = user_id);
create policy "Users can insert their own weight entries"
  on public.weight_entries for insert with check (auth.uid() = user_id);
create policy "Users can update their own weight entries"
  on public.weight_entries for update using (auth.uid() = user_id);
create policy "Users can delete their own weight entries"
  on public.weight_entries for delete using (auth.uid() = user_id);

-- DIET ITEMS: fully private
create policy "Users can view their own diet items"
  on public.diet_items for select using (auth.uid() = user_id);
create policy "Users can insert their own diet items"
  on public.diet_items for insert with check (auth.uid() = user_id);
create policy "Users can update their own diet items"
  on public.diet_items for update using (auth.uid() = user_id);
create policy "Users can delete their own diet items"
  on public.diet_items for delete using (auth.uid() = user_id);

-- FRIENDSHIPS: only visible to / editable by the two people involved
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);
create policy "Either party can update a friendship"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Either party can delete a friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
```

If you ever want to change visibility rules later (e.g. make targets private
too, or open check-ins back up to everyone), you only ever touch the relevant
`select` policy above — nothing else in the app needs to change.

---

## 5. Avatar storage bucket

This is for the "Change photo" button in Edit Profile — right now it stores a
base64 data URL in localStorage; once wired up it'll upload to this bucket
instead and store the resulting public URL in `profiles.avatar_url`.

1. Left sidebar → **Storage** → **New bucket**.
2. Name it exactly `avatars`. Toggle **Public bucket** ON. Click **Create
   bucket**.
3. Back in **SQL Editor**, run:

```sql
create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

This means avatars must be uploaded to a path like
`avatars/<user-id>/profile.jpg` — the policy checks that the first folder in
the path matches the uploader's own id.

---

## 6. Fill in `.env`

Two files now exist in the project root:

- **`.env.example`** — committed to git, no real values, just shows the shape.
- **`.env`** — already created for you, gitignored, currently empty. Open it
  and paste in the two values from Step 1:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Save the file. Never commit `.env` — it's already listed in `.gitignore`.

---

## 7. Sanity-check everything

Before telling me to move on, quickly confirm in the Supabase dashboard:

- **Table Editor** shows all 6 tables with the columns above.
- **Authentication → Providers → Email** is enabled.
- **Authentication → Policies** (or each table's RLS tab) shows the policies
  listed in Step 4 — should be 4–5 policies per table.
- **Storage** shows an `avatars` bucket marked Public.
- `.env` has real (not placeholder) values in it.

Once that's all true, the database is fully ready and phase 2 (rewiring the
app's hooks to actually call Supabase) can start.

---

## 8. Onboarding migration — run this now

Phase 2 is done and the app now shows a first-time "customize your profile" +
"here's what you can do" flow right after signup, gated on a new `onboarded`
column. Your database was created before this column existed, so run this
once in the SQL Editor:

```sql
-- Add the column. Existing rows (your test account) default to true so
-- onboarding never retroactively pops up for someone already using the app.
alter table public.profiles
  add column if not exists onboarded boolean not null default true;

-- Make brand-new signups start unboarded so they see the welcome flow.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, onboarded)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
```

That's it — no RLS changes needed, since `onboarded` is just another column
covered by the existing `profiles` policies. To see the flow yourself, sign
up with a brand new email (or run `update public.profiles set onboarded =
false where id = '<your-user-id>'` in the SQL editor to replay it on your
existing account).

---

## 9. Protein tracking migration — run this too

Each item in a meal section (breakfast/lunch/dinner/snacks) now has its own
protein amount, and the diet page totals them up for the day. Run this once:

```sql
alter table public.diet_items
  add column if not exists protein numeric(6,1);
```

No RLS changes needed here either — `diet_items` policies already cover the
whole row, protein included.

**Also fixed in this pass:** the diet tracker had a bug where leaving and
re-entering the page kept inserting new empty rows into `diet_items` forever.
Each section now always shows 3 inputs, but the padding ones are purely
client-side placeholders — nothing gets written to the database until you
actually type into one. If you'd already accumulated a pile of blank rows
from the old bug, you can clear them out with:

```sql
delete from public.diet_items where text = '' and protein is null;
```

(Safe to run anytime — it only removes rows that have never had any text or
protein entered.)

---

## What happens in phase 2 (next — not started yet)

Each hook below currently reads/writes `localStorage`. Each one gets its
internals swapped for `supabase-js` calls — **the components that use these
hooks don't change**, since the hook's return shape stays the same:

| Hook | Becomes |
|---|---|
| `useAuth` | `supabase.auth.signUp` / `signInWithPassword` / `signOut`, gated on `supabase.auth.getSession()` + `onAuthStateChange` |
| `useMyProfile` | `supabase.from('profiles').select/update`, avatar upload to Storage |
| `useCheckinData` | `supabase.from('targets')` / `supabase.from('check_ins')` |
| `useWeightData` | `supabase.from('weight_entries')`, upsert on `(user_id, date)` |
| `useDietData` | `supabase.from('diet_items')` |
| `useFriends` | `supabase.from('friendships')`, insert/update/delete rows |
| `useFeed` | `check_ins` joined to `profiles` + `targets`, ordered by `completed_at desc` — RLS already restricts this to your connections, so the query itself stays simple |

First step of that phase: `npm install @supabase/supabase-js` and create
`src/lib/supabase.ts` exporting a configured client from the `.env` values.

## What happens in phase 3 (after phase 2 — caching/optimization)

The plan, once real network requests are in the picture:

- Cache reads in `localStorage` per table (or use a small library like
  TanStack Query) so re-opening a page shows the last-known data instantly,
  then revalidates in the background instead of showing a blank loading
  state every time.
- Optimistic updates for the writes that need to feel instant — marking a
  target complete, logging weight, sending a friend request — update local
  state immediately, then reconcile with the server response (roll back on
  error).
- Subscribe to `postgres_changes` on `check_ins` and `friendships` for the
  people you're connected to, so the feed and friend requests update live
  without polling.
- Batch/limit feed and activity-grid queries (e.g. only fetch the last
  365 days of check-ins per target, matching what the UI actually renders)
  instead of pulling full history every time.

This phase is explicitly deferred until phase 2 is working end-to-end.
