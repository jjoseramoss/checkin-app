# Supabase setup — step by step

Follow these in order. Each step lists exactly what to click/paste. This wires up auth, the database, row-level security, and avatar storage for the check-in app.

---

## 1. Create the project

1. Go to supabase.com → Sign in → **New project**.
2. Pick an organization, name it (e.g. `checkin-app`), set a strong database password (save it somewhere — you'll need it for direct DB access later, not for the app itself).
3. Pick the region closest to you and your friends.
4. Wait ~2 minutes for provisioning.
5. In the left sidebar, go to **Project Settings → API**. Copy:
   - `Project URL`
   - `anon public` key
   You'll paste these into a `.env` file in step 6.

## 2. Set up email auth

1. Left sidebar → **Authentication → Providers**.
2. **Email** is enabled by default. Click into it and confirm:
   - "Confirm email" — turn ON for production, OFF while you're testing locally with fake addresses (you can flip it back later).
3. Left sidebar → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173` for now (change to your real domain when you deploy).
   - Add `http://localhost:5173/**` to Redirect URLs.

## 3. Set up Google login

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** — set it to "External", fill in app name/support email, add your own email as a test user while in testing mode.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI: copy this exact value from Supabase (see next step) — it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Back in Supabase: **Authentication → Providers → Google** → toggle it on → paste the **Client ID** and **Client Secret** Google just gave you → Save.
5. In your app's sign-in button later, calling `supabase.auth.signInWithOAuth({ provider: 'google' })` will just work with this config.

## 4. Database schema

Left sidebar → **SQL Editor → New query**. Paste and run this whole block:

```sql
-- Profiles: one row per user, created automatically on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Targets: the recurring things a user is tracking
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  emoji text not null default '🎯',
  frequency text not null check (frequency in ('daily', 'weekly')),
  weekly_goal int,
  color_hex text not null default '#b3813f',
  archived boolean not null default false,
  created_at timestamptz default now()
);

-- Check-ins: one log entry per target per period (day or ISO week)
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.targets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_key text not null,          -- '2026-07-03' for daily, '2026-W27' for weekly
  note text,
  completed_at timestamptz default now(),
  unique (target_id, period_key)      -- prevents double check-ins for the same day/week
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 5. Row-level security (RLS)

This is what makes "friends can view your account" work safely: everyone can *read* everyone's profiles/targets/check-ins, but you can only *write* your own. Run this next:

```sql
alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.check_ins enable row level security;

-- Profiles: public read, owner-only write
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Targets: public read, owner-only write
create policy "Targets are viewable by everyone"
  on public.targets for select using (true);
create policy "Users can insert their own targets"
  on public.targets for insert with check (auth.uid() = user_id);
create policy "Users can update their own targets"
  on public.targets for update using (auth.uid() = user_id);
create policy "Users can delete their own targets"
  on public.targets for delete using (auth.uid() = user_id);

-- Check-ins: public read (this is the feed), owner-only write
create policy "Check-ins are viewable by everyone"
  on public.check_ins for select using (true);
create policy "Users can insert their own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);
create policy "Users can update their own check-ins"
  on public.check_ins for update using (auth.uid() = user_id);
create policy "Users can delete their own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);
```

If you later want private accounts or a friend-request system instead of "everyone can see everyone," that only changes the `select` policies above (e.g. gate on a `follows` table) — nothing else in the app needs to change.

## 6. Avatar storage

1. Left sidebar → **Storage → New bucket** → name it `avatars` → toggle **Public bucket** ON.
2. SQL Editor, run:

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

This means avatars must be uploaded to a path like `avatars/<user-id>/profile.jpg` — the policy checks that the first folder in the path matches the uploader's user id.

## 7. Connect the app

1. In the `checkin-app` project root, create `.env.local`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

2. Install the client: `npm install @supabase/supabase-js`
3. Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

4. Never commit `.env.local` — it's already in `.gitignore`.

## 8. What changes in the prototype when this goes live

- `src/hooks/useCheckinData.ts` is the only file that needs real rewiring: swap its `localStorage` reads/writes for `supabase.from('targets')...` / `supabase.from('check_ins')...` calls.
- Auth adds a new gate before the app renders: check `supabase.auth.getSession()`, show a sign-in screen if there's no session, otherwise render the same `Dashboard` / `Feed` / `Profile`.
- The feed query becomes `select * from check_ins order by completed_at desc` joined to `profiles` and `targets` — RLS already allows this for everyone, so no extra backend work is needed to show friends' activity.

---

Once you're ready, I can wire the actual `supabase-js` calls into the prototype in place of the mock hook — happy to do that as the next step.
