import "server-only";
import { AccessToken, type VideoGrant } from "livekit-server-sdk";

interface TokenParams {
  roomName: string;
  identity: string;
  name: string;
  role: "host" | "user" | "guest";
  /** Serializado em `metadata` do participante — visível para os outros. */
  avatarUrl?: string | null;
  username?: string | null;
  ttlSeconds?: number;
}

export interface ParticipantMetadata {
  avatarUrl?: string | null;
  username?: string | null;
}

/**
 * Emite um JWT LiveKit com escopo mínimo por papel.
 * NUNCA chamado a partir do client — só server-side.
 */
export async function createLivekitToken({
  roomName,
  identity,
  name,
  role,
  avatarUrl,
  username,
  ttlSeconds,
}: TokenParams): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET não configurados.");
  }

  const ttl = ttlSeconds ?? (role === "guest" ? 60 * 30 : 60 * 60);

  const metadata: ParticipantMetadata = {
    avatarUrl: avatarUrl ?? null,
    username: username ?? null,
  };

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl,
    metadata: JSON.stringify(metadata),
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Só o host recebe permissão administrativa dentro da sala LiveKit
    roomAdmin: role === "host",
  };

  at.addGrant(grant);
  return at.toJwt();
}
