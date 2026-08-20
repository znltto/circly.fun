import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEgressEnabled } from "@/lib/livekit/recording";

/**
 * GET /api/rooms/[slug]/recording/status
 *
 * Retorna a gravação ativa (starting|active) da sala, se houver.
 * Público (chamado por qualquer participante para exibir o indicador REC).
 * Não expõe storage_path — só o essencial.
 *
 * Se Egress desabilitado, sempre retorna `{ active: null }`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isEgressEnabled()) {
    return NextResponse.json({ active: null, enabled: false });
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ active: null, enabled: true });
  }

  const { data: recording } = await admin
    .from("room_recordings")
    .select("id, egress_id, status, started_at")
    .eq("room_id", room.id)
    .in("status", ["starting", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recording) {
    return NextResponse.json({ active: null, enabled: true });
  }

  return NextResponse.json({
    active: {
      id: recording.id,
      egressId: recording.egress_id,
      status: recording.status,
      startedAt: recording.started_at,
    },
    enabled: true,
  });
}
