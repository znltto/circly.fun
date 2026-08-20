import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { countActiveParticipants } from "@/lib/livekit/room-service";

const bodySchema = z.object({
  identity: z.string().min(1),
});

/**
 * POST /api/rooms/[slug]/leave
 * Corpo: { identity: string }
 *
 * Marca o participante como saído (left_at = now).
 * Depois checa se a sala está vazia no LiveKit — se sim, marca
 * `rooms.active=false, ended_at=now`.
 *
 * Idempotente: se o participante já saiu, não faz nada. Se a sala
 * já está encerrada, não faz nada.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: room } = await admin
    .from("rooms")
    .select("id, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }

  await admin
    .from("room_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("room_id", room.id)
    .eq("livekit_identity", parsed.data.identity)
    .is("left_at", null);

  // Checa se a sala esvaziou. Se sim, encerra.
  const activeCount = await countActiveParticipants(slug);

  if (activeCount === 0) {
    await admin
      .from("rooms")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("active", true);
    return NextResponse.json({ ok: true, roomEnded: true });
  }

  return NextResponse.json({ ok: true, remaining: activeCount });
}
