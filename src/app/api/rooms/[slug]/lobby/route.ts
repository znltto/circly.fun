import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/rooms/[slug]/lobby
 *
 * Só o host da sala. Retorna a fila de pedidos pendentes (não resolvidos).
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
    .select("id, host_id, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "Só o host." }, { status: 403 });
  }

  const { data: pending } = await admin
    .from("room_lobby")
    .select("id, display_name, guest_name, profile_id, requested_at")
    .eq("room_id", room.id)
    .is("resolved_at", null)
    .order("requested_at", { ascending: true });

  return NextResponse.json({ pending: pending ?? [] });
}
