import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RECORDINGS_BUCKET = "recordings";
const RETENTION_DAYS = 7;

/**
 * GET /api/cron/recordings-cleanup?token=<CRON_TOKEN>
 *
 * Remove os *arquivos* de vídeo com mais de 7 dias em que keep_video = false.
 * Preserva:
 *   - o áudio-only (usado se precisar re-transcrever)
 *   - a análise IA (transcript, summary, topics, action items) — permanente
 *   - o metadata em room_recordings
 *
 * O que muda no DB: storage_path vira NULL e size_bytes zera. A UI
 * mostra "vídeo indisponível" mas a análise continua acessível.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const providedToken =
    url.searchParams.get("token") ??
    request.headers.get("x-cron-token") ??
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : "") ??
    "";

  const expected = process.env.CRON_TOKEN || process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_TOKEN não configurada." },
      { status: 501 }
    );
  }
  if (providedToken !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const admin = createAdminClient();

  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: expired, error: queryError } = await admin
    .from("room_recordings")
    .select("id, storage_path")
    .lt("started_at", cutoff)
    .eq("keep_video", false)
    .not("storage_path", "is", null);

  if (queryError) {
    console.error("[recordings-cleanup] query falhou:", queryError);
    return NextResponse.json(
      { error: "Falha ao consultar gravações." },
      { status: 500 }
    );
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, deleted: 0 });
  }

  const paths = expired
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));

  let deletedFiles = 0;
  if (paths.length > 0) {
    const { error: deleteError } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .remove(paths);
    if (deleteError) {
      console.error("[recordings-cleanup] delete falhou:", deleteError);
    } else {
      deletedFiles = paths.length;
    }
  }

  const ids = expired.map((r) => r.id);
  await admin
    .from("room_recordings")
    .update({ storage_path: null, size_bytes: 0 })
    .in("id", ids);

  return NextResponse.json({
    ok: true,
    checked: expired.length,
    deleted: deletedFiles,
    retentionDays: RETENTION_DAYS,
  });
}
