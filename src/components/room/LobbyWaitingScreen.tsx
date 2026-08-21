"use client";

import * as React from "react";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { Button } from "@/components/ui/Button";

interface LobbyWaitingScreenProps {
  slug: string;
  lobbyId: string;
  roomTitle: string;
  onAdmitted: (admitToken: string) => void;
  onDenied: () => void;
  onCancel: () => void;
}

/**
 * Tela de "aguardando aprovação do host" — poll a cada 2s no endpoint de
 * status. Quando `admitted`, dispara `onAdmitted(token)` e o controlador pai
 * troca por token do LiveKit.
 *
 * Envia um cancel via `sendBeacon` se o usuário fecha a aba antes de ser
 * atendido, pra não ficar entulhando a fila do host.
 */
export function LobbyWaitingScreen({
  slug,
  lobbyId,
  roomTitle,
  onAdmitted,
  onDenied,
  onCancel,
}: LobbyWaitingScreenProps) {
  const [status, setStatus] = React.useState<
    "pending" | "admitted" | "denied" | "cancelled" | "timeout" | "gone"
  >("pending");
  const [elapsed, setElapsed] = React.useState(0);
  const admittedRef = React.useRef(false);

  React.useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(
          `/api/rooms/${slug}/lobby/status?lobbyId=${lobbyId}`,
          { cache: "no-store" }
        );
        if (res.status === 404) {
          if (!cancelled) setStatus("gone");
          return;
        }
        if (!res.ok) return;
        const body = (await res.json()) as {
          status: string;
          admitToken?: string;
        };
        if (cancelled) return;
        if (body.status === "admitted" && body.admitToken) {
          if (admittedRef.current) return;
          admittedRef.current = true;
          setStatus("admitted");
          onAdmitted(body.admitToken);
          return;
        }
        if (body.status === "denied") {
          setStatus("denied");
          onDenied();
          return;
        }
      } catch {
        // silencioso — mantém polling
      }
    }

    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug, lobbyId, onAdmitted, onDenied]);

  // Cancela a entrada se o usuário fechar a aba antes de ser admitido.
  React.useEffect(() => {
    function beforeUnload() {
      if (admittedRef.current) return;
      try {
        const blob = new Blob([JSON.stringify({ lobbyId })], {
          type: "application/json",
        });
        navigator.sendBeacon(`/api/rooms/${slug}/lobby/cancel`, blob);
      } catch {
        // best-effort
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [slug, lobbyId]);

  async function handleCancel() {
    try {
      await fetch(`/api/rooms/${slug}/lobby/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId }),
        keepalive: true,
      });
    } catch {
      // segue
    }
    onCancel();
  }

  const isDenied = status === "denied";
  const isGone = status === "gone";
  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative flex items-center justify-center">
        {status === "pending" && (
          <>
            <span
              aria-hidden
              className="absolute h-32 w-32 animate-ping rounded-full bg-brand/10"
            />
            <span
              aria-hidden
              className="absolute h-24 w-24 animate-pulse rounded-full bg-brand/5"
            />
          </>
        )}
        <CcoMascot
          variant={isDenied || isGone ? "goodbye" : "waiting"}
          className="relative h-24 w-24 text-brand"
        />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="font-serif text-2xl text-text-primary">
          {isDenied
            ? "O host não te aprovou desta vez."
            : isGone
              ? "Pedido expirou."
              : "Aguardando o host aprovar sua entrada"}
        </h1>
        <p className="text-sm text-text-muted text-pretty">
          {isDenied
            ? "Se foi engano, tenta entrar de novo pelo mesmo link."
            : isGone
              ? "Recarrega a página pra tentar de novo."
              : `${roomTitle} · esperando há ${mins}min ${secs}s.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {(isDenied || isGone) && (
          <Button onClick={() => window.location.reload()}>
            Tentar de novo
          </Button>
        )}
        {!isDenied && !isGone && (
          <Button variant="secondary" onClick={handleCancel}>
            Desistir
          </Button>
        )}
      </div>
    </main>
  );
}
