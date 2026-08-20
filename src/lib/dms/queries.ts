import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DmProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ConversationSummary {
  friend: DmProfile;
  lastMessage: {
    content: string;
    created_at: string;
    from_self: boolean;
  } | null;
  unreadCount: number;
}

/**
 * Lista de conversas: um item por amigo aceito, com última mensagem
 * (se houver) e contador de não lidas.
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Pega amigos aceitos
  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      `
      id,
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey ( id, username, display_name, avatar_url ),
      addressee:profiles!friendships_addressee_id_fkey ( id, username, display_name, avatar_url )
    `
    )
    .eq("status", "accepted");

  if (!friendships) return [];

  const friends: DmProfile[] = friendships
    .map((f) => {
      const isOutgoing = f.requester_id === user.id;
      const friend = isOutgoing ? f.addressee : f.requester;
      return friend as DmProfile | null;
    })
    .filter((f): f is DmProfile => f !== null);

  if (friends.length === 0) return [];

  const friendIds = friends.map((f) => f.id);

  // Última mensagem por par (query simples pega TODAS e agrupa em app)
  const { data: recentMessages } = await supabase
    .from("direct_messages")
    .select("sender_id, recipient_id, content, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.in.(${friendIds.join(",")})),and(recipient_id.eq.${user.id},sender_id.in.(${friendIds.join(",")}))`
    )
    .order("created_at", { ascending: false })
    .limit(500); // suficiente pra 20 amigos

  const conversations: ConversationSummary[] = friends.map((friend) => {
    const relevantMessages = (recentMessages ?? []).filter(
      (m) =>
        (m.sender_id === user.id && m.recipient_id === friend.id) ||
        (m.recipient_id === user.id && m.sender_id === friend.id)
    );

    const last = relevantMessages[0]
      ? {
          content: relevantMessages[0].content,
          created_at: relevantMessages[0].created_at,
          from_self: relevantMessages[0].sender_id === user.id,
        }
      : null;

    const unreadCount = relevantMessages.filter(
      (m) => m.recipient_id === user.id && m.read_at === null
    ).length;

    return { friend, lastMessage: last, unreadCount };
  });

  // Ordenar: conversas com mensagens primeiro (mais recentes), depois vazias
  conversations.sort((a, b) => {
    const aTs = a.lastMessage?.created_at ?? "";
    const bTs = b.lastMessage?.created_at ?? "";
    return bTs.localeCompare(aTs);
  });

  return conversations;
}

/**
 * Busca perfil por username (para /mensagens/[username]).
 * Retorna null se não existe ou se não é amigo aceito.
 */
export async function getFriendByUsername(username: string): Promise<DmProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(addressee_id.eq.${user.id},requester_id.eq.${profile.id})`
    )
    .maybeSingle();

  if (!friendship) return null;
  return profile;
}

export interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  from_self: boolean;
}

export async function listThread(friendId: string): Promise<DmMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (!data) return [];

  return data.map((m) => ({
    ...m,
    from_self: m.sender_id === user.id,
  }));
}

export async function countTotalUnread(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return count ?? 0;
}
