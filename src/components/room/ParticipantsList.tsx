"use client";

import { useParticipants } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, MonitorUp } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";

export function ParticipantsList() {
  const participants = useParticipants();

  return (
    <ul className="space-y-1">
      {participants.map((p) => {
        return (
          <li
            key={p.identity}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-hover"
          >
            <UserAvatar name={p.name || p.identity} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm text-text-primary">
                <span className="truncate">{p.name || p.identity}</span>
                {p.isLocal && (
                  <span className="text-xs text-text-muted">(você)</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 text-text-muted">
              {p.isScreenShareEnabled && (
                <MonitorUp className="h-3.5 w-3.5 text-brand" />
              )}
              {p.isMicrophoneEnabled ? (
                <Mic className="h-3.5 w-3.5" />
              ) : (
                <MicOff className="h-3.5 w-3.5 text-danger" />
              )}
              {p.isCameraEnabled ? (
                <Video className="h-3.5 w-3.5" />
              ) : (
                <VideoOff className="h-3.5 w-3.5" />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
