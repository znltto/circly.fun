"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const sendSchema = z.object({
  recipientId: z.uuid(),
  content: z.string().trim().min(1).max(2000),
});

export type SendState = { error?: string } | undefined;

export async function sendDirectMessage(
  recipientId: string,
  content: string
): Promise<SendState> {
  const parsed = sendSchema.safeParse({ recipientId, content });
  if (!parsed.success) return { error: "Mensagem inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("direct_messages").insert({
    sender_id: user.id,
    recipient_id: parsed.data.recipientId,
    content: parsed.data.content,
  });

  if (error) {
    console.error("[sendDirectMessage] falhou:", error);
    return { error: "Não foi possível enviar." };
  }

  revalidatePath("/mensagens");
  revalidatePath(`/mensagens/[username]`, "page");
  return undefined;
}

/**
 * Marca todas as mensagens recebidas de um amigo como lidas.
 */
export async function markThreadRead(friendId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("sender_id", friendId)
    .is("read_at", null);

  revalidatePath("/mensagens");
}
