import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logRoomAction } from "@/lib/rooms/audit";

const bodySchema = z.object({
  locked: z.boolean(),
});

/**
 * GET /api/rooms/[slug]/lock — só o host lê o estado atual.
 */
export async function GET(
  _request: Request,
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

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("host_id, locked, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "Só o host." }, { status: 403 });
  }
  return NextResponse.json({ locked: !!room.locked });
}

/**
 * POST /api/rooms/[slug]/lock
 *
 * Só o host altera. Quando `locked=true`, novos participantes recebem 403
 * em /api/livekit/token (mesmo com convite válido). Já quem está dentro
 * continua na chamada.
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
      { error: "Só o host pode trancar a sala." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("rooms")
    .update({ locked: parsed.data.locked })
    .eq("id", room.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: actor } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  void logRoomAction({
    roomId: room.id,
    action: parsed.data.locked ? "lock" : "unlock",
    actorProfileId: user.id,
    actorDisplayName: actor?.display_name ?? null,
  });

  return NextResponse.json({ ok: true, locked: parsed.data.locked });
}
