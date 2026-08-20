"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RecordingConsentDialogProps {
  roomTitle: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Modal de consentimento de gravação. Exibido antes do join se a sala tem
 * `recording_consent_required=true`.
 *
 * Fica em cima do preview do device (não interfere com o mic/câmera dele).
 */
export function RecordingConsentDialog({
  roomTitle,
  onAccept,
  onDecline,
}: RecordingConsentDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
            <Video className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2
              id="consent-title"
              className="font-serif text-lg text-text-primary"
            >
              Esta sala pode ser gravada
            </h2>
            <p className="text-xs text-text-muted">{roomTitle}</p>
          </div>
        </div>

        <p className="mb-2 text-sm text-text-secondary text-pretty">
          O host pode iniciar a gravação a qualquer momento. Continuando, você
          aceita ser gravado se isso acontecer.
        </p>
        <p className="mb-6 text-sm text-text-muted text-pretty">
          A gravação fica com o host por 30 dias e é apagada automaticamente.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onDecline}>
            Não aceito
          </Button>
          <Button onClick={onAccept}>Aceitar e entrar</Button>
        </div>
      </div>
    </div>
  );
}
