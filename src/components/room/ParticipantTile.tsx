"use client";

import * as React from "react";
import {
  useTrackRefContext,
  VideoTrack,
  useIsSpeaking,
  useParticipantTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Pin,
  MoreVertical,
  MicOff as MicOffIcon,
  VideoOff,
  ScreenShareOff,
  UserX,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/Avatar";
import { useMeeting } from "./meeting-context";
import { HandRaisedBadge } from "./HandRaise";

interface ParticipantTileProps {
  focused?: boolean;
  onPin?: () => void;
}

export function ParticipantTile({ focused, onPin }: ParticipantTileProps) {
  const trackRef = useTrackRefContext();
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);
  const { isHost, roomSlug, localIdentity } = useMeeting();

  const audioTracks = useParticipantTracks(
    [Track.Source.Microphone],
    participant.identity
  );
  const audioTrack = audioTracks[0];
  const micMuted = !audioTrack || audioTrack.publication?.isMuted;

  const videoPublication = trackRef.publication;
  const hasVideo =
    !!videoPublication && !videoPublication.isMuted && !!videoPublication.track;

  const name = participant.name || participant.identity;
  const canModerate =
    isHost && !participant.isLocal && participant.identity !== localIdentity;

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-md border bg-surface-raised",
        isSpeaking ? "border-brand" : "border-border",
        focused && "ring-2 ring-brand/60"
      )}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn(
            "h-full w-full object-cover",
            participant.isLocal && "-scale-x-100"
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <UserAvatar name={name} size="xl" />
        </div>
      )}

      {/* Mão levantada — canto superior esquerdo (não conflita com menu do host) */}
      <HandRaisedBadge identity={participant.identity} />

      {/* Menu do host no canto superior direito */}
      {canModerate && (
        <div className="absolute right-2 top-2 z-10">
          <HostMenu
            roomSlug={roomSlug}
            identity={participant.identity}
            name={name}
            canTransferHost={participant.identity.startsWith("u:")}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-xs">
        <span className="flex items-center gap-1.5 text-white">
          {micMuted ? (
            <MicOff className="h-3 w-3 text-danger" aria-label="Sem microfone" />
          ) : (
            <Mic className="h-3 w-3" aria-hidden />
          )}
          <span className="truncate">{name}</span>
          {participant.isLocal && (
            <span className="text-white/50">(você)</span>
          )}
        </span>
        {onPin && (
          <button
            onClick={onPin}
            aria-label="Fixar participante"
            className="pointer-events-auto rounded-sm p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Pin className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Host contextual menu ---------- */

function HostMenu({
  roomSlug,
  identity,
  name,
  canTransferHost,
}: {
  roomSlug: string;
  identity: string;
  name: string;
  canTransferHost: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [confirmKick, setConfirmKick] = React.useState(false);
  const [confirmTransfer, setConfirmTransfer] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { emitToast } = useMeeting();

  async function transferHost() {
    setOpen(false);
    setPending("transfer");
    try {
      const res = await fetch(`/api/rooms/${roomSlug}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toIdentity: identity }),
      });
      if (!res.ok) {
        const body = (await res
          .json()
          .catch(() => null)) as { error?: string } | null;
        emitToast?.({
          tone: "danger",
          message: body?.error ?? "Não consegui transferir o controle.",
        });
        return;
      }
      emitToast?.({
        tone: "success",
        message: `${name} agora é o host.`,
      });
    } catch {
      emitToast?.({
        tone: "danger",
        message: "Sem conexão. Tenta de novo.",
      });
    } finally {
      setPending(null);
      setConfirmTransfer(false);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    // pointerdown pega mouse + toque; capture pega antes que o item do menu
    // engula o evento (fecha se clicou fora, mantém se clicou dentro).
    function onDown(e: PointerEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Fecha o menu ao pressionar Esc, sem precisar clicar fora.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function moderate(
    action: "mute-audio" | "mute-video" | "mute-screen" | "kick"
  ) {
    // Fecha o menu imediatamente pra evitar cliques duplos enquanto o fetch
    // roda. O toast dá o feedback do resultado. O dialog de confirmação
    // continua aberto por conta própria enquanto pending — fecha no finally.
    setOpen(false);
    setPending(action);
    try {
      const res = await fetch("/api/livekit/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: roomSlug, identity, action }),
      });
      if (!res.ok) {
        const body = (await res
          .json()
          .catch(() => null)) as { error?: string } | null;
        emitToast?.({
          tone: "danger",
          message: `Não consegui ${labelForAction(action)} ${name}. ${
            body?.error ?? ""
          }`.trim(),
        });
        return;
      }
      emitToast?.({
        tone: "success",
        message: `${capFirst(labelForAction(action))} — ${name}.`,
      });
    } catch {
      emitToast?.({
        tone: "danger",
        message: `Sem conexão para moderar ${name}. Tenta de novo.`,
      });
    } finally {
      setPending(null);
      setConfirmKick(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ações do host para ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-white/90 backdrop-blur transition-colors hover:bg-background/90 hover:text-white"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-[min(14rem,calc(100vw-1.5rem))] max-w-[14rem] rounded-md border border-border bg-surface-raised p-1 shadow-lg shadow-black/40"
        >
          <MenuItem
            icon={<MicOffIcon className="h-3.5 w-3.5" />}
            label="Silenciar microfone"
            loading={pending === "mute-audio"}
            onClick={() => moderate("mute-audio")}
          />
          <MenuItem
            icon={<VideoOff className="h-3.5 w-3.5" />}
            label="Desligar câmera"
            loading={pending === "mute-video"}
            onClick={() => moderate("mute-video")}
          />
          <MenuItem
            icon={<ScreenShareOff className="h-3.5 w-3.5" />}
            label="Parar compartilhamento"
            loading={pending === "mute-screen"}
            onClick={() => moderate("mute-screen")}
          />
          {canTransferHost && (
            <>
              <div className="my-1 h-px bg-border" />
              <MenuItem
                icon={<Crown className="h-3.5 w-3.5" />}
                label="Passar controle da sala"
                loading={pending === "transfer"}
                onClick={() => {
                  setOpen(false);
                  setConfirmTransfer(true);
                }}
              />
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<UserX className="h-3.5 w-3.5" />}
            label="Remover da sala"
            loading={pending === "kick"}
            onClick={() => {
              setOpen(false);
              setConfirmKick(true);
            }}
            danger
          />
        </div>
      )}

      {confirmKick && (
        <ConfirmKickDialog
          name={name}
          pending={pending === "kick"}
          onCancel={() => setConfirmKick(false)}
          onConfirm={() => moderate("kick")}
        />
      )}

      {confirmTransfer && (
        <ConfirmTransferDialog
          name={name}
          pending={pending === "transfer"}
          onCancel={() => setConfirmTransfer(false)}
          onConfirm={transferHost}
        />
      )}
    </div>
  );
}

function ConfirmTransferDialog({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        aria-hidden
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-labelledby="transfer-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="transfer-title" className="font-serif text-xl text-text-primary">
          Passar controle para {name}?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Você deixa de ser o host. Essa pessoa passa a poder silenciar, remover
          participantes, trancar a sala e gravar. Você continua na chamada como
          participante comum.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            <Crown className="h-4 w-4" />
            {pending ? "Transferindo..." : "Passar controle"}
          </button>
        </div>
      </div>
    </>
  );
}

function labelForAction(action: string): string {
  switch (action) {
    case "mute-audio":
      return "silenciar";
    case "mute-video":
      return "desligar a câmera de";
    case "mute-screen":
      return "parar o compartilhamento de";
    case "kick":
      return "remover";
    default:
      return "moderar";
  }
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ConfirmKickDialog({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        aria-hidden
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-labelledby="kick-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="kick-title" className="font-serif text-xl text-text-primary">
          Remover {name}?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Essa pessoa sai da sala agora. Ela pode voltar pelo mesmo link se a
          sala não estiver trancada.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/85 disabled:opacity-50"
          >
            <UserX className="h-4 w-4" />
            {pending ? "Removendo..." : "Remover"}
          </button>
        </div>
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  loading,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
        "hover:bg-surface-hover disabled:opacity-50",
        danger ? "text-danger hover:bg-danger/10" : "text-text-secondary hover:text-text-primary"
      )}
    >
      <span className={danger ? "text-danger" : "text-text-muted"}>{icon}</span>
      <span className="truncate">{loading ? "Aplicando..." : label}</span>
    </button>
  );
}
