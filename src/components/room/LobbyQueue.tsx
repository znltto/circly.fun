"use client";

import * as React from "react";
import { Check, X, UserPlus } from "lucide-react";
import { useMeeting } from "./meeting-context";
import { UserAvatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface LobbyEntry {
  id: string;
  display_name: string;
  guest_name: string | null;
  profile_id: string | null;
  requested_at: string;
}

/**
 * Banner que só aparece pro host quando existe alguém na fila do waiting
 * room. Poll a cada 3s no endpoint da fila. Botões admit/deny inline.
 */
export function LobbyQueue() {
  const { roomSlug, isHost, emitToast } = useMeeting();
  const [entries, setEntries] = React.useState<LobbyEntry[]>([]);
  const [pending, setPending] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!isHost) return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${roomSlug}/lobby`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { pending?: LobbyEntry[] };
        if (!cancelled) setEntries(body.pending ?? []);
      } catch {
        // silencioso
      }
    }

    void tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomSlug, isHost]);

  async function decide(entry: LobbyEntry, action: "admit" | "deny") {
    setPending((p) => ({ ...p, [entry.id]: true }));
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/lobby/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId: entry.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        emitToast?.({
          tone: "danger",
          message: body?.error ?? "Não consegui responder o pedido.",
        });
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      emitToast?.({
        tone: action === "admit" ? "success" : "info",
        message:
          action === "admit"
            ? `${entry.display_name} está entrando.`
            : `${entry.display_name} foi recusado.`,
      });
    } catch {
      emitToast?.({
        tone: "danger",
        message: "Sem conexão. Tenta de novo.",
      });
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[entry.id];
        return next;
      });
    }
  }

  if (!isHost || entries.length === 0) return null;

  return (
    <aside
      aria-label="Fila da sala de espera"
      className="border-b border-brand/30 bg-brand/5 px-3 py-2 sm:px-4"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-brand">
          <UserPlus className="h-3.5 w-3.5" />
          {entries.length === 1
            ? "1 pessoa aguardando aprovação"
            : `${entries.length} pessoas aguardando aprovação`}
        </p>
        <ul className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-1.5"
            >
              <UserAvatar
                name={entry.display_name}
                src={null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {entry.display_name}
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {entry.profile_id ? "Membro" : "Convidado"} · pediu há{" "}
                  {formatAgo(entry.requested_at)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Recusar ${entry.display_name}`}
                onClick={() => decide(entry, "deny")}
                disabled={pending[entry.id]}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  "text-text-secondary transition-colors hover:bg-danger/15 hover:text-danger",
                  "disabled:opacity-50"
                )}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Aprovar ${entry.display_name}`}
                onClick={() => decide(entry, "admit")}
                disabled={pending[entry.id]}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-brand-fg",
                  "transition-colors hover:bg-brand-hover disabled:opacity-50"
                )}
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Admitir</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function formatAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h`;
}
