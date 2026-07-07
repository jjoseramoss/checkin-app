import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Check that .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, then restart the dev server."
  );
}

/**
 * Single shared Supabase client for the whole app. Every hook that talks to
 * the backend (useAuth, useMyProfile, useCheckinData, useWeightData,
 * useDietData, useFriends, useFeed) imports this instead of creating its
 * own client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
