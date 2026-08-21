"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, DoorOpen, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  respondToInvitation,
  type PendingInvitation,
} from "@/lib/rooms/invitations";

export function InvitationCard({
  invitation,
}: {
  invitation: PendingInvitation;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);

  async function handle(action: "accept" | "decline") {
    setPending(action);
    setError(null);
    try {
      const res = await respondToInvitation(invitation.id, action);
      if (!res.ok) {
        setError(res.error ?? "Falha ao responder.");
        return;
      }
      if (res.redirectSlug) {
        router.push(`/s/${res.redirectSlug}`);
        return;
      }
      // Recusou ou aceitou sala inativa — apenas re-renderiza a lista.
      router.refresh();
    } catch (err) {
      console.error("[respondToInvitation]", err);
      setError("Erro de rede.");
    } finally {
      setPending(null);
    }
  }

  const scheduledLabel = invitation.room.scheduledFor
    ? new Date(invitation.room.scheduledFor).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const receivedLabel = new Date(invitation.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const active = invitation.room.active;

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={invitation.inviter.displayName}
          src={invitation.inviter.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary">
            <span className="font-medium">
              {invitation.inviter.displayName}
            </span>{" "}
            <span className="text-text-muted">
              (@{invitation.inviter.username})
            </span>
          </p>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            te chamou pra{" "}
            <span className="text-text-primary">
              {invitation.room.title}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
            <span>Recebido {receivedLabel}</span>
            {scheduledLabel && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> {scheduledLabel}
              </span>
            )}
            {!active && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">
                sala encerrada
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => handle("accept")}
          loading={pending === "accept"}
          disabled={!active || pending !== null}
          leftIcon={
            !pending && active ? <DoorOpen className="h-4 w-4" /> : undefined
          }
        >
          {active ? "Entrar na sala" : "Sala encerrada"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handle("decline")}
          loading={pending === "decline"}
          disabled={pending !== null}
          leftIcon={!pending ? <X className="h-4 w-4" /> : undefined}
        >
          Recusar
        </Button>
        {!active && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handle("decline")}
            loading={pending === "decline"}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Dispensar
          </Button>
        )}
      </div>
    </article>
  );
}
