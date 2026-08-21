import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/rooms/[slug]/lobby/status?lobbyId=xxx
 *
 * Público — o próprio requisitante (pode ser guest sem sessão) faz poll.
 * Retorna `{ status, admitToken? }`. Só devolve o `admitToken` uma vez, quando
 * status='admitted'; o cliente deve trocar por token do LiveKit.
 *
 * Como o `id` da fila é uuid opaco, atua como capability suficiente para
 * o requisitante autenticar seu próprio pedido sem sessão.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const lobbyId = url.searchParams.get("lobbyId");
  if (!lobbyId) {
    return NextResponse.json({ error: "lobbyId ausente." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }

  const { data: entry } = await admin
    .from("room_lobby")
    .select("id, resolution, admit_token, display_name, requested_at")
    .eq("id", lobbyId)
    .eq("room_id", room.id)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const status = entry.resolution ?? "pending";
  const body: {
    status: string;
    displayName: string;
    requestedAt: string;
    admitToken?: string;
  } = {
    status,
    displayName: entry.display_name,
    requestedAt: entry.requested_at,
  };
  if (status === "admitted" && entry.admit_token) {
    body.admitToken = entry.admit_token;
  }
  return NextResponse.json(body);
}
