"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { DevicePreview, type DeviceSettings } from "./DevicePreview";
import { MeetingRoom } from "./MeetingRoom";
import { RecordingConsentDialog } from "./RecordingConsentDialog";
import { LobbyWaitingScreen } from "./LobbyWaitingScreen";

interface RoomControllerProps {
  slug: string;
  inviteToken?: string;
  isAuthenticated: boolean;
  initialDisplayName: string;
  roomTitle: string;
  participantCount: number;
  /** Se true, exige modal de consentimento de gravação antes de conectar. */
  requiresRecordingConsent?: boolean;
  isAdmin?: boolean;
  /** ISO da hora agendada. Não-hosts que chegam muito antes veem countdown. */
  scheduledFor?: string | null;
  /** Se o viewer atual é o host da sala (server-resolved). Host pode entrar sempre. */
  isHostViewer?: boolean;
}

interface TokenResponse {
  token: string;
  url: string;
  role: "host" | "user" | "guest";
  identity: string;
  roomTitle: string;
}

type Phase =
  | { kind: "preview" }
  | { kind: "consent"; settings: DeviceSettings }
  | { kind: "connecting" }
  | {
      kind: "waiting";
      lobbyId: string;
      settings: DeviceSettings;
    }
  | { kind: "live"; data: TokenResponse; settings: DeviceSettings }
  | { kind: "error"; message: string };

const CONSENT_STORAGE_PREFIX = "circly:recording-consent:";
const CONSENT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function readStoredConsent(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(CONSENT_STORAGE_PREFIX + slug);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < CONSENT_TTL_MS;
  } catch {
    return false;
  }
}

function writeStoredConsent(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CONSENT_STORAGE_PREFIX + slug,
      String(Date.now())
    );
  } catch {
    // silencioso
  }
}

const EARLY_ARRIVAL_GRACE_MS = 5 * 60 * 1000; // deixa entrar 5 min antes

export function RoomController({
  slug,
  inviteToken,
  isAuthenticated,
  initialDisplayName,
  roomTitle,
  participantCount,
  requiresRecordingConsent = false,
  isAdmin = false,
  scheduledFor,
  isHostViewer = false,
}: RoomControllerProps) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>({ kind: "preview" });
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [now, setNow] = React.useState(() => Date.now());

  // Chave E2EE vinda do fragmento `#k=` do URL (nunca chega ao server).
  const [e2eeKey, setE2eeKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const k = params.get("k");
    if (k) setE2eeKey(k);
  }, []);

  // Atualiza contador a cada 1s se for pra mostrar countdown
  const scheduledAt = scheduledFor ? new Date(scheduledFor).getTime() : null;
  const isEarly =
    !!scheduledAt &&
    !isHostViewer &&
    now < scheduledAt - EARLY_ARRIVAL_GRACE_MS &&
    phase.kind === "preview";

  React.useEffect(() => {
    if (!scheduledAt || isHostViewer) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [scheduledAt, isHostViewer]);

  async function connect(settings: DeviceSettings, admitToken?: string) {
    setPhase({ kind: "connecting" });

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          inviteToken,
          guestName: isAuthenticated ? undefined : displayName.trim(),
          admitToken,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | (Partial<TokenResponse> & {
            error?: string;
            status?: string;
            code?: string;
            lobbyId?: string;
          })
        | null;

      if (!res.ok) {
        setPhase({
          kind: "error",
          message: body?.error ?? "Não foi possível entrar na sala.",
        });
        return;
      }

      // Waiting room: servidor sinaliza que o pedido está pendente.
      if (body?.status === "pending" && body?.lobbyId) {
        setPhase({ kind: "waiting", lobbyId: body.lobbyId, settings });
        return;
      }

      if (body?.token && body?.url && body?.role && body?.identity && body?.roomTitle) {
        setPhase({
          kind: "live",
          data: {
            token: body.token,
            url: body.url,
            role: body.role,
            identity: body.identity,
            roomTitle: body.roomTitle,
          },
          settings,
        });
        return;
      }

      setPhase({
        kind: "error",
        message: "Resposta inesperada do servidor. Recarrega a página.",
      });
    } catch {
      setPhase({
        kind: "error",
        message: "Falha de rede ao entrar na sala.",
      });
    }
  }

  async function handleJoin(settings: DeviceSettings) {
    // Se sala exige consentimento e ainda não temos, mostra o modal
    if (requiresRecordingConsent && !readStoredConsent(slug)) {
      setPhase({ kind: "consent", settings });
      return;
    }
    await connect(settings);
  }

  function handleAcceptConsent() {
    if (phase.kind !== "consent") return;
    writeStoredConsent(slug);
    void connect(phase.settings);
  }

  function handleDeclineConsent() {
    // Volta pra inicio (se logado) ou landing
    router.push(isAuthenticated ? "/inicio" : "/");
  }

  function handleLeave() {
    router.push("/inicio");
  }

  if (isEarly && scheduledAt) {
    return (
      <SchedulePendingScreen
        roomTitle={roomTitle}
        scheduledAt={scheduledAt}
        now={now}
      />
    );
  }

  if (phase.kind === "connecting") {
    return <ConnectingScreen roomTitle={roomTitle} />;
  }

  if (phase.kind === "waiting") {
    return (
      <LobbyWaitingScreen
        slug={slug}
        lobbyId={phase.lobbyId}
        roomTitle={roomTitle}
        onAdmitted={(admitToken) => {
          void connect(phase.settings, admitToken);
        }}
        onDenied={() => {
          setPhase({
            kind: "error",
            message: "O host não te aprovou. Tenta pelo link de novo.",
          });
        }}
        onCancel={() => setPhase({ kind: "preview" })}
      />
    );
  }

  if (phase.kind === "live") {
    return (
      <MeetingRoom
        token={phase.data.token}
        url={phase.data.url}
        roomSlug={slug}
        roomTitle={phase.data.roomTitle}
        identity={phase.data.identity}
        displayName={displayName || phase.data.identity}
        isHost={phase.data.role === "host"}
        isAdmin={isAdmin}
        onLeave={handleLeave}
        audio={{
          enabled: phase.settings.audioEnabled,
          deviceId: phase.settings.audioDeviceId,
        }}
        video={{
          enabled: phase.settings.videoEnabled,
          deviceId: phase.settings.videoDeviceId,
        }}
        filter={phase.settings.filter}
        backgroundImage={phase.settings.backgroundImage}
        e2eeKey={e2eeKey}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6" />
          <Wordmark className="text-sm" />
        </Link>
        <span className="font-mono text-xs text-text-muted">/s/{slug}</span>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        {phase.kind === "error" && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {phase.message}
          </div>
        )}

        <DevicePreview
          onJoin={handleJoin}
          joining={false}
          roomTitle={roomTitle}
          participantCount={participantCount}
          displayName={displayName}
          onDisplayNameChange={isAuthenticated ? undefined : setDisplayName}
        />
      </section>

      {phase.kind === "consent" && (
        <RecordingConsentDialog
          roomTitle={roomTitle}
          onAccept={handleAcceptConsent}
          onDecline={handleDeclineConsent}
        />
      )}
    </main>
  );
}

