"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6,10}$/, "Código inválido."),
});

export type VerifyState = { error?: string } | null;

export async function verifyCode(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return { error: "Código inválido ou expirado." };
  }

  redirect("/inicio");
}

const resendSchema = z.object({ email: z.string().email() });

export async function resendCode(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Email inválido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });

  if (error) return { error: "Não foi possível reenviar. Tente em instantes." };
  return null;
}
