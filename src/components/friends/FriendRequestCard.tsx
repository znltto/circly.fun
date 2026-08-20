"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "@/lib/friends/actions";

interface FriendRequestCardProps {
  friendshipId: string;
  direction: "incoming" | "outgoing";
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function FriendRequestCard({
  friendshipId,
  direction,
  friend,
}: FriendRequestCardProps) {
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
      <UserAvatar
        name={friend.display_name}
        src={friend.avatar_url}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">
          {friend.display_name}
        </p>
        <p className="font-mono text-xs text-text-muted">@{friend.username}</p>
      </div>

      {direction === "incoming" ? (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            aria-label={`Aceitar solicitação de ${friend.display_name}`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await acceptFriendRequest(friendshipId);
              })
            }
            leftIcon={<Check className="h-3.5 w-3.5" />}
          >
            Aceitar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Recusar solicitação de ${friend.display_name}`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await declineFriendRequest(friendshipId);
              })
            }
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <span className="rounded-sm bg-surface-hover px-2 py-1 text-xs text-text-muted">
          Aguardando
        </span>
      )}
    </div>
  );
}
