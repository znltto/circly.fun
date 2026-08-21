import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logRoomAction } from "@/lib/rooms/audit";

const bodySchema = z.object({
  enabled: z.boolean(),
});

/**
 * GET /api/rooms/[slug]/lobby-toggle — host lê estado atual.
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
    .select("host_id, lobby_enabled, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "Só o host." }, { status: 403 });
  }
  return NextResponse.json({ enabled: !!room.lobby_enabled });
}

/**
 * POST /api/rooms/[slug]/lobby-toggle
 * Só o host. Liga/desliga waiting room durante a call.
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
      { error: "Só o host pode alterar a sala de espera." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("rooms")
    .update({ lobby_enabled: parsed.data.enabled })
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
    action: parsed.data.enabled ? "lobby-on" : "lobby-off",
    actorProfileId: user.id,
    actorDisplayName: actor?.display_name ?? null,
  });

  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
