"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Nome de exibição obrigatório.")
    .max(40, "Máximo 40 caracteres."),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres.")
    .max(24, "Máximo 24 caracteres.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _."),
  status_message: z
    .string()
    .trim()
    .max(60, "Máximo 60 caracteres.")
    .optional(),
  status_emoji: z.string().trim().max(8).optional(),
});

export type UpdateProfileState = {
  error?: string;
  success?: boolean;
} | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username"),
    status_message: formData.get("status_message") ?? undefined,
    status_emoji: formData.get("status_emoji") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada." };
  }

  const statusMessage = parsed.data.status_message?.trim() || null;
  const statusEmoji = parsed.data.status_emoji?.trim() || null;
  const statusChanged = statusMessage !== null || statusEmoji !== null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      username: parsed.data.username,
      status_message: statusMessage,
      status_emoji: statusEmoji,
      status_updated_at: statusChanged ? new Date().toISOString() : null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Este @ já está em uso." };
    }
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/conta");
  revalidatePath("/inicio");
  revalidatePath("/pessoas");
  return { success: true };
}

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    throw new Error("Não foi possível apagar a conta.");
  }

  // Limpa a sessão local — o usuário já não existe mais em auth.users.
  await supabase.auth.signOut();

  redirect("/");
}
