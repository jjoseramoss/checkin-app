import { Flame } from "lucide-react";
import type { CheckIn, Target, UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";

interface FeedItemProps {
  checkIn: CheckIn;
  target: Target;
  user: UserProfile;
  streak: number;
}

export function FeedItem({ checkIn, target, user, streak }: FeedItemProps) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-1 text-sm">
            <span className="font-display font-bold">{user.displayName}</span>
            <span className="text-muted-foreground">completed</span>
            <span className="font-medium">
              {target.emoji} {target.title}
            </span>
          </div>

          {checkIn.note && (
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm leading-snug text-foreground/90">
              {checkIn.note}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{timeAgo(checkIn.completedAt)}</span>
            {streak > 1 && (
              <span className="flex items-center gap-0.5 font-medium text-accent">
                <Flame className="h-3 w-3" />
                {streak} in a row
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
