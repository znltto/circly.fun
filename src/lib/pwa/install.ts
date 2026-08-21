"use client";

import * as React from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

/**
 * Store singleton do evento `beforeinstallprompt`.
 *
 * O navegador só dispara esse evento uma vez por página, então centralizamos
 * a referência aqui para que múltiplos componentes (ex.: botão no header +
 * toast flutuante) possam usar o mesmo prompt sem competir.
 */

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  ensureInit();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
    true;
  const displayModeStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  return iosStandalone || displayModeStandalone;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    ua.includes("Macintosh") &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return isiOS || iPadOS;
}

let initialised = false;
function ensureInit() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export interface InstallState {
  canPrompt: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  installed: boolean;
}

// Snapshot estável — precisa retornar a MESMA referência quando nada mudou,
// senão useSyncExternalStore entra em loop.
let cachedSnapshot: InstallState = {
  canPrompt: false,
  isStandalone: false,
  isIOS: false,
  installed: false,
};

function getSnapshot(): InstallState {
  const next: InstallState = {
    canPrompt: !!deferred,
    isStandalone: isStandaloneDisplay(),
    isIOS: detectIOS(),
    installed,
  };
  const same =
    cachedSnapshot.canPrompt === next.canPrompt &&
    cachedSnapshot.isStandalone === next.isStandalone &&
    cachedSnapshot.isIOS === next.isIOS &&
    cachedSnapshot.installed === next.installed;
  if (!same) cachedSnapshot = next;
  return cachedSnapshot;
}

const SERVER_SNAPSHOT: InstallState = {
  canPrompt: false,
  isStandalone: false,
  isIOS: false,
  installed: false,
};

export function useInstallState(): InstallState & {
  install: () => Promise<"accepted" | "dismissed" | "unsupported">;
} {
  const state = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );

  const install = React.useCallback(async () => {
    if (!deferred) return "unsupported" as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      deferred = null;
      notify();
      return choice.outcome;
    } catch {
      return "dismissed" as const;
    }
  }, []);

  return { ...state, install };
}
