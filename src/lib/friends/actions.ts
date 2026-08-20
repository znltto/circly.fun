"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.uuid();

export type ActionResult = { error?: string } | undefined;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return { supabase, user };
}

export async function sendFriendRequest(
  targetProfileId: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(targetProfileId);
  if (!parsed.success) return { error: "ID inválido." };

  try {
    const { supabase, user } = await requireUser();
    if (parsed.data === user.id) {
      return { error: "Você não pode adicionar a si mesmo." };
    }

    // Se já existe qualquer relação nos dois sentidos, tratamos de acordo.
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data}),and(requester_id.eq.${parsed.data},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") return { error: "Vocês já são amigos." };
      if (existing.status === "blocked") return { error: "Não é possível enviar." };
      if (existing.requester_id === user.id) {
        return { error: "Solicitação já enviada." };
      }
      // Existe uma solicitação pendente vindo do outro lado — aceitar em vez de duplicar.
      return acceptFriendRequest(existing.id);
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: parsed.data,
      status: "pending",
    });

    if (error) return { error: "Não foi possível enviar a solicitação." };

    revalidatePath("/pessoas");
    revalidatePath("/inicio");
    return undefined;
  } catch {
    return { error: "Erro inesperado." };
  }
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "ID inválido." };

  try {
    const { supabase, user } = await requireUser();

    // Só o addressee pode aceitar.
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", parsed.data)
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error) return { error: "Não foi possível aceitar." };

    revalidatePath("/pessoas");
    revalidatePath("/inicio");
    return undefined;
  } catch {
    return { error: "Erro inesperado." };
  }
}

export async function declineFriendRequest(
  friendshipId: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "ID inválido." };

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", parsed.data)
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error) return { error: "Não foi possível recusar." };

    revalidatePath("/pessoas");
    return undefined;
  } catch {
    return { error: "Erro inesperado." };
  }
}

export async function removeFriend(
  friendshipId: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "ID inválido." };

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", parsed.data)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) return { error: "Não foi possível remover." };

    revalidatePath("/pessoas");
    revalidatePath("/inicio");
    return undefined;
  } catch {
    return { error: "Erro inesperado." };
  }
}

export async function blockUser(targetProfileId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(targetProfileId);
  if (!parsed.success) return { error: "ID inválido." };

  try {
    const { supabase, user } = await requireUser();
    if (parsed.data === user.id) return { error: "Você não pode bloquear a si mesmo." };

    // Remove qualquer relação prévia e cria uma linha de bloqueio.
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data}),and(requester_id.eq.${parsed.data},addressee_id.eq.${user.id})`
      );

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: parsed.data,
      status: "blocked",
    });

    if (error) return { error: "Não foi possível bloquear." };

    revalidatePath("/pessoas");
    revalidatePath("/inicio");
    return undefined;
  } catch {
    return { error: "Erro inesperado." };
  }
}
