import "server-only";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";
import type { EgressInfo } from "livekit-server-sdk";

/**
 * Helpers de gravação (LiveKit Egress + Supabase Storage S3-compatible).
 *
 * Env-gate: se `LIVEKIT_EGRESS_ENABLED !== 'true'` OU alguma credencial S3
 * está vazia, `isEgressEnabled()` retorna `false` e todos os endpoints
 * devolvem 501. Isso permite deploy sem quebrar quem ainda não configurou.
 */

interface S3Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
}

let cachedEgressClient: EgressClient | null = null;

function getS3Config(): S3Config | null {
  const endpoint = process.env.SUPABASE_S3_ENDPOINT;
  const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
  const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
  const region = process.env.SUPABASE_S3_REGION;
  const bucket = process.env.SUPABASE_S3_BUCKET;

  if (!endpoint || !accessKey || !secretKey || !region || !bucket) {
    return null;
  }
  return { endpoint, accessKey, secretKey, region, bucket };
}

/**
 * Checa se a gravação está habilitada (env-gate).
 * Precisa: LIVEKIT_EGRESS_ENABLED='true' + LiveKit configurado + S3 configurado.
 */
export function isEgressEnabled(): boolean {
  if (process.env.LIVEKIT_EGRESS_ENABLED !== "true") return false;

  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return false;

  if (!getS3Config()) return false;

  return true;
}

function getEgressClient(): EgressClient {
  if (cachedEgressClient) return cachedEgressClient;

  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "LiveKit não configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)."
    );
  }

  // EgressClient também usa HTTP (Twirp), não WSS
  const httpUrl = url
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");
  cachedEgressClient = new EgressClient(httpUrl, apiKey, apiSecret);
  return cachedEgressClient;
}

/**
 * Inicia uma gravação composta (grid dinâmico focado em quem fala) da sala.
 * O arquivo MP4 é enviado ao bucket Supabase Storage via S3.
 *
 * @returns EgressInfo com `egressId` e status inicial.
 */
export async function startRoomRecording(params: {
  roomSlug: string;
}): Promise<{ egressInfo: EgressInfo; storagePath: string }> {
  if (!isEgressEnabled()) {
    throw new Error("Egress desabilitado. Configure as env vars.");
  }

  const s3 = getS3Config()!;
  const client = getEgressClient();

  // Nome do arquivo: {slug}/{ISO-timestamp}.mp4
  // Timestamp sem chars ruins pra S3 keys.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `${params.roomSlug}/${stamp}.mp4`;

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: storagePath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: s3.accessKey,
        secret: s3.secretKey,
        region: s3.region,
        endpoint: s3.endpoint,
        bucket: s3.bucket,
        // Supabase Storage S3 usa path-style
        forcePathStyle: true,
      }),
    },
  });

  const egressInfo = await client.startRoomCompositeEgress(
    params.roomSlug,
    output,
    { layout: "speaker" }
  );

  return { egressInfo, storagePath };
}

/**
 * Para uma gravação ativa. Idempotente — se já parou, LiveKit devolve o
 * estado final e nós apenas retornamos.
 */
export async function stopRoomRecording(
  egressId: string
): Promise<EgressInfo> {
  if (!isEgressEnabled()) {
    throw new Error("Egress desabilitado. Configure as env vars.");
  }
  const client = getEgressClient();
  return client.stopEgress(egressId);
}

/**
 * Mapeia status numérico do LiveKit para nossa string enum.
 */
export function mapEgressStatus(
  status: number
):
  | "starting"
  | "active"
  | "complete"
  | "failed"
  | "aborted"
  | "ending" {
  // Values from @livekit/protocol EgressStatus enum:
  // 0 STARTING, 1 ACTIVE, 2 ENDING, 3 COMPLETE, 4 FAILED, 5 ABORTED, 6 LIMIT_REACHED
  switch (status) {
    case 0:
      return "starting";
    case 1:
      return "active";
    case 2:
      return "ending";
    case 3:
      return "complete";
    case 4:
      return "failed";
    case 5:
      return "aborted";
    case 6:
      return "failed";
    default:
      return "starting";
  }
}
