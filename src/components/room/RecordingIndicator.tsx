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
 * Emite toast in-call quando a gravação inicia ou termina — assim ninguém
 * é gravado sem perceber, mesmo que a gravação comece depois do início da
 * chamada.
 *
 * Não renderiza se Egress desabilitado ou sem gravação.
 */
export function RecordingIndicator() {
  const { roomSlug, emitToast } = useMeeting();
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const wasActiveRef = React.useRef<boolean | null>(null);
  const firstFetchRef = React.useRef(true);

  React.useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${roomSlug}/recording/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (cancelled) return;
        setStatus(data);

        const isActive = !!data.active;
        const previous = wasActiveRef.current;
        // No primeiro fetch a gente estabelece o baseline. Se a sala já
        // estava sendo gravada antes de entrarmos, o modal de consentimento
        // pré-call já tratou disso; não voltamos a alertar aqui.
        if (firstFetchRef.current) {
          firstFetchRef.current = false;
          wasActiveRef.current = isActive;
          return;
        }
        if (previous === false && isActive) {
          emitToast?.({
            tone: "warning",
            message:
              "A sala começou a ser gravada agora. O host iniciou uma gravação.",
            duration: 0, // persistente até dispensar
          });
        } else if (previous === true && !isActive) {
          emitToast?.({
            tone: "info",
            message: "Gravação encerrada.",
          });
        }
        wasActiveRef.current = isActive;
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
  }, [roomSlug, emitToast]);

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
