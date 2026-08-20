"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

const DISMISS_KEY = "circly:install-dismissed";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Se ainda dentro da janela de "dispensado", não faz nada
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const until = Number.parseInt(raw, 10);
        if (Number.isFinite(until) && Date.now() < until) {
          return;
        }
      }
    } catch {
      /* localStorage indisponível — segue */
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_WINDOW_MS)
      );
    } catch {
      /* noop */
    }
    setVisible(false);
    setDeferredEvent(null);
  }, []);

  const install = useCallback(async () => {
    if (!deferredEvent) return;
    try {
      await deferredEvent.prompt();
      await deferredEvent.userChoice;
    } catch {
      /* usuário fechou / plataforma cancelou */
    } finally {
      setVisible(false);
      setDeferredEvent(null);
    }
  }, [deferredEvent]);

  if (!visible || !deferredEvent) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar Circly"
      className="fixed bottom-24 md:bottom-6 right-4 z-30 bg-surface border border-border rounded-full px-4 py-2 shadow-lg text-sm flex items-center gap-2"
    >
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 text-text-primary"
      >
        <Download className="h-4 w-4 text-brand" aria-hidden="true" />
        <span>Instalar Circly</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
