"use client";

import * as React from "react";
import {
  useTracks,
  TrackRefContext,
  useSpeakingParticipants,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareStage } from "./ScreenShareStage";
import { useSpotlight } from "./spotlight-context";
import { cn } from "@/lib/utils";

const AUTO_SPOTLIGHT_MIN = 4; // ativa spotlight automático a partir de 4 tiles

/**
 * Layout adaptativo:
 *  - Se alguém está compartilhando tela → stage dominante + faixa de câmeras.
 *  - Senão, se auto-spotlight ativo e >4 participantes → pin dinâmico no
 *    último falante (sem clicar).
 *  - Senão → grid fluido (1-2-3-4+ colunas conforme a quantidade).
 *
 * Pin manual (clique no ícone do tile) sobrepõe o auto por N segundos até
 * o usuário desfazer. Pin manual desativa auto até o próximo toggle.
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

  const speakingParticipants = useSpeakingParticipants();
  const { autoSpotlight } = useSpotlight();

  const [manualPin, setManualPin] = React.useState<string | null>(null);
  const [autoPin, setAutoPin] = React.useState<string | null>(null);

  const activeScreen = screenTracks[0];

  // Auto-spotlight: sempre que alguém começa a falar, se auto está ativado
  // e não tem pin manual, promove o speaker mais recente pro palco.
  React.useEffect(() => {
    if (!autoSpotlight) return;
    if (manualPin) return;
    if (cameraTracks.length < AUTO_SPOTLIGHT_MIN) return;
    const active = speakingParticipants.filter((p) => !p.isLocal);
    const target = active[active.length - 1];
    if (target && target.identity !== autoPin) {
      setAutoPin(target.identity);
    }
  }, [
    speakingParticipants,
    autoSpotlight,
    manualPin,
    autoPin,
    cameraTracks.length,
  ]);

  // Se desligou auto-spotlight, limpa o auto-pin.
  React.useEffect(() => {
    if (!autoSpotlight) setAutoPin(null);
  }, [autoSpotlight]);

  if (activeScreen) {
    return (
      <ScreenShareStage
        screenTrack={activeScreen}
        cameras={cameraTracks}
      />
    );
  }

  // Pin efetivo: manual > auto
  const pinnedIdentity = manualPin ?? autoPin;
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
            <ParticipantTile
              focused
              onPin={() => {
                setManualPin(null);
                setAutoPin(null);
              }}
            />
          </TrackRefContext.Provider>
        </div>
        <div className="scrollbar-slim flex gap-2 overflow-x-auto pb-1 sm:gap-3">
          {others.map((track) => (
            <div
              key={trackKey(track)}
              className="w-28 shrink-0 sm:w-40 md:w-52"
            >
              <TrackRefContext.Provider value={track}>
                <ParticipantTile
                  onPin={() => setManualPin(track.participant.identity)}
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
            onPin={() => setManualPin(track.participant.identity)}
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
