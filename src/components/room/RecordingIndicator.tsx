"use client";

import * as React from "react";
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
 * Badge REC pulsante. Aparece para TODOS os participantes quando há gravação
 * ativa na sala. Poll a cada 5s (mesmo endpoint que RecordingControl).
 *
 * Não renderiza se Egress desabilitado ou sem gravação.
 */
export function RecordingIndicator() {
  const { roomSlug } = useMeeting();
  const [status, setStatus] = React.useState<StatusResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${roomSlug}/recording/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (!cancelled) setStatus(data);
      } catch {
        // silencioso
      }
    }

    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomSlug]);

  if (!status?.active) return null;

  return (
    <span
      role="status"
      aria-label="Sala sendo gravada"
      className="inline-flex items-center gap-1.5 rounded-sm border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-danger"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger"
      />
      REC
    </span>
  );
}