function SchedulePendingScreen({
  roomTitle,
  scheduledAt,
  now,
}: {
  roomTitle: string;
  scheduledAt: number;
  now: number;
}) {
  const diff = Math.max(0, scheduledAt - now);
  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const startsLabel = new Date(scheduledAt).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className="absolute h-32 w-32 animate-pulse rounded-full bg-brand/5"
        />
        <CcoMascot variant="waiting" className="relative h-24 w-24 text-brand" />
      </div>
      <div className="max-w-md space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-brand">
          Reunião agendada
        </p>
        <h1 className="font-serif text-2xl text-text-primary">{roomTitle}</h1>
        <p className="text-sm text-text-muted">
          Começa em {startsLabel}.
        </p>
      </div>
      <div
        className="grid grid-flow-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-text-primary"
        role="timer"
        aria-label="Contagem regressiva"
      >
        {days > 0 && <TimeBlock value={days} unit="d" />}
        <TimeBlock value={hours} unit="h" />
        <TimeBlock value={mins} unit="min" />
        <TimeBlock value={secs} unit="s" />
      </div>
      <p className="max-w-sm text-xs text-text-muted">
        A sala abre para você 5 minutos antes do horário. Pode deixar esta
        aba aberta — quando chegar a hora ela recarrega sozinha.
      </p>
    </main>
  );
}

function TimeBlock({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        {unit}
      </span>
    </span>
  );
}

function ConnectingScreen({ roomTitle }: { roomTitle: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className="absolute h-32 w-32 animate-ping rounded-full bg-brand/10"
        />
        <span
          aria-hidden
          className="absolute h-24 w-24 animate-pulse rounded-full bg-brand/5"
        />
        <CcoMascot variant="waiting" className="relative h-24 w-24 text-brand" />
      </div>
      <div className="space-y-2">
        <p className="font-serif text-2xl text-text-primary">
          Conectando à sala...
        </p>
        <p className="text-sm text-text-muted">{roomTitle}</p>
      </div>
    </main>
  );
}
