"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useInstallState } from "@/lib/pwa/install";

const DISMISS_KEY = "circly:install-dismissed";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const { t } = useI18n();
  const { canPrompt, isStandalone, install } = useInstallState();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const until = Number.parseInt(raw, 10);
        if (Number.isFinite(until) && Date.now() < until) return;
      }
      setDismissed(false);
    } catch {
      setDismissed(false);
    }
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
    setDismissed(true);
  }, []);

  const trigger = useCallback(async () => {
    const outcome = await install();
    if (outcome === "accepted") setDismissed(true);
  }, [install]);

  if (dismissed || isStandalone || !canPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label={t("install.ariaLabel")}
      className="fixed z-20 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-lg
        left-4 md:left-auto right-4 md:right-6
        bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] md:bottom-24"
    >
      <button
        type="button"
        onClick={trigger}
        className="flex items-center gap-2 text-text-primary"
      >
        <Download className="h-4 w-4 text-brand" aria-hidden="true" />
        <span>{t("install.ctaLong")}</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("install.dismiss")}
        className="text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
