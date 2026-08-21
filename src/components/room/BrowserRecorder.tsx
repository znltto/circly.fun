"use client";

import * as React from "react";
import { Circle, Square, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeeting } from "./meeting-context";

/**
 * Gravação leve no navegador do admin. Usa getDisplayMedia + MediaRecorder,
 * captura o que o admin vê (grid + audio mix). Sem infraestrutura server-side.
 * Ao parar, faz upload do blob pro Supabase Storage via /api/rooms/[slug]/recording/upload.
 *
 * - Só admin vê o botão (via useMeeting().isAdmin).
 * - Grava em WebM (VP9/Opus se suportado).
 * - Bitrate baixo pra manter arquivo enxuto (~5 MB/min).
 */
export function BrowserRecorder() {
  const { roomSlug, isAdmin } = useMeeting();

  const [state, setState] = React.useState<
    "idle" | "recording" | "uploading" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const startedAtRef = React.useRef<string | null>(null);
  const startTsRef = React.useRef<number>(0);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  if (!isAdmin) return null;

  function cleanup() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      // Pede pro admin escolher a aba/tela e permite capturar áudio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 24,
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      // Se o usuário parar via UI nativa do browser, encerra
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          stop();
        }
      });

      streamRef.current = stream;

      // Escolhe o melhor mimeType disponível
      const preferred = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = preferred.find((t) =>
        MediaRecorder.isTypeSupported(t)
      );

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 700_000, // ~700 kbps
        audioBitsPerSecond: 96_000,
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType ?? "video/webm",
        });
        await upload(blob);
        cleanup();
      };

      recorderRef.current = recorder;
      startedAtRef.current = new Date().toISOString();
      startTsRef.current = Date.now();

      recorder.start(2000); // chunks a cada 2s pra segurança
      setState("recording");
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
      }, 1000);
    } catch (err) {
      const name = (err as Error).name;
      if (name === "NotAllowedError") {
        setError("Permissão negada.");
      } else {
        setError("Não foi possível iniciar a gravação.");
      }
      setState("error");
      cleanup();
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setState("uploading");
    }
  }

  async function upload(blob: Blob) {
    if (!startedAtRef.current) return;
    const durationSeconds = Math.floor(
      (Date.now() - startTsRef.current) / 1000
    );

    try {
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      fd.append("startedAt", startedAtRef.current);
      fd.append("durationSeconds", String(durationSeconds));

      const res = await fetch(`/api/rooms/${roomSlug}/recording/upload`, {
        method: "POST",
        body: fd,
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !body.ok) {
        setError(body.error ?? "Upload falhou.");
        setState("error");
        return;
      }
      setState("idle");
    } catch {
      setError("Erro de rede no upload.");
      setState("error");
    }
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      {state === "recording" && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-danger">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-danger/60" />
            <span className="relative h-2 w-2 rounded-full bg-danger" />
          </span>
          REC · {formatElapsed(elapsed)}
        </span>
      )}

      {state === "uploading" && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando...
        </span>
      )}

      {state === "error" && error && (
        <span
          title={error}
          className="flex items-center gap-1 font-mono text-[10px] text-danger"
        >
          <AlertTriangle className="h-3 w-3" />
          Erro
        </span>
      )}

      <button
        onClick={state === "recording" ? stop : start}
        disabled={state === "uploading"}
        aria-label={state === "recording" ? "Parar gravação" : "Iniciar gravação"}
        title={
          state === "recording"
            ? "Parar gravação"
            : "Iniciar gravação (só admins)"
        }
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          state === "recording"
            ? "border-danger/60 bg-danger/10 text-danger hover:bg-danger/20"
            : "border-border bg-surface text-text-secondary hover:border-brand/40 hover:text-brand"
        )}
      >
        {state === "recording" ? (
          <>
            <Square className="h-3 w-3 fill-current" />
            Parar
          </>
        ) : (
          <>
            <Circle className="h-3 w-3 fill-current text-danger" />
            Gravar
          </>
        )}
      </button>
    </div>
  );
}
