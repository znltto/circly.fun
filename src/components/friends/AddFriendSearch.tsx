"use client";

import * as React from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/Avatar";
import { sendFriendRequest } from "@/lib/friends/actions";
import type { FriendProfile } from "@/lib/friends/queries";

interface AddFriendSearchProps {
  searchAction: (query: string) => Promise<FriendProfile[]>;
  existingFriendIds: string[];
}

export function AddFriendSearch({
  searchAction,
  existingFriendIds,
}: AddFriendSearchProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<FriendProfile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchAction(query);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchAction]);

  async function handleAdd(profileId: string) {
    setSendingId(profileId);
    setNotice(null);
    const result = await sendFriendRequest(profileId);
    setSendingId(null);
    if (result?.error) {
      setNotice(result.error);
      return;
    }
    setSentIds((prev) => new Set(prev).add(profileId));
  }

  return (
    <div className="space-y-3">
      <Input
        label="Adicionar amigo"
        placeholder="username"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftAdornment={<Search className="h-4 w-4" />}
        hint="Digite pelo menos 2 caracteres do @ da pessoa."
      />

      {notice && (
        <p role="alert" className="text-xs text-danger">
          {notice}
        </p>
      )}

      {query.trim().length >= 2 && (
        <ul className="space-y-1 rounded-md border border-border bg-surface p-1">
          {loading && (
            <li className="px-3 py-3 text-xs text-text-muted">Buscando...</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-3 text-xs text-text-muted">
              Nenhum resultado.
            </li>
          )}
          {results.map((p) => {
            const alreadyFriend = existingFriendIds.includes(p.id);
            const alreadySent = sentIds.has(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-surface-hover"
              >
                <UserAvatar
                  name={p.display_name}
                  src={p.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {p.display_name}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    @{p.username}
                  </p>
                </div>
                {alreadyFriend ? (
                  <span className="text-xs text-text-muted">Já é amigo</span>
                ) : alreadySent ? (
                  <span className="text-xs text-text-secondary">Enviado</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    loading={sendingId === p.id}
                    onClick={() => handleAdd(p.id)}
                  >
                    Adicionar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
