import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mensagem enriquecida com metadados do autor (perfil quando existe).
 * Sender_profile_id null indica que a mensagem foi enviada por um guest.
 */
export interface RoomMessageRow {
  id: string;
  room_id: string;
  sender_profile_id: string | null;
  guest_name: string | null;
  content: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
}

/**
 * Retorna as últimas `limit` mensagens da sala (mais antigas primeiro,
 * prontas para renderizar em ordem cronológica).
 *
 * Usa service role porque as policies atuais em `messages` só permitem
 * SELECT para o host da sala e para o próprio autor. Como a UI do chat
 * precisa mostrar todas as mensagens para qualquer participante ativo,
 * fazemos a checagem de autorização aqui (participante ativo na sala)
 * e bypassamos RLS.
 */
export async function listRoomMessages(
  roomSlug: string,
  viewerProfileId: string | null,
  viewerIdentity: string,
  limit = 50
): Promise<RoomMessageRow[]> {
  const admin = createAdminClient();

  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id")
    .eq("slug", roomSlug)
    .maybeSingle();

  if (!room) return [];

  // Autoriza: host, participante autenticado ativo, ou guest ativo pelo
  // livekit_identity (para visitantes sem sessão).
  const isHost = viewerProfileId ? room.host_id === viewerProfileId : false;

  if (!isHost) {
    let query = admin
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .is("left_at", null)
      .limit(1);

    if (viewerProfileId) {
      query = query.eq("profile_id", viewerProfileId);
    } else {
      query = query.eq("livekit_identity", viewerIdentity);
    }

    const { data: rows } = await query;
    if (!rows || rows.length === 0) return [];
  }

  const { data, error } = await admin
    .from("messages")
    .select(
      "id, room_id, sender_profile_id, guest_name, content, created_at, attachment_url, attachment_type"
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Batch-fetch profiles em uma única query — evita N+1 e não depende de FK
  // declarada nos types.
  const profileIds = Array.from(
    new Set(
      data
        .map((m) => m.sender_profile_id)
        .filter((id): id is string => id !== null)
    )
  );

  const profileMap = new Map<
    string,
    { username: string; display_name: string; avatar_url: string | null }
  >();

  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      });
    }
  }

  const rows: RoomMessageRow[] = data
    .map((m) => {
      const profile = m.sender_profile_id
        ? profileMap.get(m.sender_profile_id)
        : null;
      return {
        id: m.id,
        room_id: m.room_id,
        sender_profile_id: m.sender_profile_id,
        guest_name: m.guest_name,
        content: m.content,
        created_at: m.created_at,
        attachment_url: m.attachment_url,
        attachment_type: m.attachment_type,
        sender_username: profile?.username ?? null,
        sender_display_name: profile?.display_name ?? null,
        sender_avatar_url: profile?.avatar_url ?? null,
      };
    })
    .reverse();

  return rows;
}

export interface MessageReactionRow {
  id: string;
  message_id: string;
  reactor_id: string;
  emoji: string;
  created_at: string;
}

/**
 * Retorna todas as reações das mensagens indicadas em uma tacada só.
 * Usa service role — a policy de SELECT existente já filtra por sala,
 * mas guests não têm sessão, então o fetch inicial usa admin.
 */
export async function listReactionsForMessages(
  messageIds: string[]
): Promise<MessageReactionRow[]> {
  if (messageIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("message_reactions")
    .select("id, message_id, reactor_id, emoji, created_at")
    .in("message_id", messageIds);

  return data ?? [];
}
