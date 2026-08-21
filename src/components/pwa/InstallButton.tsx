"use client";

import * as React from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useInstallState } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";

interface InstallButtonProps {
  className?: string;
  /** Se true, também aparece como link estático em iOS (abre instruções). */
  showIOSHelp?: boolean;
}

/**
 * Botão de instalar PWA para o header.
 * - Some se o app já roda em standalone
 * - Chrome/Edge (Android/desktop): dispara o prompt nativo `beforeinstallprompt`
 * - iOS: abre um modal com o passo-a-passo do "Adicionar à Tela de Início"
 */
export function InstallButton({
  className,
  showIOSHelp = true,
}: InstallButtonProps) {
  const { t } = useI18n();
  const { canPrompt, isStandalone, isIOS, install } = useInstallState();
  const [iosOpen, setIosOpen] = React.useState(false);

  if (isStandalone) return null;
  // Sem prompt nativo e sem iOS → navegador ainda não considera instalável.
  if (!canPrompt && !(isIOS && showIOSHelp)) return null;

  async function handleClick() {
    if (isIOS && showIOSHelp && !canPrompt) {
      setIosOpen(true);
      return;
    }
    await install();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={t("install.ariaLabel")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full",
          "border border-brand/45 bg-brand/10 px-2.5 py-1",
          "text-xs font-medium text-brand transition-colors",
          "hover:bg-brand/20 hover:text-brand",
          "focus:outline-none focus:ring-2 focus:ring-brand/40",
          className
        )}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        <span>{t("install.ctaShort")}</span>
      </button>

      {iosOpen && (
        <IOSHelpModal onClose={() => setIosOpen(false)} />
      )}
    </>
  );
}

function IOSHelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-20 backdrop-blur-sm sm:items-center sm:pb-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-5 shadow-2xl shadow-black/60">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-brand">
              PWA
            </p>
            <h2
              id="ios-install-title"
              className="font-serif text-lg text-text-primary"
            >
              {t("install.iosTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("install.iosClose")}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ol className="space-y-3 text-sm text-text-secondary">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[11px] text-text-primary">
              1
            </span>
            <span className="flex flex-1 items-center gap-2">
              {t("install.iosStep1")}
              <Share className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[11px] text-text-primary">
              2
            </span>
            <span className="flex flex-1 items-center gap-2">
              {t("install.iosStep2")}
              <Plus className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[11px] text-text-primary">
              3
            </span>
            <span className="flex-1">{t("install.iosStep3")}</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        >
          {t("install.iosClose")}
        </button>
      </div>
    </div>
  );
}
