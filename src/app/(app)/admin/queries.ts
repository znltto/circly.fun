import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminStats {
  usersTotal: number;
  usersLast7d: number;
  friendshipsAccepted: number;
  roomsTotal: number;
  roomsActive: number;
  callsToday: number;
  messagesToday: number;
  dmsToday: number;
  aiTokensTotal: number;
  aiCostMicroDollars: number;
  aiCostMicroDollarsMonth: number;
  aiTurnsTotal: number;
}

export interface AiConversation {
  id: string;
  user_email: string | null;
  user_message: string | null;
  assistant_message: string | null;
  total_tokens: number;
  cost_micro_dollars: number;
  created_at: string;
}

const START_OF_TODAY = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const DAYS_AGO_ISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const START_OF_MONTH = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/**
 * Contador genérico com filtro opcional. Usa `any` pro builder porque o
 * tipo real do supabase-js muda a cada `.eq()`/`.gte()`, e aqui a gente
 * só precisa da API fluente encadeada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(table: string, filter?: (q: any) => any): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export async function loadAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  const [
    usersTotal,
    usersLast7d,
    friendshipsAccepted,
    roomsTotal,
    roomsActive,
    callsToday,
    messagesToday,
    dmsToday,
    aiTurnsTotal,
  ] = await Promise.all([
    count("profiles"),
    count("profiles", (q) => q.gte("created_at", DAYS_AGO_ISO(7))),
    count("friendships", (q) => q.eq("status", "accepted")),
    count("rooms"),
    count("rooms", (q) => q.eq("active", true)),
    count("rooms", (q) => q.gte("created_at", START_OF_TODAY())),
    count("messages", (q) => q.gte("created_at", START_OF_TODAY())),
    count("direct_messages", (q) => q.gte("created_at", START_OF_TODAY())),
    count("ai_chat_logs"),
  ]);

  // Sums de custo/tokens (query separada porque count(head) não soma)
  const [{ data: costAll }, { data: costMonth }] = await Promise.all([
    admin
      .from("ai_chat_logs")
      .select("total_tokens, cost_micro_dollars"),
    admin
      .from("ai_chat_logs")
      .select("cost_micro_dollars")
      .gte("created_at", START_OF_MONTH()),
  ]);

  const aiTokensTotal = (costAll ?? []).reduce(
    (acc, row) => acc + (row.total_tokens ?? 0),
    0
  );
  const aiCostMicroDollars = (costAll ?? []).reduce(
    (acc, row) => acc + (row.cost_micro_dollars ?? 0),
    0
  );
  const aiCostMicroDollarsMonth = (costMonth ?? []).reduce(
    (acc, row) => acc + (row.cost_micro_dollars ?? 0),
    0
  );

  return {
    usersTotal,
    usersLast7d,
    friendshipsAccepted,
    roomsTotal,
    roomsActive,
    callsToday,
    messagesToday,
    dmsToday,
    aiTokensTotal,
    aiCostMicroDollars,
    aiCostMicroDollarsMonth,
    aiTurnsTotal,
  };
}

export async function loadRecentConversations(
  limit = 30
): Promise<AiConversation[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_chat_logs")
    .select(
      "id, user_email, user_message, assistant_message, total_tokens, cost_micro_dollars, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export function formatUsd(microDollars: number): string {
  const dollars = microDollars / 1_000_000;
  if (dollars < 0.01) return `< $0.01`;
  return `$${dollars.toFixed(4).replace(/\.?0+$/, "")}`;
}
