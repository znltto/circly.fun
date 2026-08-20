"use client";

import * as React from "react";
import Link from "next/link";
import { Circle, Square, FolderOpen } from "lucide-react";
import { useMeeting } from "./meeting-context";

interface StatusResponse {
  active: {
    id: string;
    egressId: string;
    status: "starting" | "active" | "complete" | "failed" | "aborted";
    startedAt: string;
  } | null;
  enabled: boolean;
}

/**
 * Botão de gravar/parar + link para gravações antigas. Só host vê.
 * Faz polling do status a cada 5s enquanto na sala.
 *
 * Se o servidor devolve `enabled: false` (env-gate), não renderiza nada.
 */
export function RecordingControl() {
  const { roomSlug, isHost } = useMeeting();
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirmingStop, setConfirmingStop] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/recording/status`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch {
      // silencioso — polling tenta de novo
    }
  }, [roomSlug]);

  React.useEffect(() => {
    void fetchStatus();
    const id = window.setInterval(fetchStatus, 5000);
    return () => window.clearInterval(id);
  }, [fetchStatus]);

  if (!isHost) return null;
  if (!status || status.enabled === false) return null;

  const isRecording = !!status.active;

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/recording/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Não foi possível iniciar a gravação.");
      } else {
        await fetchStatus();
      }
    } catch {
      setError("Falha de rede ao iniciar gravação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/recording/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Não foi possível parar a gravação.");
      } else {
        await fetchStatus();
      }
    } catch {
      setError("Falha de rede ao parar gravação.");
    } finally {
      setBusy(false);
      setConfirmingStop(false);
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      {isRecording ? (
        <button
          type="button"
          onClick={() => setConfirmingStop(true)}
          disabled={busy}
          aria-label="Parar gravação"
          className="inline-flex items-center gap-1.5 rounded-sm border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
        >
          <Square className="h-3 w-3 fill-current" aria-hidden />
          Parar gravação
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={busy}
          aria-label="Iniciar gravação"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
        >
          <Circle className="h-3 w-3 fill-current text-danger" aria-hidden />
          {busy ? "Iniciando..." : "Gravar"}
        </button>
      )}

      <Link
        href={`/salas/${roomSlug}/gravacoes`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver gravações desta sala"
        className="inline-flex items-center rounded-sm p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        <FolderOpen className="h-3.5 w-3.5" aria-hidden />
      </Link>

      {error && (
        <div
          role="alert"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-danger/40 bg-background px-3 py-2 text-xs text-danger shadow-lg"
        >
          {error}
        </div>
      )}

      {confirmingStop && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar parar gravação"
          className="absolute right-0 top-full z-30 mt-2 w-60 rounded-md border border-border bg-background p-3 text-xs shadow-lg"
        >
          <p className="text-text-primary">Parar a gravação agora?</p>
          <p className="mt-1 text-text-muted">
            O arquivo ficará disponível em Gravações em alguns segundos.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmingStop(false)}
              className="rounded-sm px-2 py-1 text-text-secondary hover:bg-surface-hover"
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={busy}
              className="rounded-sm bg-danger/15 px-2 py-1 font-medium text-danger hover:bg-danger/25 disabled:opacity-50"
            >
              {busy ? "Parando..." : "Parar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
