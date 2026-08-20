import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const ROOM_UPLOADS_BUCKET = "room-uploads";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * POST /api/uploads/room-image
 * Corpo: multipart/form-data
 *   - `file`: imagem (jpg, png, webp, gif) até 5 MB
 *   - `roomSlug`: slug da sala
 *
 * Fluxo:
 *   1. Autentica o usuário (só logados podem subir imagem no chat da sala).
 *   2. Confirma que ele é participante ativo (ou host) da sala.
 *   3. Sobe para o bucket `room-uploads` no path `{roomSlug}/{userId}/{uuid}.{ext}`.
 *   4. Retorna um signed URL válido por 24h.
 *
 * Se o bucket não existir, retorna 501 com mensagem clara.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rl = checkRateLimit({
    key: `room-image-upload:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente em ${rl.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const roomSlugRaw = formData.get("roomSlug");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }
  if (typeof roomSlugRaw !== "string" || !roomSlugRaw) {
    return NextResponse.json({ error: "Sala obrigatória." }, { status: 400 });
  }
  const roomSlug = roomSlugRaw.trim();

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use JPG, PNG, WebP ou GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande. Máximo 5 MB." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Autoriza: precisa ser host OU participante ativo da sala.
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id, active")
    .eq("slug", roomSlug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala não está ativa." }, { status: 404 });
  }

  if (room.host_id !== user.id) {
    const { data: participant } = await admin
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("profile_id", user.id)
      .is("left_at", null)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json(
        { error: "Você não está na sala." },
        { status: 403 }
      );
    }
  }

  const subtype = file.type.split("/")[1] ?? "png";
  const ext = subtype === "jpeg" ? "jpg" : subtype;
  const path = `${roomSlug}/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(ROOM_UPLOADS_BUCKET)
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
            "Uploads não configurados. Peça ao admin para criar o bucket 'room-uploads' no Supabase Storage.",
        },
        { status: 501 }
      );
    }
    console.error("[room-image upload]", uploadError);
    return NextResponse.json({ error: "Falha ao subir imagem." }, { status: 500 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(ROOM_UPLOADS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    console.error("[room-image signed url]", signedError);
    return NextResponse.json(
      { error: "Imagem subiu mas assinatura falhou." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signed.signedUrl });
}
