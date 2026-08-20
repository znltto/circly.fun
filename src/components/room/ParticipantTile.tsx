"use client";

import * as React from "react";
import {
  useTrackRefContext,
  VideoTrack,
  useIsSpeaking,
  useParticipantTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/Avatar";

interface ParticipantTileProps {
  focused?: boolean;
  onPin?: () => void;
}

export function ParticipantTile({ focused, onPin }: ParticipantTileProps) {
  const trackRef = useTrackRefContext();
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);

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
