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

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    // Safari iOS expõe navigator.standalone
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const displayModeStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  return iosStandalone || displayModeStandalone;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac; detecta touch pra distinguir
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
  /** Prompt nativo disponível (Chrome/Edge Android/Desktop). */
  canPrompt: boolean;
  /** App já rodando em modo standalone / PWA instalado. */
  isStandalone: boolean;
  /** Sistema é iOS — precisa de instruções manuais (Safari → Compartilhar). */
  isIOS: boolean;
  /** Marcou como já instalado durante esta sessão. */
  installed: boolean;
}

export function useInstallState(): InstallState & {
  install: () => Promise<"accepted" | "dismissed" | "unsupported">;
} {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const [snapshot, setSnapshot] = React.useState<InstallState>(() => ({
    canPrompt: false,
    isStandalone: false,
    isIOS: false,
    installed: false,
  }));

  React.useEffect(() => {
    ensureInit();
    const fn = () => force();
    listeners.add(fn);
    setSnapshot({
      canPrompt: !!deferred,
      isStandalone: isStandaloneDisplay(),
      isIOS: detectIOS(),
      installed,
    });
    return () => {
      listeners.delete(fn);
    };
  }, []);

  // Recomputa quando listeners disparam
  React.useEffect(() => {
    setSnapshot({
      canPrompt: !!deferred,
      isStandalone: isStandaloneDisplay(),
      isIOS: detectIOS(),
      installed,
    });
  });

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

  return { ...snapshot, install };
}
