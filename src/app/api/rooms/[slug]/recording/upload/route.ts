import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

const RECORDINGS_BUCKET = "recordings";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB tetos
const MAX_AUDIO_BYTES = 30 * 1024 * 1024; // 30 MB (audio-only comprimido)

/**
 * POST /api/rooms/[slug]/recording/upload
 * multipart/form-data
 *   - file: Blob (video/webm) — stream principal (tela + áudio)
 *   - audio?: Blob (audio/webm) — stream separado audio-only pra transcrição
 *   - startedAt: ISO string
 *   - durationSeconds: number
 *
 * Só admins podem gravar. Grava vídeo em recordings/{slug}/{ts}.webm
 * e áudio (se enviado) em recordings/{slug}/{ts}.audio.webm.
 *
 * Retorna { id, path, audioPath } — o client dispara o /process em seguida.
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

  const videoFile = formData.get("file");
  const audioFile = formData.get("audio");
  const startedAt = String(
    formData.get("startedAt") ?? new Date().toISOString()
  );
  const durationSeconds = parseInt(
    String(formData.get("durationSeconds") ?? "0"),
    10
  );

  if (!(videoFile instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }
  if (videoFile.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Gravação muito grande. Máximo 500 MB." },
      { status: 413 }
    );
  }
  if (!videoFile.type.startsWith("video/")) {
    return NextResponse.json(
      { error: "Formato inválido. Esperado video/webm." },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const videoExt = videoFile.type.includes("mp4") ? "mp4" : "webm";
  const videoPath = `${slug}/${timestamp}.${videoExt}`;

  const { error: uploadError } = await admin.storage
    .from(RECORDINGS_BUCKET)
    .upload(videoPath, videoFile, {
      contentType: videoFile.type,
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

  // Upload do áudio-only (opcional; usado pra transcrever)
  let audioPath: string | null = null;
  if (audioFile instanceof File && audioFile.size > 0) {
    if (audioFile.size > MAX_AUDIO_BYTES) {
      console.warn(
        "[recording upload] audio-only maior que",
        MAX_AUDIO_BYTES,
        "— transcrição pode falhar."
      );
    }
    audioPath = `${slug}/${timestamp}.audio.webm`;
    const { error: audioErr } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .upload(audioPath, audioFile, {
        contentType: audioFile.type || "audio/webm",
        cacheControl: "3600",
        upsert: false,
      });
    if (audioErr) {
      console.warn("[recording audio upload]", audioErr);
      audioPath = null;
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("room_recordings")
    .insert({
      room_id: room.id,
      egress_id: `browser-${timestamp}`,
      status: "complete",
      storage_path: videoPath,
      audio_path: audioPath,
      size_bytes: videoFile.size,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      started_by: user.id,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      processing_status: audioPath ? "pending" : "skipped",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[recording metadata]", insertError);
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id ?? null,
    path: videoPath,
    audioPath,
    size: videoFile.size,
  });
}
