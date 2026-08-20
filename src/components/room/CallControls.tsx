"use client";

import * as React from "react";
import {
  useLocalParticipant,
  useTrackToggle,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  MessageSquare,
  Users,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  chatOpen: boolean;
  participantsOpen: boolean;
  unreadChat: number;
  onLeave: () => void;
}

export function CallControls({
  onToggleChat,
  onToggleParticipants,
  chatOpen,
  participantsOpen,
  unreadChat,
  onLeave,
}: CallControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const screen = useTrackToggle({ source: Track.Source.ScreenShare });

  const micOn = mic.enabled ?? localParticipant.isMicrophoneEnabled;
  const camOn = cam.enabled ?? localParticipant.isCameraEnabled;
  const screenOn = screen.enabled ?? localParticipant.isScreenShareEnabled;

  async function handleLeave() {
    await room.disconnect();
    onLeave();
  }

  return (
    <div className="flex items-center justify-center gap-2 border-t border-border bg-background px-4 py-3">
      <ControlButton
        tone={micOn ? "brand" : "muted"}
        onClick={mic.toggle}
        label={micOn ? "Silenciar microfone" : "Ativar microfone"}
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </ControlButton>

      <ControlButton
        tone={camOn ? "brand" : "muted"}
        onClick={cam.toggle}
        label={camOn ? "Desligar câmera" : "Ligar câmera"}
      >
        {camOn ? (
          <Video className="h-4 w-4" />
        ) : (
          <VideoOff className="h-4 w-4" />
        )}
      </ControlButton>

      <ControlButton
        tone={screenOn ? "brand" : "neutral"}
        onClick={screen.toggle}
        label={screenOn ? "Parar compartilhamento" : "Compartilhar tela"}
      >
        {screenOn ? (
          <ScreenShareOff className="h-4 w-4" />
        ) : (
          <ScreenShare className="h-4 w-4" />
        )}
      </ControlButton>

      <span className="mx-2 h-6 w-px bg-border" />

      <ControlButton
        tone={participantsOpen ? "brand" : "neutral"}
        onClick={onToggleParticipants}
        label="Pessoas"
      >
        <Users className="h-4 w-4" />
      </ControlButton>

      <div className="relative">
        <ControlButton
          tone={chatOpen ? "brand" : "neutral"}
          onClick={onToggleChat}
          label="Chat"
        >
          <MessageSquare className="h-4 w-4" />
        </ControlButton>
        {unreadChat > 0 && !chatOpen && (
          <span
            className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-brand-fg"
            aria-label={`${unreadChat} mensagens não lidas`}
          >
            {unreadChat > 9 ? "9+" : unreadChat}
          </span>
        )}
      </div>

      <span className="mx-2 h-6 w-px bg-border" />

      <Button
        variant="danger"
        size="md"
        onClick={handleLeave}
        leftIcon={<Phone className="h-4 w-4 rotate-[135deg]" />}
      >
        Sair
      </Button>
    </div>
  );
}

type Tone = "neutral" | "brand" | "muted";

function ControlButton({
  children,
  onClick,
  tone,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone: Tone;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={tone === "brand"}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150",
        tone === "brand" &&
          "bg-brand/15 text-brand hover:bg-brand/25",
        tone === "muted" &&
          "bg-surface-raised text-text-muted hover:bg-surface-hover hover:text-brand",
        tone === "neutral" &&
          "bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-brand"
      )}
    >
      {children}
    </button>
  );
}
