import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * Singleton lazy do RoomServiceClient. Nunca chame do client.
 * Server-side only — precisa do LIVEKIT_API_SECRET.
 */
let cachedClient: RoomServiceClient | null = null;

export function getRoomService(): RoomServiceClient {
  if (cachedClient) return cachedClient;

  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "LiveKit não configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)."
    );
  }

  // RoomService usa HTTP, não WSS — converter wss:// -> https://
  const httpUrl = url.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
  cachedClient = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  return cachedClient;
}

/**
 * Conta participantes ativos na sala LiveKit (roomName === slug).
 * Retorna 0 se a sala não existe no LiveKit (o que é o caso normal
 * após todos saírem — LiveKit destrói a sala vazia em ~5min).
 */
export async function countActiveParticipants(slug: string): Promise<number> {
  try {
    const svc = getRoomService();
    const participants = await svc.listParticipants(slug);
    return participants.length;
  } catch {
    return 0;
  }
}

/**
 * Remove participante da sala LiveKit (kick). Idempotente.
 */
export async function kickParticipant(
  slug: string,
  identity: string
): Promise<void> {
  const svc = getRoomService();
  await svc.removeParticipant(slug, identity);
}

/**
 * Silencia (mute) uma track específica de um participante.
 * `source` = "audio" | "video" | "screen_share".
 */
export async function mutePublishedTrack(
  slug: string,
  identity: string,
  source: "audio" | "video" | "screen_share"
): Promise<void> {
  const svc = getRoomService();
  const participants = await svc.listParticipants(slug);
  const target = participants.find((p) => p.identity === identity);
  if (!target) return;

  const trackSid = target.tracks.find((t) => {
    if (source === "audio") return t.source === 1; // AUDIO
    if (source === "video") return t.source === 2; // CAMERA
    return t.source === 3; // SCREEN_SHARE
  })?.sid;

  if (!trackSid) return;
  await svc.mutePublishedTrack(slug, identity, trackSid, true);
}
