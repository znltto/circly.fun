"use client";

import * as React from "react";

interface MeetingContextValue {
  roomSlug: string;
  isHost: boolean;
  localIdentity: string;
}

const MeetingContext = React.createContext<MeetingContextValue | null>(null);

export function MeetingProvider({
  value,
  children,
}: {
  value: MeetingContextValue;
  children: React.ReactNode;
}) {
  return (
    <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
  );
}

export function useMeeting(): MeetingContextValue {
  const ctx = React.useContext(MeetingContext);
  if (!ctx) {
    throw new Error("useMeeting deve ser usado dentro de <MeetingProvider>.");
  }
  return ctx;
}
