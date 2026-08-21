"use client";

import * as React from "react";
import { X, CheckCircle2, AlertTriangle, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeeting } from "./meeting-context";
import type { Toast } from "./meeting-context";

const ICONS: Record<Toast["tone"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertTriangle,
};

const TONE_STYLES: Record<Toast["tone"], string> = {
  info: "border-border bg-surface-raised text-text-primary",
  success: "border-success/50 bg-success/10 text-text-primary",
  warning: "border-warning/50 bg-warning/10 text-text-primary",
  danger: "border-danger/50 bg-danger/10 text-text-primary",
};

const ICON_STYLES: Record<Toast["tone"], string> = {
  info: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Fila de toasts posicionada no topo da MeetingRoom. Alimentada pelo
 * `useMeeting().emitToast(...)`.
 */
export function MeetingToasts() {
  const { toasts, dismissToast } = useMeeting();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificações da sala"
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+4rem)] z-40 flex w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur",
              TONE_STYLES[t.tone]
            )}
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_STYLES[t.tone])}
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-pretty">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Fechar aviso"
              className="rounded-sm p-0.5 text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
