import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface FriendProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FriendshipEntry {
  id: string;
  status: "pending" | "accepted" | "blocked";
  direction: "outgoing" | "incoming";
  friend: FriendProfile;
  created_at: string;
}

/**
 * Retorna todas as relações do usuário atual — aceitas + pendentes (in/out).
 * Cada entrada já traz o perfil do "outro lado" pronto para renderizar.
 */
export async function listFriendships(): Promise<FriendshipEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      status,
      requester_id,
      addressee_id,
      created_at,
      requester:profiles!friendships_requester_id_fkey ( id, username, display_name, avatar_url ),
      addressee:profiles!friendships_addressee_id_fkey ( id, username, display_name, avatar_url )
    `
    )
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const isOutgoing = row.requester_id === user.id;
    const friend = (isOutgoing ? row.addressee : row.requester) as
      | FriendProfile
      | null;

    return {
      id: row.id,
      status: row.status as FriendshipEntry["status"],
      direction: isOutgoing ? "outgoing" : "incoming",
      friend: friend ?? {
        id: "",
        username: "desconhecido",
        display_name: "Desconhecido",
        avatar_url: null,
      },
      created_at: row.created_at,
    };
  });
}

export async function searchProfilesByUsername(
  query: string
): Promise<FriendProfile[]> {
  const clean = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (clean.length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .ilike("username", `${clean}%`)
    .neq("id", user.id)
    .limit(8);

  return data ?? [];
}
