import type { ReactNode } from "react";
import type { UserProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FriendCardProps {
  user: UserProfile;
  onOpenProfile: () => void;
  action: ReactNode;
}

/** Row card used across Invites / Find friends / Your friends lists. */
export function FriendCard({ user, onOpenProfile, action }: FriendCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar className="h-11 w-11 border border-border">
            <AvatarImage src={user.avatarUrl} alt={user.username} />
            <AvatarFallback>{user.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display font-bold leading-tight">
              @{user.username}
            </span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      </CardContent>
    </Card>
  );
}
