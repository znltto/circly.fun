"use client";

import * as React from "react";
import { Download } from "lucide-react";

interface DownloadRecordingButtonProps {
  slug: string;
  recordingId: string;
}

/**
 * Requisita uma URL assinada e abre em nova aba (o browser dispara o download
 * ou toca inline dependendo do content-type retornado pelo Storage).
 */
export function DownloadRecordingButton({
  slug,
  recordingId,
}: DownloadRecordingButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rooms/${slug}/recording/${recordingId}/download`
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Falha ao gerar link.");
        return;
      }
      const data = (await res.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {loading ? "Preparando..." : "Baixar"}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-danger/40 bg-background px-2 py-1 text-xs text-danger shadow-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
