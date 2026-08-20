import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEgressEnabled, stopRoomRecording } from "@/lib/livekit/recording";

const bodySchema = z
  .object({
    egressId: z.string().min(1).optional(),
  })
  .default({});

/**
 * POST /api/rooms/[slug]/recording/stop
 * Corpo: { egressId? } — se omitido, busca a gravação ativa da sala.
 *
 * Só host pode. Marca status='complete' na row correspondente (o webhook
 * também vai atualizar, mas atualizamos aqui pra latência menor).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isEgressEnabled()) {
    return NextResponse.json(
      { error: "Gravação não está habilitada neste servidor." },
      { status: 501 }
    );
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // corpo vazio é aceito
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
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
    .select("id, host_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json(
      { error: "Só o host pode parar a gravação." },
      { status: 403 }
    );
  }

  // Descobre qual gravação parar
  let egressId = parsed.data.egressId;
  if (!egressId) {
    const { data: active } = await admin
      .from("room_recordings")
      .select("egress_id")
      .eq("room_id", room.id)
      .in("status", ["starting", "active"])
      .maybeSingle();
    egressId = active?.egress_id;
  }

  if (!egressId) {
    return NextResponse.json(
      { error: "Nenhuma gravação ativa encontrada." },
      { status: 404 }
    );
  }

  try {
    await stopRoomRecording(egressId);
  } catch (err) {
    console.error("[recording/stop] stopEgress falhou:", err);
    // Prossegue mesmo assim — pode já estar parada
  }

  await admin
    .from("room_recordings")
    .update({
      status: "complete",
      ended_at: new Date().toISOString(),
    })
    .eq("egress_id", egressId)
    .in("status", ["starting", "active"]);

  return NextResponse.json({ ok: true, egressId });
}
