"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertTriangle,
  Sparkles,
  Image as ImageIcon,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  createFilteredStream,
  filtersLikelySupported,
  type FilteredStreamHandle,
  type VideoFilter,
} from "@/lib/video/filters";

export interface DeviceSettings {
  audioDeviceId?: string;
  videoDeviceId?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  filter: VideoFilter;
  /** dataURL ou URL pública da imagem escolhida pro fundo */
  backgroundImage?: string;
}

interface DevicePreviewProps {
  onJoin: (settings: DeviceSettings) => void | Promise<void>;
  joinLabel?: string;
  joining?: boolean;
  roomTitle: string;
  participantCount?: number;
  displayName: string;
  onDisplayNameChange?: (n: string) => void;
}

type PermissionState = "unknown" | "granted" | "denied" | "no-device";

export function DevicePreview({
  onJoin,
  joinLabel = "Entrar na sala",
  joining,
  roomTitle,
  participantCount,
  displayName,
  onDisplayNameChange,
}: DevicePreviewProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const filterCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const rawStreamRef = React.useRef<MediaStream | null>(null);
  const filterHandleRef = React.useRef<FilteredStreamHandle | null>(null);
  const backgroundImageRef = React.useRef<HTMLImageElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [permission, setPermission] = React.useState<PermissionState>("unknown");
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const [videoEnabled, setVideoEnabled] = React.useState(true);

  const [audioDevices, setAudioDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [audioDeviceId, setAudioDeviceId] = React.useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = React.useState<string | undefined>();

  const [filter, setFilter] = React.useState<VideoFilter>("none");
  const [backgroundImage, setBackgroundImage] = React.useState<string | null>(
    null
  );
  const [filtersSupported, setFiltersSupported] = React.useState(true);
  const [filterError, setFilterError] = React.useState<string | null>(null);

  // Verifica suporte de filtros na montagem (roda só no client)
  React.useEffect(() => {
    setFiltersSupported(filtersLikelySupported());
  }, []);

  // Solicita permissão inicial e monta preview
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        rawStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPermission("granted");

        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setAudioDeviceId(audioTrack?.getSettings().deviceId ?? undefined);
        setVideoDeviceId(videoTrack?.getSettings().deviceId ?? undefined);
      } catch (err) {
        if (cancelled) return;
        const name = (err as Error).name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setPermission("denied");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setPermission("no-device");
        } else {
          setPermission("denied");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      filterHandleRef.current?.stop();
      filterHandleRef.current = null;
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    };
  }, []);

  // Troca de dispositivo → reinicia o stream
  React.useEffect(() => {
    if (permission !== "granted") return;
    if (!audioDeviceId && !videoDeviceId) return;

    let cancelled = false;

    async function switchDevices() {
      try {
        const constraints: MediaStreamConstraints = {
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        // para o filtro em curso (será recriado pelo effect de filtro)
        filterHandleRef.current?.stop();
        filterHandleRef.current = null;

        rawStreamRef.current?.getTracks().forEach((t) => t.stop());
        rawStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // aplica estados de mute
        stream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
        stream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
      } catch {
        // ignore — mantém o stream anterior
      }
    }

    switchDevices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioDeviceId, videoDeviceId]);

  // Toggles atualizam faixas ao vivo (áudio sempre no stream raw;
  // vídeo pode estar no raw ou no filtrado — mudamos os dois pra
  // simplificar o toggle "desligar câmera")
  React.useEffect(() => {
    rawStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
  }, [audioEnabled]);

  React.useEffect(() => {
    rawStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
  }, [videoEnabled]);

  // Carrega imagem de fundo em <img> quando o usuário troca
  React.useEffect(() => {
    if (!backgroundImage) {
      backgroundImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      backgroundImageRef.current = img;
    };
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Aplica / troca / desliga o filtro
  React.useEffect(() => {
    if (permission !== "granted") return;
    if (!filtersSupported && filter !== "none") {
      setFilter("none");
      return;
    }

    // desliga filtro anterior
    filterHandleRef.current?.stop();
    filterHandleRef.current = null;
    setFilterError(null);

    if (filter === "none") {
      // volta a mostrar o stream raw diretamente
      if (videoRef.current && rawStreamRef.current) {
        videoRef.current.srcObject = rawStreamRef.current;
      }
      return;
    }

    // aguarda a imagem de fundo ficar pronta se for modo "image"
    if (filter === "image" && !backgroundImageRef.current) {
      // Se ainda não carregou, garante que quando carregar re-dispara este effect
      // via dependência backgroundImage. Enquanto isso, exibe raw.
      if (videoRef.current && rawStreamRef.current) {
        videoRef.current.srcObject = rawStreamRef.current;
      }
      return;
    }

    let cancelled = false;

    async function apply() {
      if (!rawStreamRef.current || !filterCanvasRef.current) return;
      try {
        const handle = await createFilteredStream(
          rawStreamRef.current,
          {
            filter,
            blurAmount: 14,
            backgroundImage:
              filter === "image"
                ? backgroundImageRef.current ?? undefined
                : undefined,
          },
          filterCanvasRef.current
        );
        if (cancelled) {
          handle.stop();
          return;
        }
        filterHandleRef.current = handle;
        if (videoRef.current) videoRef.current.srcObject = handle.stream;
      } catch (err) {
        console.warn("[DevicePreview] filtro indisponível, seguindo sem", err);
        if (cancelled) return;
        setFilterError(
          "Filtro não disponível neste dispositivo, seguindo sem."
        );
        setFilter("none");
      }
    }

    apply();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, backgroundImage, permission, filtersSupported]);

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (typeof url === "string") {
        setBackgroundImage(url);
        setFilter("image");
      }
    };
    reader.readAsDataURL(file);
    // permite escolher o mesmo arquivo novamente
    e.target.value = "";
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] md:items-center">
      {/* Preview */}
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface">
        {permission === "granted" ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "h-full w-full object-cover -scale-x-100",
                !videoEnabled && "opacity-0"
              )}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-text-secondary">
                Câmera desligada
              </div>
            )}
          </>
        ) : permission === "denied" ? (
          <PermissionMessage
            title="Sem acesso à câmera ou microfone"
            body="Libere as permissões nas configurações do navegador (ícone de cadeado ao lado da URL) e recarregue esta página."
          />
        ) : permission === "no-device" ? (
          <PermissionMessage
            title="Nenhum dispositivo encontrado"
            body="Verifique se sua câmera e microfone estão conectados e reconhecidos pelo sistema."
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            Pedindo permissão...
          </div>
        )}
        {/* Canvas oculto onde o filtro é composto */}
        <canvas ref={filterCanvasRef} className="hidden" aria-hidden />
      </div>

      {/* Controles */}
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-brand uppercase">
            Sala
          </p>
          <p className="mt-1 font-serif text-2xl text-text-primary">
            {roomTitle}
          </p>
          {typeof participantCount === "number" && (
            <p className="mt-1 text-xs text-text-muted">
              {participantCount === 0
                ? "Ninguém aqui ainda"
                : participantCount === 1
                ? "1 pessoa na sala"
                : `${participantCount} pessoas na sala`}
            </p>
          )}
        </div>

        {onDisplayNameChange && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-primary">
              Como você aparece
            </span>
            <input
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              maxLength={40}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-focus focus:outline-none"
            />
          </label>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setAudioEnabled((v) => !v)}
            aria-label={audioEnabled ? "Silenciar microfone" : "Ativar microfone"}
            aria-pressed={!audioEnabled}
            disabled={permission !== "granted"}
          >
            {audioEnabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4 text-danger" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setVideoEnabled((v) => !v)}
            aria-label={videoEnabled ? "Desligar câmera" : "Ligar câmera"}
            aria-pressed={!videoEnabled}
            disabled={permission !== "granted"}
          >
            {videoEnabled ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4 text-danger" />
            )}
          </Button>
        </div>

        {permission === "granted" && (
          <div className="space-y-3">
            <Select
              label="Microfone"
              value={audioDeviceId}
              onChange={setAudioDeviceId}
              options={devicesToOptions(audioDevices, "Microfone")}
              placeholder="Padrão do sistema"
              emptyLabel="Nenhum microfone"
            />
            <Select
              label="Câmera"
              value={videoDeviceId}
              onChange={setVideoDeviceId}
              options={devicesToOptions(videoDevices, "Câmera")}
              placeholder="Padrão do sistema"
              emptyLabel="Nenhuma câmera"
            />
          </div>
        )}

        {/* Fundo */}
        {permission === "granted" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Fundo</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={filter === "none"}
                onClick={() => setFilter("none")}
                icon={<Ban className="h-3.5 w-3.5" />}
                label="Nenhum"
                disabled={false}
              />
              <FilterPill
                active={filter === "blur"}
                onClick={() => setFilter("blur")}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Desfocar"
                disabled={!filtersSupported}
              />
              <FilterPill
                active={filter === "image"}
                onClick={() => fileInputRef.current?.click()}
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Imagem"
                disabled={!filtersSupported}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePickImage}
                className="hidden"
                aria-hidden
              />
            </div>
            {!filtersSupported && (
              <p className="text-xs text-text-muted">
                Filtros indisponíveis neste dispositivo
              </p>
            )}
            {filterError && (
              <p className="text-xs text-warning">{filterError}</p>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          loading={joining}
          disabled={permission !== "granted" && !audioEnabled && !videoEnabled}
          onClick={() =>
            onJoin({
              audioDeviceId,
              videoDeviceId,
              audioEnabled,
              videoEnabled,
              filter,
              backgroundImage: backgroundImage ?? undefined,
            })
          }
        >
          {joinLabel}
        </Button>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PermissionMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <p className="font-serif text-lg text-text-primary">{title}</p>
      <p className="max-w-xs text-sm text-text-secondary text-pretty">{body}</p>
    </div>
  );
}

function devicesToOptions(
  devices: MediaDeviceInfo[],
  fallbackPrefix: string
): { value: string; label: string }[] {
  return devices
    .filter((d) => d.deviceId)
    .map((d) => ({
      value: d.deviceId,
      label: d.label || `${fallbackPrefix} ${d.deviceId.slice(0, 6)}`,
    }));
}
