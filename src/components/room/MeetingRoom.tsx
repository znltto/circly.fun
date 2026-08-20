"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ConnectionStateToast,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { Button } from "@/components/ui/Button";
import { ParticipantGrid } from "./ParticipantGrid";
import { CallControls } from "./CallControls";
import { RightDrawer } from "./RightDrawer";
import { ParticipantsList } from "./ParticipantsList";
import { InRoomChat } from "./InRoomChat";

interface MeetingRoomProps {
  token: string;
  url: string;
  roomSlug: string;
  roomTitle: string;
  identity: string;
  displayName: string;
  onLeave: () => void;
  audio: { enabled: boolean; deviceId?: string };
  video: { enabled: boolean; deviceId?: string };
}

export function MeetingRoom({
  token,
  url,
  roomSlug,
  roomTitle,
  identity,
  displayName,
  onLeave,
  audio,
  video,
}: MeetingRoomProps) {
  const router = useRouter();

  const handleDisconnected = React.useCallback(() => {
    onLeave();
    router.push("/inicio");
  }, [onLeave, router]);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={audio.enabled}
      video={video.enabled}
      onDisconnected={handleDisconnected}
      onError={(err) => console.error("LiveKit error", err)}
      className="flex h-screen flex-col bg-background"
    >
      <RoomAudioRenderer />
      <ConnectionStateToast />
      <MeetingChrome
        roomSlug={roomSlug}
        roomTitle={roomTitle}
        identity={identity}
        displayName={displayName}
        onLeave={handleDisconnected}
      />
    </LiveKitRoom>
  );
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
          <span className="hidden text-sm text-text-primary md:block">
            {roomTitle}
          </span>
        </div>
        <span className="font-mono text-xs text-text-muted">/s/{roomSlug}</span>
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
