import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type FriendStatusValue = "friend" | "incoming" | "outgoing" | "none";

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

function toProfile(p: ProfileRow): UserProfile {
  return { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url ?? "", bio: p.bio ?? undefined };
}

/**
 * Real Supabase-backed friends: friendships table for requests/connections,
 * profiles table for discovery. A brand new account has zero friendships and
 * sees every other real user as discoverable — no seeded fake friends.
 */
export function useFriends() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }
    const [{ data: friendshipRows }, { data: profileRows }] = await Promise.all([
      supabase.from("friendships").select("*").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("profiles").select("id, username, display_name, avatar_url, bio").neq("id", userId),
    ]);
    setRows((friendshipRows as FriendshipRow[]) ?? []);
    setProfiles(((profileRows as ProfileRow[]) ?? []).map(toProfile));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  const otherIdIn = useCallback((row: FriendshipRow) => (row.requester_id === userId ? row.addressee_id : row.requester_id), [userId]);

  const friendIds = useMemo(() => rows.filter((r) => r.status === "accepted").map(otherIdIn), [rows, otherIdIn]);
  const incomingIds = useMemo(
    () => rows.filter((r) => r.status === "pending" && r.addressee_id === userId).map((r) => r.requester_id),
    [rows, userId]
  );
  const outgoingIds = useMemo(
    () => rows.filter((r) => r.status === "pending" && r.requester_id === userId).map((r) => r.addressee_id),
    [rows, userId]
  );

  const connectedIds = useMemo(() => new Set([...friendIds, ...incomingIds, ...outgoingIds]), [friendIds, incomingIds, outgoingIds]);
  const discoverable = useMemo(() => profiles.filter((p) => !connectedIds.has(p.id)), [profiles, connectedIds]);

  const statusFor = useCallback(
    (otherId: string): FriendStatusValue => {
      if (friendIds.includes(otherId)) return "friend";
      if (incomingIds.includes(otherId)) return "incoming";
      if (outgoingIds.includes(otherId)) return "outgoing";
      return "none";
    },
    [friendIds, incomingIds, outgoingIds]
  );

  const sendRequest = useCallback(
    async (otherId: string) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("friendships")
        .insert({ requester_id: userId, addressee_id: otherId })
        .select()
        .single();
      if (!error && data) setRows((prev) => [...prev, data as FriendshipRow]);
    },
    [userId]
  );

  const acceptRequest = useCallback(
    async (otherId: string) => {
      const row = rows.find((r) => r.requester_id === otherId && r.addressee_id === userId && r.status === "pending");
      if (!row) return;
      const { data, error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", row.id).select().single();
      if (!error && data) setRows((prev) => prev.map((r) => (r.id === row.id ? (data as FriendshipRow) : r)));
    },
    [rows, userId]
  );

  const declineRequest = useCallback(
    async (otherId: string) => {
      const row = rows.find((r) => r.requester_id === otherId && r.addressee_id === userId && r.status === "pending");
      if (!row) return;
      const { error } = await supabase.from("friendships").delete().eq("id", row.id);
      if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
    },
    [rows, userId]
  );

  const removeFriend = useCallback(
    async (otherId: string) => {
      const row = rows.find((r) => (r.requester_id === otherId || r.addressee_id === otherId) && r.status === "accepted");
      if (!row) return;
      const { error } = await supabase.from("friendships").delete().eq("id", row.id);
      if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
    },
    [rows]
  );

  return {
    friendIds,
    incomingIds,
    outgoingIds,
    discoverable,
    profiles,
    friendCount: friendIds.length,
    isLoading,
    statusFor,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  };
}
