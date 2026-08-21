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

export function RoomController({
  slug,
  inviteToken,
  isAuthenticated,
  initialDisplayName,
  roomTitle,
  participantCount,
  requiresRecordingConsent = false,
  isAdmin = false,
}: RoomControllerProps) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>({ kind: "preview" });
  const [displayName, setDisplayName] = React.useState(initialDisplayName);

  async function connect(settings: DeviceSettings) {
    setPhase({ kind: "connecting" });

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          inviteToken,
          guestName: isAuthenticated ? undefined : displayName.trim(),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPhase({
          kind: "error",
          message: body?.error ?? "Não foi possível entrar na sala.",
        });
        return;
      }

      const data = (await res.json()) as TokenResponse;
      setPhase({ kind: "live", data, settings });
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

  if (phase.kind === "connecting") {
    return <ConnectingScreen roomTitle={roomTitle} />;
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
