"use client";

import * as React from "react";

export type Toast = {
  id: string;
  tone: "info" | "success" | "danger" | "warning";
  message: string;
  /** Duração em ms. Padrão 4000. Use 0 pra persistente (fechar manual). */
  duration?: number;
};

interface MeetingContextValue {
  roomSlug: string;
  isHost: boolean;
  setIsHost: (v: boolean) => void;
  isAdmin: boolean;
  localIdentity: string;
  /**
   * Estado da câmera local — controlado aqui pra que <VideoPublisher> e
   * <CallControls> compartilhem a mesma verdade. O useTrackToggle do LiveKit
   * não enxerga o track que publicamos manualmente (com filtros), então
   * mantemos o toggle fora dele.
   */
  cameraOn: boolean;
  setCameraOn: (v: boolean) => void;
  toasts: Toast[];
  emitToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const MeetingContext = React.createContext<MeetingContextValue | null>(null);

interface MeetingProviderProps {
  value: Omit<
    MeetingContextValue,
    | "toasts"
    | "emitToast"
    | "dismissToast"
    | "setIsHost"
    | "cameraOn"
    | "setCameraOn"
  > & { initialCameraOn: boolean };
  children: React.ReactNode;
}

export function MeetingProvider({ value, children }: MeetingProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [isHost, setIsHost] = React.useState(value.isHost);
  const [cameraOn, setCameraOn] = React.useState(value.initialCameraOn);

  // Se o pai reenviar props com novo valor de isHost (ex.: reconnect), respeita.
  React.useEffect(() => {
    setIsHost(value.isHost);
  }, [value.isHost]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const emitToast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, duration: 4000, ...t };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => dismissToast(id), toast.duration);
      }
    },
    [dismissToast]
  );

  const merged = React.useMemo<MeetingContextValue>(
    () => ({
      roomSlug: value.roomSlug,
      isAdmin: value.isAdmin,
      localIdentity: value.localIdentity,
      isHost,
      setIsHost,
      cameraOn,
      setCameraOn,
      toasts,
      emitToast,
      dismissToast,
    }),
    [value, isHost, cameraOn, toasts, emitToast, dismissToast]
  );

  return (
    <MeetingContext.Provider value={merged}>{children}</MeetingContext.Provider>
  );
}

export function useMeeting(): MeetingContextValue {
  const ctx = React.useContext(MeetingContext);
  if (!ctx) {
    throw new Error("useMeeting deve ser usado dentro de <MeetingProvider>.");
  }
  return ctx;
}
