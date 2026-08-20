"use client";

import * as React from "react";
import {
  useTracks,
  TrackRefContext,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareStage } from "./ScreenShareStage";
import { cn } from "@/lib/utils";

/**
 * Layout adaptativo:
 *  - Se alguém está compartilhando tela → stage dominante + faixa de câmeras.
 *  - Senão → grid fluido (1-2-3-4+ colunas conforme a quantidade).
 */
export function ParticipantGrid() {
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const [pinnedIdentity, setPinnedIdentity] = React.useState<string | null>(
    null
  );

  const activeScreen = screenTracks[0];

  if (activeScreen) {
    return (
      <ScreenShareStage
        screenTrack={activeScreen}
        cameras={cameraTracks}
      />
    );
  }

  const pinned = pinnedIdentity
    ? cameraTracks.find((t) => t.participant.identity === pinnedIdentity)
    : null;

  const others = pinned
    ? cameraTracks.filter((t) => t.participant.identity !== pinnedIdentity)
    : cameraTracks;

  if (pinned) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex-1">
          <TrackRefContext.Provider value={pinned}>
            <ParticipantTile focused onPin={() => setPinnedIdentity(null)} />
          </TrackRefContext.Provider>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {others.map((track) => (
            <div
              key={trackKey(track)}
              className="w-40 shrink-0 md:w-52"
            >
              <TrackRefContext.Provider value={track}>
                <ParticipantTile
                  onPin={() => setPinnedIdentity(track.participant.identity)}
                />
              </TrackRefContext.Provider>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-full auto-rows-fr gap-3",
        gridColsFor(cameraTracks.length)
      )}
    >
      {cameraTracks.map((track) => (
        <TrackRefContext.Provider value={track} key={trackKey(track)}>
          <ParticipantTile
            onPin={() => setPinnedIdentity(track.participant.identity)}
          />
        </TrackRefContext.Provider>
      ))}
    </div>
  );
}

function trackKey(t: TrackReferenceOrPlaceholder): string {
  return `${t.participant.identity}:${t.source}`;
}

function gridColsFor(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 md:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-2 md:grid-cols-3";
  if (n <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-4";
}
