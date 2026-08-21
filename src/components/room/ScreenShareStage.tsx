"use client";

import * as React from "react";
import {
  VideoTrack,
  TrackRefContext,
  isTrackReference,
  useParticipantTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import {
  RemoteAudioTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";
import { EyeOff, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [volume, setVolume] = React.useState(1); // 0..1
  const [watching, setWatching] = React.useState(true);

  // Track de áudio do screen share (pode não existir se o compartilhador
  // não incluiu áudio). Pegamos separado pra controlar volume/subscribe.
  const audioTracks = useParticipantTracks(
    [Track.Source.ScreenShareAudio],
    screenTrack.participant.identity
  );
  const audioPub = audioTracks[0]?.publication;
  const audioTrack = audioPub?.track;

  // Video publication pra controlar unsubscribe quando o usuário decide
  // "não assistir".
  const videoPub = screenTrack.publication;

  // Aplica volume no track de áudio remoto sempre que muda.
  React.useEffect(() => {
    if (audioTrack instanceof RemoteAudioTrack) {
      audioTrack.setVolume(volume);
    }
  }, [audioTrack, volume]);

  // Se o usuário decidiu parar de assistir, damos unsubscribe nas duas
  // publications remotas — para de baixar mídia e libera banda. Reassina
  // ao voltar a assistir.
  React.useEffect(() => {
    if (!(videoPub instanceof RemoteTrackPublication)) return;
    try {
      videoPub.setSubscribed(watching);
    } catch {
      /* pub pode ter sumido */
    }
    if (audioPub instanceof RemoteTrackPublication) {
      try {
        audioPub.setSubscribed(watching);
      } catch {
        /* idem */
      }
    }
  }, [watching, videoPub, audioPub]);

  // Fecha o menu de contexto ao apertar Esc.
  React.useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        className="relative flex-1 overflow-hidden rounded-md border border-brand/40 bg-black"
        onContextMenu={handleContextMenu}
      >
        {isTrackReference(screenTrack) && watching ? (
          <VideoTrack
            trackRef={screenTrack}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-raised/40 p-6 text-center">
            <div className="max-w-sm text-sm text-text-secondary">
              <EyeOff className="mx-auto mb-2 h-6 w-6 text-text-muted" />
              Você parou de assistir <span className="text-text-primary">{sharerName}</span>.
              <button
                onClick={() => setWatching(true)}
                className="mt-3 block w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:bg-brand-hover"
              >
                Voltar a assistir
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 rounded-sm bg-brand/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-brand-fg">
          {sharerName} está compartilhando
        </div>

        {/* Dica de "clique direito pra opções" — só quando ainda assistindo
            e o menu não está aberto. Some após 5s. */}
        <ContextHint show={watching && !menuOpen} />

        {menuOpen && watching && (
          <ScreenShareOptionsPanel
            sharerName={sharerName}
            volume={volume}
            hasAudio={!!audioTrack}
            onVolumeChange={setVolume}
            onStopWatching={() => {
              setWatching(false);
              setMenuOpen(false);
            }}
            onClose={() => setMenuOpen(false)}
          />
        )}
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

/**
 * Painel de opções ao clicar com botão direito na tela compartilhada.
 * Renderizado dentro do stage — usa transform absoluto pra ficar centrado.
 */
function ScreenShareOptionsPanel({
  sharerName,
  volume,
  hasAudio,
  onVolumeChange,
  onStopWatching,
  onClose,
}: {
  sharerName: string;
  volume: number;
  hasAudio: boolean;
  onVolumeChange: (v: number) => void;
  onStopWatching: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop cliqueá-para-fechar */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-label="Opções da tela compartilhada"
        className={cn(
          "absolute left-1/2 top-1/2 z-20 w-[min(20rem,calc(100%-2rem))]",
          "-translate-x-1/2 -translate-y-1/2 rounded-lg",
          "border border-border bg-surface p-5 shadow-2xl shadow-black/50"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-brand uppercase">
              Tela compartilhada
            </p>
            <p className="mt-0.5 text-sm text-text-primary">{sharerName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-focus/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Volume */}
        <div className="mb-5">
          <label
            htmlFor="ss-volume"
            className="mb-2 flex items-center justify-between text-xs font-medium text-text-secondary"
          >
            <span className="flex items-center gap-2">
              {volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              Volume desta tela
            </span>
            <span className="font-mono text-text-muted">
              {hasAudio ? `${Math.round(volume * 100)}%` : "sem áudio"}
            </span>
          </label>
          <input
            id="ss-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            disabled={!hasAudio}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-raised accent-brand disabled:cursor-not-allowed disabled:opacity-40"
          />
          <p className="mt-1.5 text-[11px] text-text-muted">
            {hasAudio
              ? "Ajusta o som só pra você — os outros não são afetados."
              : "Quem compartilha não incluiu áudio."}
          </p>
        </div>

        {/* Parar de assistir */}
        <button
          onClick={onStopWatching}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-focus/60"
        >
          <EyeOff className="h-4 w-4" />
          Parar de assistir
        </button>
        <p className="mt-1.5 text-[11px] text-text-muted">
          Libera banda — você pode voltar a assistir a qualquer momento.
        </p>
      </div>
    </>
  );
}

/** Dica visual sutil no canto — "Clique direito pra opções". */
function ContextHint({ show }: { show: boolean }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(t);
  }, [show]);

  if (!show || !visible) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/70 px-3 py-1 text-[10px] text-text-muted backdrop-blur">
      Clique direito → opções
    </div>
  );
}
