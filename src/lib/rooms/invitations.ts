"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/server";

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

export interface PendingInvitation {
  id: string;
  createdAt: string;
  room: {
    slug: string;
    title: string;
    active: boolean;
    scheduledFor: string | null;
  };
  inviter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

/* ------------------------------------------------------------------
 * Queries — chamadas de server components/actions
 * ------------------------------------------------------------------ */

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("room_invitations")
    .select(
      `
      id,
      created_at,
      room:rooms!room_invitations_room_id_fkey ( slug, title, active, scheduled_for ),
      inviter:profiles!room_invitations_inviter_id_fkey ( id, username, display_name, avatar_url )
    `
    )
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.room && row.inviter)
    .map((row) => {
      const room = row.room as unknown as {
        slug: string;
        title: string;
        active: boolean;
        scheduled_for: string | null;
      };
      const inviter = row.inviter as unknown as {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
      return {
        id: row.id,
        createdAt: row.created_at,
        room: {
          slug: room.slug,
          title: room.title,
          active: room.active,
          scheduledFor: room.scheduled_for,
        },
        inviter: {
          id: inviter.id,
          username: inviter.username,
          displayName: inviter.display_name,
          avatarUrl: inviter.avatar_url,
        },
      };
    });
}

export async function countPendingInvitations(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("room_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invitee_id", user.id)
    .eq("status", "pending");
  return count ?? 0;
}

/* ------------------------------------------------------------------
 * Actions — invocadas do client via form action / call direta
 * ------------------------------------------------------------------ */

const inviteSchema = z.object({
  slug: z.string().min(1),
  friendIds: z.array(z.uuid()).min(1).max(50),
});

export interface InviteFriendsResult {
  ok: boolean;
  invited: number;
  skipped: number;
  error?: string;
}

/**
 * Cria convites em lote pra amigos aceitos, dispara DM automática com o
 * link + envia Web Push (best-effort). Silenciosamente ignora amigos que
 * já têm convite pendente pra essa sala (idempotente via unique constraint).
 */
export async function inviteFriendsToRoom(
  slug: string,
  friendIds: string[],
  appUrl?: string
): Promise<InviteFriendsResult> {
  const parsed = inviteSchema.safeParse({ slug, friendIds });
  if (!parsed.success) {
    return { ok: false, invited: 0, skipped: 0, error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, invited: 0, skipped: 0, error: "Sessão expirada." };
  }

  // Verifica sala e host
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id, title, slug, active")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (!room || !room.active) {
    return { ok: false, invited: 0, skipped: 0, error: "Sala indisponível." };
  }
  if (room.host_id !== user.id) {
    return { ok: false, invited: 0, skipped: 0, error: "Só o host convida." };
  }

  // Perfil do inviter (pra mensagem/push)
  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const inviterName = inviterProfile?.display_name ?? "Alguém";

  // Insert com onConflict = ignora duplicatas
  const rows = parsed.data.friendIds.map((friendId) => ({
    room_id: room.id,
    inviter_id: user.id,
    invitee_id: friendId,
    status: "pending" as const,
  }));

  // Usa client normal — RLS já valida amizade + host.
  const { data: inserted, error: insertErr } = await supabase
    .from("room_invitations")
    .upsert(rows, {
      onConflict: "room_id,invitee_id",
      ignoreDuplicates: true,
    })
    .select("id, invitee_id");

  if (insertErr) {
    console.error("[inviteFriendsToRoom] insert falhou:", insertErr);
    return {
      ok: false,
      invited: 0,
      skipped: 0,
      error: "Não foi possível registrar os convites.",
    };
  }

  const invitedIds = (inserted ?? []).map((r) => r.invitee_id);
  const invitedCount = invitedIds.length;
  const skippedCount = parsed.data.friendIds.length - invitedCount;

  // Fire-and-forget: DM + push. Erros individuais são só logados.
  const base = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const roomUrl = `${base}/s/${room.slug}`;
  const roomTitle = room.title || "sala";

  await Promise.all(
    invitedIds.map(async (inviteeId) => {
      // DM automática
      try {
        await admin.from("direct_messages").insert({
          sender_id: user.id,
          recipient_id: inviteeId,
          content: `🎥 Te convidei pra entrar na sala "${roomTitle}": ${roomUrl}`,
        });
      } catch (err) {
        console.warn("[inviteFriendsToRoom] DM falhou:", err);
      }

      // Web Push (só se configurado)
      try {
        await sendPushToUser(inviteeId, {
          title: `${inviterName} te convidou pra uma sala`,
          body: roomTitle,
          url: `/convites`,
          tag: `invite-${room.id}`,
        });
      } catch (err) {
        console.warn("[inviteFriendsToRoom] push falhou:", err);
      }
    })
  );

  revalidatePath("/convites");
  return { ok: true, invited: invitedCount, skipped: skippedCount };
}

const respondSchema = z.object({
  id: z.uuid(),
  action: z.enum(["accept", "decline"]),
});

export interface RespondResult {
  ok: boolean;
  redirectSlug?: string;
  error?: string;
}

/**
 * Convidado aceita ou recusa. RLS garante que só o próprio invitee atualiza
 * suas rows.
 */
export async function respondToInvitation(
  id: string,
  action: "accept" | "decline"
): Promise<RespondResult> {
  const parsed = respondSchema.safeParse({ id, action });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const status = parsed.data.action === "accept" ? "accepted" : "declined";

  const { data: updated, error } = await supabase
    .from("room_invitations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("invitee_id", user.id)
    .select(
      `
      id,
      room:rooms!room_invitations_room_id_fkey ( slug, active )
    `
    )
    .maybeSingle();

  if (error) {
    console.error("[respondToInvitation]", error);
    return { ok: false, error: "Não foi possível responder." };
  }

  revalidatePath("/convites");

  if (status === "accepted" && updated) {
    const room = updated.room as unknown as { slug: string; active: boolean };
    if (room?.slug && room.active) {
      return { ok: true, redirectSlug: room.slug };
    }
    return { ok: true };
  }

  return { ok: true };
}
