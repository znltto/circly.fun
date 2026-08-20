"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ConnectionStateToast,
  useConnectionState,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { Button } from "@/components/ui/Button";
import { ParticipantGrid } from "./ParticipantGrid";
import { CallControls } from "./CallControls";
import { RightDrawer } from "./RightDrawer";
import { ParticipantsList } from "./ParticipantsList";
import { InRoomChat } from "./InRoomChat";
import { MeetingProvider } from "./meeting-context";
import { RoomSoundEffects } from "./RoomSoundEffects";
import { RecordingControl } from "./RecordingControl";
import { RecordingIndicator } from "./RecordingIndicator";
import {
  createFilteredStream,
  type FilteredStreamHandle,
  type VideoFilter,
} from "@/lib/video/filters";

interface MeetingRoomProps {
  token: string;
  url: string;
  roomSlug: string;
  roomTitle: string;
  identity: string;
  displayName: string;
  isHost: boolean;
  onLeave: () => void;
  audio: { enabled: boolean; deviceId?: string };
  video: { enabled: boolean; deviceId?: string };
  /** Filtro de vídeo escolhido na pré-entrada. Default 'none'. */
  filter?: VideoFilter;
  /** Imagem de fundo (dataURL) quando filter === 'image'. */
  backgroundImage?: string;
}

/**
 * DECISÃO DE INTEGRAÇÃO COM LIVEKIT (Fase 19):
 *
 * O LiveKitRoom normalmente aceita `video={true}` e publica a câmera raw
 * automaticamente ao conectar. Quando há filtro, precisamos publicar uma
 * MediaStreamTrack processada em canvas — NÃO a câmera raw.
 *
 * Estratégia adotada:
 *   - `audio` continua sendo entregue ao LiveKitRoom normalmente (mic).
 *   - `video` é SEMPRE passado como `false` ao LiveKitRoom. Fazemos o publish
 *     manual do vídeo dentro de <VideoPublisher /> após a conexão estar
 *     estabelecida (via useRoomContext + useConnectionState). Isso vale mesmo
 *     sem filtro, para manter o ciclo de vida consistente e evitar corrida
 *     entre publish automático e o filtrado.
 *   - CallControls continua usando setCameraEnabled/setMicrophoneEnabled do
 *     LiveKit. Quando o usuário desliga a câmera e liga de novo dentro da
 *     call, o LiveKit captura o device raw (sem filtro). Isso é aceitável
 *     nesta fase — o toggle de filtro em-call está marcado como TODO.
 *
 * TODO(fase 20): expor toggle de filtro dentro da call. Envolve compartilhar
 * o estado via MeetingProvider, re-publicar o track ao trocar, e interceptar
 * o botão de câmera do CallControls.
 */

