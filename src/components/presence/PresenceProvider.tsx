"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type UserPresence = {
  status: "online" | "in-call" | "busy";
  room_id?: string;
  updated_at: number;
};

type PresenceMap = Record<string, UserPresence>;

interface PresenceContextValue {
  presence: PresenceMap;
  setStatus: (patch: Partial<UserPresence>) => void;
}

const PresenceContext = React.createContext<PresenceContextValue>({
  presence: {},
  setStatus: () => {},
});

/**
 * Conecta em um canal Realtime "presence:global" e mantém o mapa
 * userId → estado atual. Cada cliente publica seu próprio estado
 * ao entrar e pode atualizar via `setStatus`.
 *
 * Uso: `usePresence(userId)` retorna `UserPresence | undefined`.
 * `usePresenceStatus()` retorna helper para atualizar o próprio.
 */
export function PresenceProvider({
  selfId,
  children,
}: {
  selfId: string;
  children: React.ReactNode;
}) {
  const [presence, setPresence] = React.useState<PresenceMap>({});
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const selfStateRef = React.useRef<UserPresence>({
    status: "online",
    updated_at: Date.now(),
  });

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence:global", {
      config: { presence: { key: selfId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresence>();
        const next: PresenceMap = {};
        for (const [userId, entries] of Object.entries(state)) {
          const latest = entries[entries.length - 1];
          if (latest) next[userId] = latest;
        }
        setPresence(next);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(selfStateRef.current);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selfId]);

  const setStatus = React.useCallback(
    (patch: Partial<UserPresence>) => {
      const next: UserPresence = {
        ...selfStateRef.current,
        ...patch,
        updated_at: Date.now(),
      };
      selfStateRef.current = next;
      void channelRef.current?.track(next);
    },
    []
  );

  const value = React.useMemo(
    () => ({ presence, setStatus }),
    [presence, setStatus]
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

/** Estado de presença de um usuário específico (ou undefined se offline). */
export function usePresence(userId: string) {
  const { presence } = React.useContext(PresenceContext);
  return presence[userId];
}

/** Estado de todos os usuários online. */
export function useAllPresence() {
  return React.useContext(PresenceContext).presence;
}

/** Atualizar o próprio status (ex: entrar em uma sala). */
export function useSetPresence() {
  return React.useContext(PresenceContext).setStatus;
}
