"use client";

import * as React from "react";
import { Check, Loader2, Search, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { inviteFriendsToRoom } from "@/lib/rooms/invitations";

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  roomSlug: string;
  appUrl: string;
}

/**
 * Painel de "Convidar amigos" no SuccessCard de /salas/nova.
 * - Fetcha amigos aceitos via /api/friends/accepted
 * - Filtra por nome/username
 * - Checkboxes com selecionados destacados
 * - Um botão "Convidar N" dispara inviteFriendsToRoom
 * - Feedback inline (loading, success, error)
 */
export function InviteFriendsPanel({ roomSlug, appUrl }: Props) {
  const [friends, setFriends] = React.useState<Friend[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<
    | { tone: "success"; message: string }
    | { tone: "danger"; message: string }
    | null
  >(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/friends/accepted", { cache: "no-store" });
        if (!res.ok) throw new Error("http");
        const body = (await res.json()) as { friends: Friend[] };
        if (!cancelled) setFriends(body.friends);
      } catch {
        if (!cancelled) setFriends([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    if (!friends) return [];
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSending(true);
    setResult(null);
    try {
      const ids = Array.from(selected);
      const res = await inviteFriendsToRoom(roomSlug, ids, appUrl);
      if (!res.ok) {
        setResult({
          tone: "danger",
          message: res.error ?? "Falha ao convidar.",
        });
      } else {
        setResult({
          tone: "success",
          message: `${res.invited} convite${res.invited === 1 ? "" : "s"} enviado${
            res.invited === 1 ? "" : "s"
          }${res.skipped ? ` (${res.skipped} já tinha convite pendente)` : ""}.`,
        });
        setSelected(new Set());
      }
    } catch (err) {
      console.error("[InviteFriendsPanel]", err);
      setResult({ tone: "danger", message: "Erro de rede." });
    } finally {
      setSending(false);
    }
  }

  if (friends === null) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-4 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando amigos…
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 text-sm text-text-muted">
        <p className="flex items-center gap-2 text-text-secondary">
          <Users className="h-4 w-4" />
          Sem amigos aceitos ainda.
        </p>
        <p className="mt-1 text-xs">
          Adicione amigos em /pessoas pra poder convidar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Users className="h-4 w-4 text-brand" />
          Convidar amigos
        </p>
        <span className="text-xs text-text-muted">
          {selected.size > 0
            ? `${selected.size} selecionado${selected.size === 1 ? "" : "s"}`
            : `${friends.length} disponíve${
                friends.length === 1 ? "l" : "is"
              }`}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-background px-3">
        <Search className="h-3.5 w-3.5 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou @user"
          className="flex-1 bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>

      <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-slim">
        {filtered.length === 0 && (
          <li className="px-2 py-3 text-center text-xs text-text-muted">
            Nada encontrado.
          </li>
        )}
        {filtered.map((f) => {
          const isSelected = selected.has(f.id);
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => toggle(f.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors",
                  isSelected
                    ? "border-brand/50 bg-brand/5"
                    : "border-transparent hover:bg-surface-hover"
                )}
              >
                <UserAvatar
                  name={f.displayName}
                  src={f.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {f.displayName}
                  </p>
                  <p className="truncate font-mono text-[11px] text-text-muted">
                    @{f.username}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-brand bg-brand text-brand-fg"
                      : "border-border bg-background"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {result && (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-md border px-3 py-2 text-xs",
            result.tone === "success"
              ? "border-brand/40 bg-brand/5 text-text-primary"
              : "border-danger/40 bg-danger/5 text-danger"
          )}
        >
          {result.message}
        </p>
      )}

      <Button
        type="button"
        className="mt-4 w-full"
        onClick={submit}
        disabled={selected.size === 0 || sending}
        loading={sending}
        leftIcon={!sending ? <Send className="h-4 w-4" /> : undefined}
      >
        {selected.size === 0
          ? "Selecione pelo menos um"
          : `Convidar ${selected.size} amigo${selected.size === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
