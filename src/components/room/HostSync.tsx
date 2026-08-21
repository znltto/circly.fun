"use client";

import * as React from "react";
import { useMeeting } from "./meeting-context";

/**
 * Faz polling do host atual da sala. Se o servidor mudar `rooms.host_id`
 * (via `POST /api/rooms/[slug]/host`), esse componente detecta e:
 *
 * - Se o novo host é você → promove localmente (isHost=true) e emite toast.
 * - Se você era host e não é mais → despromove localmente e emite toast.
 *
 * Componente sem UI. Renderiza null.
 */
export function HostSync() {
  const { roomSlug, localIdentity, isHost, setIsHost, emitToast } = useMeeting();
  const lastKnownRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${roomSlug}/host`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { hostIdentity?: string };
        if (cancelled || !body.hostIdentity) return;

        if (lastKnownRef.current === body.hostIdentity) return;
        lastKnownRef.current = body.hostIdentity;

        const iAmHostNow = body.hostIdentity === localIdentity;
        if (iAmHostNow && !isHost) {
          setIsHost(true);
          emitToast?.({
            tone: "success",
            message: "Você agora é o host desta sala.",
            duration: 6000,
          });
        } else if (!iAmHostNow && isHost) {
          setIsHost(false);
          emitToast?.({
            tone: "info",
            message: "Você deixou de ser o host desta sala.",
            duration: 6000,
          });
        }
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
  }, [roomSlug, localIdentity, isHost, setIsHost, emitToast]);

  return null;
}
