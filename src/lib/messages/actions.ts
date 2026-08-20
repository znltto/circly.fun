"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTACHMENT_TYPES = ["image"] as const;

const sendMessageSchema = z.object({
  roomSlug: z.string().min(1),
  content: z.string().trim().max(500).default(""),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(ATTACHMENT_TYPES).optional(),
});

export interface SentMessage {
  id: string;
  room_id: string;
  sender_profile_id: string | null;
  guest_name: string | null;
  content: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
}

export type SendRoomMessageResult =
  | { ok: true; message: SentMessage }
  | { ok: false; error: string };

/**
 * Envia uma mensagem persistida na tabela `messages`. Requer usuário
 * autenticado — mensagens de guests continuam vivas apenas em broadcast
 * (ver comentário no InRoomChat).
 *
 * Regras:
 * - `content` pode ser vazio SE tiver anexo (imagem-only).
 * - Anexo é opcional; se presente, `attachment_url` + `attachment_type`
 *   devem vir juntos.
 * - O usuário precisa ser participante ativo da sala.
 */
export async function sendRoomMessage(input: {
  roomSlug: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: (typeof ATTACHMENT_TYPES)[number];
}): Promise<SendRoomMessageResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Mensagem inválida." };
  }

  const { roomSlug, content, attachmentUrl, attachmentType } = parsed.data;

  if (!content && !attachmentUrl) {
    return { ok: false, error: "Escreva algo ou anexe uma imagem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Autoriza + descobre room_id via admin (evita depender de RLS em rooms).
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id, active")
    .eq("slug", roomSlug)
    .maybeSingle();

  if (!room || !room.active) {
    return { ok: false, error: "Sala não está ativa." };
  }

  if (room.host_id !== user.id) {
    const { data: participant } = await admin
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("profile_id", user.id)
      .is("left_at", null)
      .maybeSingle();

    if (!participant) {
      return { ok: false, error: "Você não está na sala." };
    }
  }

  // Insert via cliente com sessão do usuário: policy `messages_insert_self`
  // exige sender_profile_id = auth.uid().
  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      room_id: room.id,
      sender_profile_id: user.id,
      content: content || "",
      attachment_url: attachmentUrl ?? null,
      attachment_type: attachmentUrl ? (attachmentType ?? "image") : null,
    })
    .select("id, room_id, sender_profile_id, guest_name, content, attachment_url, attachment_type, created_at")
    .single();

  if (error || !inserted) {
    console.error("[sendRoomMessage] insert falhou:", error);
    return { ok: false, error: "Não foi possível enviar." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    ok: true,
    message: {
      ...inserted,
      sender_username: profile?.username ?? null,
      sender_display_name: profile?.display_name ?? null,
      sender_avatar_url: profile?.avatar_url ?? null,
    },
  };
}

const toggleReactionSchema = z.object({
  messageId: z.uuid(),
  emoji: z.string().min(1).max(8),
});

export type ToggleReactionResult =
  | { ok: true; state: "added" | "removed" }
  | { ok: false; error: string };

/**
 * Toggle da reação: se o par (message_id, reactor_id, emoji) já existe,
 * remove; senão, adiciona. Só funciona para usuários autenticados.
 */
export async function toggleMessageReaction(input: {
  messageId: string;
  emoji: string;
}): Promise<ToggleReactionResult> {
  const parsed = toggleReactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Reação inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para reagir." };

  const { messageId, emoji } = parsed.data;

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("reactor_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) {
      console.error("[toggleMessageReaction] delete falhou:", error);
      return { ok: false, error: "Não foi possível remover reação." };
    }
    return { ok: true, state: "removed" };
  }

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    reactor_id: user.id,
    emoji,
  });

  if (error) {
    // Se caiu na unique constraint (race), trata como sucesso silencioso.
    if (error.code === "23505") return { ok: true, state: "added" };
    console.error("[toggleMessageReaction] insert falhou:", error);
    return { ok: false, error: "Não foi possível reagir." };
  }

  return { ok: true, state: "added" };
}
