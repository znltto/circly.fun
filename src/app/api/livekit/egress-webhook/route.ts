import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEgressEnabled, mapEgressStatus } from "@/lib/livekit/recording";

/**
 * POST /api/livekit/egress-webhook
 *
 * Recebe eventos do LiveKit Cloud: `egress_started`, `egress_updated`,
 * `egress_ended`. Verifica assinatura via `WebhookReceiver` (HMAC do
 * `Authorization` header, mesmo secret da API).
 *
 * Configuração no LiveKit Cloud → Project → Webhooks:
 *   URL: https://{NEXT_PUBLIC_APP_URL}/api/livekit/egress-webhook
 *   Events: egress_started, egress_updated, egress_ended
 */
export async function POST(request: Request) {
  if (!isEgressEnabled()) {
    return NextResponse.json(
      { error: "Egress desabilitado." },
      { status: 501 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit não configurado." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bodyText = await request.text();

  const receiver = new WebhookReceiver(apiKey, apiSecret);
  let event;
  try {
    event = await receiver.receive(bodyText, authHeader);
  } catch (err) {
    console.warn("[egress-webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const egress = event.egressInfo;
  if (!egress) {
    // Evento não relacionado a egress — ignora silenciosamente
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  // Extrai métricas do primeiro fileResult (temos só um arquivo por gravação).
  const file = egress.fileResults?.[0];
  const status = mapEgressStatus(egress.status);

  // 'ending' não é um status persistido — reutiliza 'active' até virar 'complete'
  const dbStatus =
    status === "ending" ? "active" : status;

  const patch: {
    status: typeof dbStatus;
    storage_path?: string;
    size_bytes?: number;
    duration_seconds?: number;
    ended_at?: string;
  } = { status: dbStatus };

  if (file?.filename) {
    patch.storage_path = file.filename;
  }
  if (file?.size !== undefined) {
    // proto bigint → number (arquivos abaixo de 8 EB, tranquilo)
    patch.size_bytes = Number(file.size);
  }
  if (file?.duration !== undefined) {
    // duration em nanosegundos → segundos
    patch.duration_seconds = Math.round(Number(file.duration) / 1e9);
  }
  if (
    event.event === "egress_ended" ||
    dbStatus === "complete" ||
    dbStatus === "failed" ||
    dbStatus === "aborted"
  ) {
    // LiveKit envia timestamps em nanosegundos desde epoch. Convertemos para ms.
    if (egress.endedAt && Number(egress.endedAt) > 0) {
      const endedMs = Number(egress.endedAt) / 1_000_000;
      patch.ended_at = new Date(endedMs).toISOString();
    } else {
      patch.ended_at = new Date().toISOString();
    }
  }

  const { error } = await admin
    .from("room_recordings")
    .update(patch)
    .eq("egress_id", egress.egressId);

  if (error) {
    console.error("[egress-webhook] update falhou:", error);
    // Não retorna 500 — LiveKit poderia tentar de novo indefinidamente
  }

  return NextResponse.json({ ok: true });
}
