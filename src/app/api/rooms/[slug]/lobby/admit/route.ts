import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logRoomAction } from "@/lib/rooms/audit";

const bodySchema = z.object({
  lobbyId: z.string().uuid(),
});

/**
 * POST /api/rooms/[slug]/lobby/admit
 *
 * Host aprova um pedido pendente. Gera um `admit_token` (uuid) que o
 * cliente aguardando deve trocar por token do LiveKit em /api/livekit/token.
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
    return NextResponse.json({ error: "Só o host." }, { status: 403 });
  }

  const token = randomUUID();
  const { data: updated, error } = await admin
    .from("room_lobby")
    .update({
      resolved_at: new Date().toISOString(),
      resolution: "admitted",
      admit_token: token,
    })
    .eq("id", parsed.data.lobbyId)
    .eq("room_id", room.id)
    .is("resolved_at", null)
    .select("id, display_name, profile_id")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json(
      { error: "Pedido já resolvido ou inexistente." },
      { status: 404 }
    );
  }

  const { data: actor } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  void logRoomAction({
    roomId: room.id,
    action: "lobby-admit",
    actorProfileId: user.id,
    actorDisplayName: actor?.display_name ?? null,
    targetProfileId: updated.profile_id ?? null,
    targetDisplayName: updated.display_name,
  });

  return NextResponse.json({ ok: true });
}
