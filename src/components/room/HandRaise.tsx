"use client";

import * as React from "react";
import {
  useLocalParticipant,
  useRoomContext,
  useRemoteParticipants,
} from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeeting } from "./meeting-context";

const HAND_EVENT_TOPIC = "circly.hand";

type HandRaiseMessage =
  | { type: "hand"; raised: boolean; at: number }
  | { type: "lower-all"; at: number };

interface HandState {
  raised: boolean;
  since: number;
}

interface HandRaiseContextValue {
  hands: Record<string, HandState>;
  myHandRaised: boolean;
  toggleMyHand: () => void;
  lowerAllHands: () => void;
  raisedIdentitiesOrdered: string[];
}

const HandRaiseContext = React.createContext<HandRaiseContextValue | null>(null);

/**
 * Estado compartilhado de "quem tá com a mão levantada". Broadcasted via
 * `publishData` do LiveKit — todos os participantes recebem em tempo real,
 * sem RTT ao Supabase.
 *
 * Quando um participante entra depois, quem já estava com a mão levantada
 * re-broadcasta ao detectar o `ParticipantConnected` (idempotente).
 */
export function HandRaiseProvider({ children }: { children: React.ReactNode }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [hands, setHands] = React.useState<Record<string, HandState>>({});
  const [myHandRaised, setMyHandRaised] = React.useState(false);

  // Recebe broadcasts
  React.useEffect(() => {
    function handleData(
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string
    ) {
      if (topic && topic !== HAND_EVENT_TOPIC) return;
      if (!participant) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as
          | HandRaiseMessage
          | undefined;
        if (!msg) return;
        if (msg.type === "hand") {
          setHands((prev) => {
            const next = { ...prev };
            if (msg.raised) {
              const since = prev[participant.identity]?.since ?? msg.at;
              next[participant.identity] = { raised: true, since };
            } else {
              delete next[participant.identity];
            }
            return next;
          });
        } else if (msg.type === "lower-all") {
          // Todo mundo limpa o próprio estado local
          setHands({});
          setMyHandRaised(false);
        }
      } catch {
        // ignora payloads malformados
      }
    }

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  // Quando alguém entra, reanuncia meu estado atual (se levantada)
  React.useEffect(() => {
    function onParticipantConnected() {
      if (myHandRaised) {
        void broadcast(true);
      }
    }
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, myHandRaised]);

  // Quando alguém sai, limpa estado local (se estava levantada)
  React.useEffect(() => {
    const activeIds = new Set(remoteParticipants.map((p) => p.identity));
    setHands((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (id === localParticipant.identity) continue;
        if (!activeIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [remoteParticipants, localParticipant.identity]);

  const publishHandMessage = React.useCallback(
    async (msg: HandRaiseMessage) => {
      const bytes = new TextEncoder().encode(JSON.stringify(msg));
      try {
        await localParticipant.publishData(bytes, {
          reliable: true,
          topic: HAND_EVENT_TOPIC,
        });
      } catch (err) {
        console.warn("[hand-raise] publishData falhou:", err);
      }
    },
    [localParticipant]
  );

  const broadcast = React.useCallback(
    (raised: boolean) =>
      publishHandMessage({ type: "hand", raised, at: Date.now() }),
    [publishHandMessage]
  );

  const lowerAllHands = React.useCallback(() => {
    // Efeito local imediato + broadcast pra todo mundo espelhar
    setHands({});
    setMyHandRaised(false);
    void publishHandMessage({ type: "lower-all", at: Date.now() });
  }, [publishHandMessage]);

  const toggleMyHand = React.useCallback(() => {
    setMyHandRaised((prev) => {
      const next = !prev;
      // Atualiza estado local imediato (evita esperar echo do próprio broadcast)
      setHands((current) => {
        const map = { ...current };
        if (next) {
          map[localParticipant.identity] = {
            raised: true,
            since: Date.now(),
          };
        } else {
          delete map[localParticipant.identity];
        }
        return map;
      });
      void broadcast(next);
      return next;
    });
  }, [localParticipant.identity, broadcast]);

  const raisedIdentitiesOrdered = React.useMemo(() => {
    return Object.entries(hands)
      .filter(([, s]) => s.raised)
      .sort(([, a], [, b]) => a.since - b.since)
      .map(([id]) => id);
  }, [hands]);

  const value = React.useMemo<HandRaiseContextValue>(
    () => ({
      hands,
      myHandRaised,
      toggleMyHand,
      lowerAllHands,
      raisedIdentitiesOrdered,
    }),
    [hands, myHandRaised, toggleMyHand, lowerAllHands, raisedIdentitiesOrdered]
  );

  return (
    <HandRaiseContext.Provider value={value}>
      {children}
    </HandRaiseContext.Provider>
  );
}

export function useHandRaise(): HandRaiseContextValue {
  const ctx = React.useContext(HandRaiseContext);
  if (!ctx) {
    return {
      hands: {},
      myHandRaised: false,
      toggleMyHand: () => {},
      lowerAllHands: () => {},
      raisedIdentitiesOrdered: [],
    };
  }
  return ctx;
}

/**
 * Botão pra usar no CallControls.
 */
export function HandRaiseButton() {
  const { myHandRaised, toggleMyHand, raisedIdentitiesOrdered } = useHandRaise();
  const totalRaised = raisedIdentitiesOrdered.length;

  return (
    <button
      type="button"
      onClick={toggleMyHand}
      aria-label={myHandRaised ? "Abaixar mão" : "Levantar mão"}
      aria-pressed={myHandRaised}
      title={myHandRaised ? "Abaixar mão" : "Levantar mão"}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        myHandRaised
          ? "bg-warning/20 text-warning hover:bg-warning/30"
          : "bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-brand"
      )}
    >
      <Hand className="h-4 w-4" />
      {totalRaised > 0 && (
        <span
          aria-label={`${totalRaised} mão${totalRaised === 1 ? "" : "s"} levantada${totalRaised === 1 ? "" : "s"}`}
          className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-medium text-background"
        >
          {totalRaised > 9 ? "9+" : totalRaised}
        </span>
      )}
    </button>
  );
}

/**
 * Botão que só aparece pro host quando existe alguém com a mão levantada.
 * Manda broadcast pra todos zerarem estado local.
 */
export function LowerAllHandsButton() {
  const { isHost } = useMeeting();
  const { lowerAllHands, raisedIdentitiesOrdered } = useHandRaise();
  const count = raisedIdentitiesOrdered.length;
  if (!isHost || count === 0) return null;
  return (
    <button
      type="button"
      onClick={lowerAllHands}
      title="Abaixar todas as mãos"
      aria-label="Abaixar todas as mãos"
      className={cn(
        "hidden items-center gap-1.5 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1",
        "text-[11px] font-medium text-warning transition-colors hover:bg-warning/20",
        "sm:inline-flex"
      )}
    >
      <Hand className="h-3.5 w-3.5" />
      Abaixar {count > 1 ? "mãos" : "mão"}
    </button>
  );
}

/**
 * Indicador visual pra mostrar no canto do tile de quem levantou a mão.
 */
export function HandRaisedBadge({ identity }: { identity: string }) {
  const { hands } = useHandRaise();
  const state = hands[identity];
  if (!state?.raised) return null;

  return (
    <span
      aria-label="Mão levantada"
      title="Mão levantada"
      className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-warning text-background shadow-lg"
    >
      <Hand className="h-4 w-4" />
    </span>
  );
}
