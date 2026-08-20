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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/Avatar";
import { useMeeting } from "./meeting-context";

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

      {/* Menu do host no canto superior direito */}
      {canModerate && (
        <div className="absolute right-2 top-2 z-10">
          <HostMenu
            roomSlug={roomSlug}
            identity={participant.identity}
            name={name}
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
}: {
  roomSlug: string;
  identity: string;
  name: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function moderate(action: "mute-audio" | "mute-video" | "mute-screen" | "kick") {
    setPending(action);
    try {
      const res = await fetch("/api/livekit/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: roomSlug, identity, action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        console.warn("[moderate] falhou:", body?.error);
      }
    } catch (err) {
      console.warn("[moderate] erro de rede:", err);
    } finally {
      setPending(null);
      setOpen(false);
    }
  }

  async function kickWithConfirm() {
    const ok = confirm(`Remover ${name} da sala?`);
    if (ok) await moderate("kick");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ações do host para ${name}`}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-white/90 backdrop-blur transition-colors hover:bg-background/90 hover:text-white"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-56 rounded-md border border-border bg-surface-raised p-1 shadow-lg shadow-black/40"
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
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<UserX className="h-3.5 w-3.5" />}
            label="Remover da sala"
            loading={pending === "kick"}
            onClick={kickWithConfirm}
            danger
          />
        </div>
      )}
    </div>
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
