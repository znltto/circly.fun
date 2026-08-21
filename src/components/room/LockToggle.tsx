"use client";

import * as React from "react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeeting } from "./meeting-context";

/**
 * Toggle de "trancar sala" — visível só pro host.
 * Quando locked=true, novos participantes recebem 403 em /api/livekit/token.
 * Quem já está dentro continua na chamada.
 */
export function LockToggle() {
  const { roomSlug, isHost, emitToast } = useMeeting();
  const [locked, setLocked] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  // Puxa estado inicial (única leitura — se outro host mudar via outra aba,
  // não é caso comum e o pedido bloqueado dá feedback natural).
  React.useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${roomSlug}/lock`, {
          method: "GET",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { locked?: boolean };
        if (!cancelled && typeof body.locked === "boolean") {
          setLocked(body.locked);
        }
      } catch {
        // silencioso — a leitura inicial não é crítica
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomSlug, isHost]);

  if (!isHost) return null;

  async function toggle() {
    const next = !locked;
    setPending(true);
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        emitToast?.({
          tone: "danger",
          message: body?.error ?? "Não consegui alterar o estado da sala.",
        });
        return;
      }
      setLocked(next);
      emitToast?.({
        tone: next ? "warning" : "success",
        message: next
          ? "Sala trancada. Novas pessoas serão bloqueadas."
          : "Sala destrancada. Convidados podem entrar de novo.",
      });
    } catch {
      emitToast?.({
        tone: "danger",
        message: "Sem conexão. Tenta de novo.",
      });
    } finally {
      setPending(false);
    }
  }

  const Icon = locked ? Lock : Unlock;
  const label = locked ? "Destrancar sala" : "Trancar sala";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={locked}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        locked
          ? "bg-warning/15 text-warning hover:bg-warning/25"
          : "bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-brand"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
