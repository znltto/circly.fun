import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

const RECORDINGS_BUCKET = "recordings";
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB de teto por gravação

/**
 * POST /api/rooms/[slug]/recording/upload
 * multipart/form-data
 *   - file: Blob (video/webm)
 *   - startedAt: ISO string
 *   - durationSeconds: number
 *
 * Somente admins podem subir. O admin grava no navegador via
 * MediaRecorder (getDisplayMedia) e envia o blob final aqui.
 *
 * O arquivo é salvo em recordings/{slug}/{timestamp}.webm.
 * Metadata é gravada em room_recordings.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Apenas admins podem gravar." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const startedAt = String(formData.get("startedAt") ?? new Date().toISOString());
  const durationSeconds = parseInt(
    String(formData.get("durationSeconds") ?? "0"),
    10
  );

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Gravação muito grande. Máximo 500 MB." },
      { status: 413 }
    );
  }

  if (!file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: "Formato inválido. Esperado video/webm." },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const ext = file.type.includes("mp4") ? "mp4" : "webm";
  const path = `${slug}/${timestamp}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message.toLowerCase();
    if (msg.includes("not found") || msg.includes("bucket")) {
      return NextResponse.json(
        {
          error:
            "Gravação não configurada. Crie o bucket 'recordings' (privado) no Supabase Storage.",
        },
        { status: 501 }
      );
    }
    console.error("[recording upload]", uploadError);
    return NextResponse.json(
      { error: "Falha ao subir gravação." },
      { status: 500 }
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("room_recordings")
    .insert({
      room_id: room.id,
      egress_id: `browser-${timestamp}`,
      status: "complete",
      storage_path: path,
      size_bytes: file.size,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      started_by: user.id,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[recording metadata]", insertError);
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id ?? null,
    path,
    size: file.size,
  });
}
