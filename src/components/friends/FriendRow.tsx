"use client";

import * as React from "react";
import { UserAvatar, PresenceIndicator } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { UserMinus } from "lucide-react";
import { usePresence } from "@/components/presence/PresenceProvider";
import { removeFriend } from "@/lib/friends/actions";

interface FriendRowProps {
  friendshipId: string;
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function FriendRow({ friendshipId, friend }: FriendRowProps) {
  const [pending, startTransition] = React.useTransition();
  const presence = usePresence(friend.id);
  const status = presence?.status ?? "offline";

  return (
    <li className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-hover">
      <UserAvatar
        name={friend.display_name}
        src={friend.avatar_url}
        size="md"
        status={status}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">
          {friend.display_name}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="font-mono">@{friend.username}</span>
          <span>·</span>
          <PresenceIndicator status={status} showLabel />
        </div>
      </div>
      {/*
        Botão sempre visível em touch (opacity-0/hover só funciona no desktop
        e deixava usuários de celular sem acesso à ação). Em telas com hover,
        aparece só ao passar; em telas touch (coarse pointer), fica visível.
      */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remover ${friend.display_name}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ok = confirm(`Remover ${friend.display_name}?`);
            if (ok) await removeFriend(friendshipId);
          })
        }
        className="opacity-100 focus:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function FriendRowCompact({
  friend,
}: {
  friend: FriendRowProps["friend"];
}) {
  const presence = usePresence(friend.id);
  const status = presence?.status ?? "offline";
  return (
    <li className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-hover">
      <UserAvatar
        name={friend.display_name}
        src={friend.avatar_url}
        size="sm"
        status={status}
      />
      <span className="flex-1 truncate text-sm text-text-primary">
        {friend.display_name}
      </span>
      <PresenceIndicator status={status} showLabel />
    </li>
  );
}
