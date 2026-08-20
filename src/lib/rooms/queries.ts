import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifica se o usuário atual pode entrar em uma sala pública para amigos
 * (visibility='friends' + amizade aceita com o host).
 */
export async function canFriendJoin(
  slug: string
): Promise<{
  roomId: string;
  hostId: string;
  title: string;
  maxParticipants: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: room } = await supabase
    .from("rooms")
    .select("id, host_id, title, max_participants, active, expires_at, visibility")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) return null;
  if (room.expires_at && new Date(room.expires_at) < new Date()) return null;

  // Host sempre pode
  if (room.host_id === user.id) {
    return {
      roomId: room.id,
      hostId: room.host_id,
      title: room.title,
      maxParticipants: room.max_participants,
    };
  }

  if (room.visibility !== "friends") return null;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${room.host_id}),and(requester_id.eq.${room.host_id},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) return null;

  return {
    roomId: room.id,
    hostId: room.host_id,
    title: room.title,
    maxParticipants: room.max_participants,
  };
}

/**
 * Retorna metadados mínimos e seguros de uma sala. Não vaza título/host
 * caso a sala não exista — retorna null e o caller mostra uma mensagem
 * genérica.
 */
export async function getRoomPreviewBySlug(slug: string): Promise<{
  title: string;
  activeParticipants: number;
} | null> {
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, title, active, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) return null;
  if (room.expires_at && new Date(room.expires_at) < new Date()) return null;

  const { count } = await admin
    .from("room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .is("left_at", null);

  return { title: room.title, activeParticipants: count ?? 0 };
}
