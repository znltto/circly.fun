"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
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
});

export type OnboardingState = {
  error?: string;
} | null;

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username"),
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
    redirect("/entrar");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      username: parsed.data.username,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Este @ já está em uso." };
    }
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  redirect("/inicio");
}