export function MeetingRoom({
  token,
  url,
  roomSlug,
  roomTitle,
  identity,
  displayName,
  isHost,
  onLeave,
  audio,
  video,
  filter = "none",
  backgroundImage,
}: MeetingRoomProps) {
  const router = useRouter();
  const notifiedLeaveRef = React.useRef(false);

  const notifyServerLeave = React.useCallback(async () => {
    if (notifiedLeaveRef.current) return;
    notifiedLeaveRef.current = true;
    try {
      // keepalive garante entrega mesmo se aba está fechando
      await fetch(`/api/rooms/${roomSlug}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
        keepalive: true,
      });
    } catch {
      // best-effort: se falhar, job periódico reconcilia
    }
  }, [roomSlug, identity]);

  // Se o usuário fechar a aba, tenta avisar
  React.useEffect(() => {
    const onBeforeUnload = () => {
      void notifyServerLeave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [notifyServerLeave]);

  const handleDisconnected = React.useCallback(() => {
    void notifyServerLeave();
    onLeave();
    router.push("/inicio");
  }, [notifyServerLeave, onLeave, router]);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={audio.enabled ? (audio.deviceId ? { deviceId: audio.deviceId } : true) : false}
      // Vídeo é publicado manualmente pelo <VideoPublisher /> para permitir
      // aplicar o filtro escolhido antes de enviar. Ver comentário no topo.
      video={false}
      onDisconnected={handleDisconnected}
      onError={(err) => console.error("LiveKit error", err)}
      className="flex h-screen flex-col bg-background"
    >
      <MeetingProvider
        value={{ roomSlug, isHost, localIdentity: identity }}
      >
        <RoomAudioRenderer />
        <ConnectionStateToast />
        <RoomSoundEffects />
        <VideoPublisher
          enabled={video.enabled}
          deviceId={video.deviceId}
          filter={filter}
          backgroundImage={backgroundImage}
        />
        <MeetingChrome
          roomSlug={roomSlug}
          roomTitle={roomTitle}
          identity={identity}
          displayName={displayName}
          onLeave={handleDisconnected}
        />
      </MeetingProvider>
    </LiveKitRoom>
  );
}

/**
 * Publica o track de vídeo (com filtro se houver) assim que a sala conecta.
 * Precisa viver dentro do LiveKitRoom para ter acesso ao useRoomContext.
 * Renderiza um <canvas> hidden usado pelo pipeline de filtro; para 'none',
 * publica a MediaStreamTrack raw diretamente sem passar pelo canvas.
 */
function VideoPublisher({
  enabled,
  deviceId,
  filter,
  backgroundImage,
}: {
  enabled: boolean;
  deviceId?: string;
  filter: VideoFilter;
  backgroundImage?: string;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const rawStreamRef = React.useRef<MediaStream | null>(null);
  const filterHandleRef = React.useRef<FilteredStreamHandle | null>(null);
  const publishedTrackRef = React.useRef<MediaStreamTrack | null>(null);

  React.useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    if (!enabled) return;

    let cancelled = false;

    async function publish() {
      try {
        // 1) Captura câmera raw
        const raw = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        });
        if (cancelled) {
          raw.getTracks().forEach((t) => t.stop());
          return;
        }
        rawStreamRef.current = raw;

        let trackToPublish: MediaStreamTrack | undefined = raw.getVideoTracks()[0];

        // 2) Se tem filtro, cria stream processado
        if (filter !== "none" && canvasRef.current) {
          try {
            let bgImg: HTMLImageElement | undefined;
            if (filter === "image" && backgroundImage) {
              bgImg = await loadImage(backgroundImage);
            }
            const handle = await createFilteredStream(
              raw,
              {
                filter,
                blurAmount: 14,
                backgroundImage: bgImg,
              },
              canvasRef.current
            );
            if (cancelled) {
              handle.stop();
              raw.getTracks().forEach((t) => t.stop());
              return;
            }
            filterHandleRef.current = handle;
            const filtered = handle.stream.getVideoTracks()[0];
            if (filtered) trackToPublish = filtered;
          } catch (err) {
            console.warn(
              "[MeetingRoom] Filtro indisponível, publicando câmera raw",
              err
            );
          }
        }

        if (!trackToPublish) {
          console.warn("[MeetingRoom] nenhum track de vídeo disponível");
          return;
        }

        // 3) Publica via LiveKit
        publishedTrackRef.current = trackToPublish;
        await room.localParticipant.publishTrack(trackToPublish, {
          source: Track.Source.Camera,
        });
      } catch (err) {
        console.error("[MeetingRoom] Falha ao publicar vídeo", err);
      }
    }

    void publish();

    return () => {
      cancelled = true;
      const track = publishedTrackRef.current;
      if (track) {
        room.localParticipant
          .unpublishTrack(track, true)
          .catch(() => {
            /* pode falhar se sala já desconectou */
          });
        publishedTrackRef.current = null;
      }
      filterHandleRef.current?.stop();
      filterHandleRef.current = null;
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, enabled]);

  return <canvas ref={canvasRef} className="hidden" aria-hidden />;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function MeetingChrome({
  roomSlug,
  roomTitle,
  identity,
  displayName,
  onLeave,
}: {
  roomSlug: string;
  roomTitle: string;
  identity: string;
  displayName: string;
  onLeave: () => void;
}) {
  const connectionState = useConnectionState();
  const [drawer, setDrawer] = React.useState<"chat" | "people" | null>(null);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    if (drawer === "chat") setUnread(0);
  }, [drawer]);

  if (connectionState === ConnectionState.Connecting) {
    return <ConnectingState roomTitle={roomTitle} />;
  }

  if (
    connectionState === ConnectionState.Disconnected ||
    connectionState === ConnectionState.SignalReconnecting ||
    connectionState === ConnectionState.Reconnecting
  ) {
    return (
      <ReconnectingState
        connectionState={connectionState}
        onLeave={onLeave}
      />
    );
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-5 w-5 text-brand" />
          <Wordmark className="text-xs" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            Ao vivo
          </span>
          <RecordingIndicator />
          <span className="hidden text-sm text-text-primary md:block">
            {roomTitle}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <RecordingControl />
          <span className="font-mono text-xs text-text-muted">
            /s/{roomSlug}
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 md:p-6">
          <ParticipantGrid />
        </div>

        <RightDrawer
          open={drawer === "people"}
          title="Pessoas"
          onClose={() => setDrawer(null)}
        >
          <div className="h-full overflow-y-auto p-3">
            <ParticipantsList />
          </div>
        </RightDrawer>

        <RightDrawer
          open={drawer === "chat"}
          title="Chat"
          onClose={() => setDrawer(null)}
        >
          <InRoomChat
            roomSlug={roomSlug}
            senderIdentity={identity}
            senderName={displayName}
            onIncoming={() => {
              if (drawer !== "chat") setUnread((n) => n + 1);
            }}
          />
        </RightDrawer>
      </main>

      <CallControls
        onToggleChat={() =>
          setDrawer((d) => (d === "chat" ? null : "chat"))
        }
        onToggleParticipants={() =>
          setDrawer((d) => (d === "people" ? null : "people"))
        }
        chatOpen={drawer === "chat"}
        participantsOpen={drawer === "people"}
        unreadChat={unread}
        onLeave={onLeave}
      />
    </>
  );
}

function ConnectingState({ roomTitle }: { roomTitle: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <CcoMascot variant="waiting" className="h-20 w-20 text-brand" />
      <p className="font-serif text-lg text-text-primary">
        Conectando à sala...
      </p>
      <p className="text-sm text-text-muted">{roomTitle}</p>
    </div>
  );
}

function ReconnectingState({
  connectionState,
  onLeave,
}: {
  connectionState: ConnectionState;
  onLeave: () => void;
}) {
  const isDisconnected = connectionState === ConnectionState.Disconnected;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <CcoMascot
        variant={isDisconnected ? "goodbye" : "connection-error"}
        className="h-20 w-20 text-text-secondary"
      />
      <p className="font-serif text-lg text-text-primary">
        {isDisconnected ? "Você saiu da sala." : "Reconectando..."}
      </p>
      <p className="max-w-sm text-sm text-text-muted text-pretty">
        {isDisconnected
          ? "Se caiu sem querer, recarregue a página para tentar de novo."
          : "Aguarde um instante — sua conexão está sendo restabelecida."}
      </p>
      {isDisconnected && (
        <Button variant="secondary" onClick={onLeave}>
          Voltar ao início
        </Button>
      )}
    </div>
  );
}
