"use client";

import {
  VideoTrack,
  TrackRefContext,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ParticipantTile } from "./ParticipantTile";

interface ScreenShareStageProps {
  screenTrack: TrackReferenceOrPlaceholder;
  cameras: TrackReferenceOrPlaceholder[];
}

export function ScreenShareStage({
  screenTrack,
  cameras,
}: ScreenShareStageProps) {
  const sharerName =
    screenTrack.participant.name || screenTrack.participant.identity;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-md border border-brand/40 bg-black">
        {isTrackReference(screenTrack) && (
          <VideoTrack
            trackRef={screenTrack}
            className="h-full w-full object-contain"
          />
        )}
        <div className="pointer-events-none absolute left-3 top-3 rounded-sm bg-brand/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-brand-fg">
          {sharerName} está compartilhando
        </div>
      </div>

      {cameras.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {cameras.map((track) => (
            <div
              key={`${track.participant.identity}:${track.source}`}
              className="w-40 shrink-0 md:w-52"
            >
              <TrackRefContext.Provider value={track}>
                <ParticipantTile />
              </TrackRefContext.Provider>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
