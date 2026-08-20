import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * POST /api/uploads/avatar
 * Corpo: multipart/form-data com campo `file`
 *
 * Faz upload para bucket `avatars` (assume que existe — se não, retorna 501).
 * Atualiza `profiles.avatar_url` com URL pública.
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
    key: `avatar-upload:${user.id}`,
    limit: 5,
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use JPG, PNG, WebP ou GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande. Máximo 2 MB." },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    // 404 aqui = bucket não existe
    if (uploadError.message.includes("not found") || uploadError.message.includes("Bucket")) {
      return NextResponse.json(
        {
          error:
            "Uploads não configurados. Peça ao admin para criar o bucket 'avatars' no Supabase Storage.",
        },
        { status: 501 }
      );
    }
    console.error("[avatar upload]", uploadError);
    return NextResponse.json({ error: "Falha ao subir imagem." }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  // Deleta avatar antigo se existia (best-effort)
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.avatar_url) {
    try {
      const oldUrl = new URL(profile.avatar_url);
      // path após "/object/public/avatars/"
      const marker = "/object/public/avatars/";
      const idx = oldUrl.pathname.indexOf(marker);
      if (idx >= 0) {
        const oldPath = oldUrl.pathname.slice(idx + marker.length);
        await admin.storage.from(AVATAR_BUCKET).remove([oldPath]);
      }
    } catch {
      // ignore
    }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[avatar update profile]", updateError);
    return NextResponse.json(
      { error: "Imagem subiu mas perfil não atualizou." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: publicUrl });
}
