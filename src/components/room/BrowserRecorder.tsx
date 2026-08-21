"use client";

import * as React from "react";
import { Circle, Square, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeeting } from "./meeting-context";

/**
 * Gravação leve no navegador do admin (dual-stream):
 *  - Video full (tela + áudio) — MediaRecorder principal, storage_path
 *  - Audio-only (Opus mono ~32 kbps) — MediaRecorder secundário, audio_path
 *    (cabe nos 25 MB do Whisper mesmo em reuniões de 1h+)
 *
 * Após o upload dispara /api/rooms/[slug]/recording/[id]/process (fire-and-forget)
 * — a transcrição + análise IA acontecem em background e aparecem em
 * /salas/[slug]/gravacoes/[id].
 *
 * Só admin vê o botão.
 */
export function BrowserRecorder() {
  const { roomSlug, isAdmin, emitToast } = useMeeting();

  const [state, setState] = React.useState<
    "idle" | "recording" | "uploading" | "processing" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  const videoRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioRecorderRef = React.useRef<MediaRecorder | null>(null);
  const videoChunksRef = React.useRef<Blob[]>([]);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const videoStreamRef = React.useRef<MediaStream | null>(null);
  const audioOnlyStreamRef = React.useRef<MediaStream | null>(null);
  const startedAtRef = React.useRef<string | null>(null);
  const startTsRef = React.useRef<number>(0);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  if (!isAdmin) return null;

  function cleanup() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioOnlyStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current = null;
    audioOnlyStreamRef.current = null;
    videoRecorderRef.current = null;
    audioRecorderRef.current = null;
    videoChunksRef.current = [];
    audioChunksRef.current = [];
    startedAtRef.current = null;
  }

  function pickMime(candidates: string[]): string | undefined {
    return candidates.find((c) => MediaRecorder.isTypeSupported(c));
  }

  async function start() {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 24 },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      displayStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (videoRecorderRef.current?.state === "recording") {
          stop();
        }
      });

      videoStreamRef.current = displayStream;

      const videoMime = pickMime([
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ]);

      const videoRecorder = new MediaRecorder(displayStream, {
        mimeType: videoMime,
        videoBitsPerSecond: 700_000,
        audioBitsPerSecond: 96_000,
      });

      videoChunksRef.current = [];
      videoRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      // Stream secundário audio-only, comprimido, pra transcrição
      const audioTracks = displayStream.getAudioTracks();
      let audioRecorder: MediaRecorder | null = null;
      if (audioTracks.length > 0) {
        const audioOnlyStream = new MediaStream(audioTracks);
        audioOnlyStreamRef.current = audioOnlyStream;

        const audioMime = pickMime([
          "audio/webm;codecs=opus",
          "audio/webm",
        ]);

        audioRecorder = new MediaRecorder(audioOnlyStream, {
          mimeType: audioMime,
          audioBitsPerSecond: 32_000, // baixo proposital pra caber em 25MB
        });

        audioChunksRef.current = [];
        audioRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
      }

      // Upload roda quando AMBOS terminarem
      let videoStopped = false;
      let audioStopped = audioRecorder ? false : true;

      const tryUpload = async () => {
        if (!videoStopped || !audioStopped) return;
        const videoBlob = new Blob(videoChunksRef.current, {
          type: videoMime ?? "video/webm",
        });
        const audioBlob = audioRecorder
          ? new Blob(audioChunksRef.current, {
              type: audioRecorder.mimeType || "audio/webm",
            })
          : null;
        await upload(videoBlob, audioBlob);
        cleanup();
      };

      videoRecorder.onstop = () => {
        videoStopped = true;
        if (audioRecorder && audioRecorder.state === "recording") {
          audioRecorder.stop();
        }
        void tryUpload();
      };
      if (audioRecorder) {
        audioRecorder.onstop = () => {
          audioStopped = true;
          void tryUpload();
        };
      }

      videoRecorderRef.current = videoRecorder;
      audioRecorderRef.current = audioRecorder;
      startedAtRef.current = new Date().toISOString();
      startTsRef.current = Date.now();

      videoRecorder.start(2000);
      audioRecorder?.start(4000);

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
    if (videoRecorderRef.current?.state === "recording") {
      videoRecorderRef.current.stop();
      setState("uploading");
    }
  }

  async function upload(videoBlob: Blob, audioBlob: Blob | null) {
    if (!startedAtRef.current) return;
    const durationSeconds = Math.floor(
      (Date.now() - startTsRef.current) / 1000
    );

    try {
      const fd = new FormData();
      fd.append("file", videoBlob, "recording.webm");
      if (audioBlob && audioBlob.size > 0) {
        fd.append("audio", audioBlob, "audio.webm");
      }
      fd.append("startedAt", startedAtRef.current);
      fd.append("durationSeconds", String(durationSeconds));

      const res = await fetch(`/api/rooms/${roomSlug}/recording/upload`, {
        method: "POST",
        body: fd,
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        audioPath?: string | null;
        error?: string;
      };

      if (!res.ok || !body.ok) {
        const msg = body.error ?? "Upload falhou.";
        setError(msg);
        setState("error");
        // 501 = bucket 'recordings' não existe no Supabase Storage — mensagem
        // é acionável (o admin precisa criar o bucket). Toast persistente
        // pra garantir que ele veja mesmo em mobile (title HTML não ajuda lá).
        emitToast?.({
          tone: "danger",
          duration: res.status === 501 ? 12000 : 6000,
          message:
            res.status === 501
              ? `${msg} Vá em Supabase → Storage → New bucket (privado).`
              : msg,
        });
        return;
      }

      if (body.id && body.audioPath) {
        setState("processing");
        // Fire-and-forget: transcrição+análise podem levar minutos.
        // A página de gravações mostra o status atualizado quando o admin abrir.
        void fetch(
          `/api/rooms/${roomSlug}/recording/${body.id}/process`,
          { method: "POST" }
        ).catch((err) => {
          console.warn("[recording] trigger process falhou:", err);
        });

        setTimeout(() => setState("idle"), 2500);
      } else {
        setState("idle");
      }
    } catch {
      setError("Erro de rede no upload.");
      setState("error");
      emitToast?.({
        tone: "danger",
        duration: 6000,
        message: "Erro de rede no upload da gravação.",
      });
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

      {state === "processing" && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-brand">
          <Sparkles className="h-3 w-3" />
          Transcrevendo...
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
        disabled={state === "uploading" || state === "processing"}
        aria-label={state === "recording" ? "Parar gravação" : "Iniciar gravação"}
        title={
          state === "recording"
            ? "Parar gravação"
            : "Iniciar gravação (só admins) — transcreve automaticamente"
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
