import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logRoomAction } from "@/lib/rooms/audit";

/**
 * GET /api/rooms/[slug]/host
 *
 * Retorna a identity LiveKit ("u:<uuid>") do host atual. Público para
 * qualquer participante da sala — usado pra detectar promoção via polling.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("host_id, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  // Identity autenticada é sempre "u:<uuid>" (ver src/lib/rooms/slug.ts).
  return NextResponse.json({
    hostIdentity: `u:${room.host_id}`,
  });
}

const bodySchema = z.object({
  toIdentity: z.string().min(1),
});

/**
 * POST /api/rooms/[slug]/host
 *
 * Só o host atual chama. Transfere `rooms.host_id` para o `profile_id`
 * associado à identity indicada. O novo host precisa ser um participante
 * autenticado (guests não podem ser hosts).
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
      { error: "Só o host pode transferir." },
      { status: 403 }
    );
  }

  // Identidade "u:<uuid>" → resolve profile_id ativo na sala
  const identity = parsed.data.toIdentity;
  if (!identity.startsWith("u:")) {
    return NextResponse.json(
      { error: "Só participantes autenticados podem ser host." },
      { status: 400 }
    );
  }

  const { data: participant } = await admin
    .from("room_participants")
    .select("profile_id")
    .eq("room_id", room.id)
    .eq("livekit_identity", identity)
    .is("left_at", null)
    .maybeSingle();

  if (!participant?.profile_id) {
    return NextResponse.json(
      { error: "Participante não está na sala." },
      { status: 404 }
    );
  }
  if (participant.profile_id === user.id) {
    return NextResponse.json(
      { error: "Você já é o host." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("rooms")
    .update({ host_id: participant.profile_id })
    .eq("id", room.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [{ data: actor }, { data: target }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    admin
      .from("profiles")
      .select("display_name")
      .eq("id", participant.profile_id)
      .maybeSingle(),
  ]);
  void logRoomAction({
    roomId: room.id,
    action: "host-transfer",
    actorProfileId: user.id,
    actorDisplayName: actor?.display_name ?? null,
    targetProfileId: participant.profile_id,
    targetDisplayName: target?.display_name ?? null,
  });

  return NextResponse.json({ ok: true });
}
