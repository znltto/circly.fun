import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  lobbyId: z.string().uuid(),
});

/**
 * POST /api/rooms/[slug]/lobby/cancel
 *
 * Chamado pelo próprio requisitante (via beacon/fetch keepalive) quando
 * ele fecha a aba ou desiste. Marca resolution='cancelled' se ainda pendente.
 * Aceita anônimo — a posse do `lobbyId` (uuid opaco) já é o token.
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
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "Sala inexistente." }, { status: 404 });
  }

  await admin
    .from("room_lobby")
    .update({
      resolved_at: new Date().toISOString(),
      resolution: "cancelled",
      admit_token: null,
    })
    .eq("id", parsed.data.lobbyId)
    .eq("room_id", room.id)
    .is("resolved_at", null);

  return NextResponse.json({ ok: true });
}
