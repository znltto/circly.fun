import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRecordingSignedUrl } from "@/lib/livekit/recording-download";

/**
 * GET /api/rooms/[slug]/recording/[id]/download
 *
 * Gera uma URL assinada de curto TTL para download da gravação.
 * Autorização: host da sala OU participante autenticado que já esteve
 * na sala (mesma regra da RLS de room_recordings).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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

  const { data: recording } = await admin
    .from("room_recordings")
    .select("id, room_id, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!recording || recording.room_id !== room.id) {
    return NextResponse.json(
      { error: "Gravação não encontrada." },
      { status: 404 }
    );
  }
  if (!recording.storage_path || recording.status !== "complete") {
    return NextResponse.json(
      { error: "Gravação ainda não está disponível." },
      { status: 409 }
    );
  }

  // Autorização: host OU participante passado da sala
  let authorized = room.host_id === user.id;
  if (!authorized) {
    const { data: participation } = await admin
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    authorized = !!participation;
  }
  if (!authorized) {
    return NextResponse.json(
      { error: "Sem acesso a esta gravação." },
      { status: 403 }
    );
  }

  const url = await createRecordingSignedUrl(recording.storage_path);
  if (!url) {
    return NextResponse.json(
      { error: "Falha ao gerar URL de download." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url });
}
