"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6,10}$/, "Código inválido."),
});

export type VerifyState = { error?: string; retryAfter?: number } | null;

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

  // Rate limit no nosso lado (mesmo do sendCode: 5/h por email)
  const rl = checkRateLimit({
    key: `otp:${parsed.data.email.toLowerCase()}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rl.ok) {
    return {
      error: "Muitos códigos enviados.",
      retryAfter: rl.resetInSeconds,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    // Supabase costuma responder mensagem específica quando bate no rate
    // limit interno dele (~60s). Tentamos extrair.
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("rate") ||
      msg.includes("only request") ||
      msg.includes("try again")
    ) {
      // Tempo estimado: extrai número da mensagem se houver, senão 60s.
      const match = error.message.match(/(\d+)\s*(second|s)/i);
      const seconds = match ? parseInt(match[1], 10) : 60;
      return {
        error: "Aguarde antes de pedir outro código.",
        retryAfter: seconds,
      };
    }
    return { error: "Não foi possível reenviar. Tente em instantes." };
  }

  return null;
}
