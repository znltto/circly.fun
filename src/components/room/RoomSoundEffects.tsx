"use client";

import * as React from "react";
import {
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import {
  RoomEvent,
  ParticipantEvent,
} from "livekit-client";

/**
 * Pings sonoros discretos para eventos importantes na sala.
 * Toca apenas depois da conexão estabelecida — não polui o join inicial.
 *
 * Volume baixo, tom curto. Gera sons via WebAudio API para não precisar
 * de arquivo de áudio.
 */
export function RoomSoundEffects() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const readyRef = React.useRef(false);

  React.useEffect(() => {
    // Preferencias do usuário — respeita mute geral
    if (typeof window === "undefined") return;

    function getCtx(): AudioContext | null {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new AudioContext();
        } catch {
          return null;
        }
      }
      return audioCtxRef.current;
    }

    function ping(freq: number, durationMs: number) {
      if (!readyRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationMs / 1000);
    }

    // Marca como pronto depois de 1s (evita ping do próprio join)
    const readyTimer = setTimeout(() => {
      readyRef.current = true;
    }, 1200);

    function onJoin() {
      ping(660, 180);
      setTimeout(() => ping(880, 140), 120);
    }
    function onLeave() {
      ping(440, 220);
    }
    function onLocalMuted() {
      // host silenciou este usuário — dois tons descendentes
      ping(520, 120);
      setTimeout(() => ping(390, 160), 90);
    }

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    localParticipant.on(ParticipantEvent.TrackMuted, () => {
      // dispara só quando alguém EXTERNO muta a track (host)
      // heurística: se aconteceu logo após um evento de admin
      // — mantém simples: sempre toca ao mutar. Usuário próprio muted → ok.
      onLocalMuted();
    });

    return () => {
      clearTimeout(readyTimer);
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, [room, localParticipant]);

  return null;
}
