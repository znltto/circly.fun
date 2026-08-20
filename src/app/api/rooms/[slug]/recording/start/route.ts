import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEgressEnabled, startRoomRecording } from "@/lib/livekit/recording";

/**
 * POST /api/rooms/[slug]/recording/start
 *
 * Só o host pode iniciar. Cria uma linha em `room_recordings` com
 * status='starting' — o webhook do LiveKit atualiza para 'active' e depois
 * 'complete' com storage_path/size/duration.
 *
 * Env-gate: 501 se LIVEKIT_EGRESS_ENABLED não estiver ligado.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isEgressEnabled()) {
    return NextResponse.json(
      { error: "Gravação não está habilitada neste servidor." },
      { status: 501 }
    );
  }

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
    .select("id, host_id, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json(
      { error: "Só o host pode iniciar a gravação." },
      { status: 403 }
    );
  }

  // Impede iniciar duas gravações concorrentes na mesma sala.
  const { data: existing } = await admin
    .from("room_recordings")
    .select("id, egress_id, status")
    .eq("room_id", room.id)
    .in("status", ["starting", "active"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "Já existe uma gravação ativa nesta sala.",
        recordingId: existing.id,
        egressId: existing.egress_id,
      },
      { status: 409 }
    );
  }

  try {
    const { egressInfo, storagePath } = await startRoomRecording({
      roomSlug: slug,
    });

    const { data: recording, error: insertError } = await admin
      .from("room_recordings")
      .insert({
        room_id: room.id,
        egress_id: egressInfo.egressId,
        status: "starting",
        storage_path: storagePath,
        started_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !recording) {
      console.error("[recording/start] insert falhou:", insertError);
      return NextResponse.json(
        { error: "Gravação iniciada mas falha ao persistir." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recordingId: recording.id,
      egressId: egressInfo.egressId,
    });
  } catch (err) {
    console.error("[recording/start] falhou:", err);
    return NextResponse.json(
      { error: "Falha ao iniciar gravação." },
      { status: 500 }
    );
  }
}
