"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const emailSchema = z.object({
  email: z.string().email("Email inválido."),
});

export type SendCodeState = {
  error?: string;
} | null;

export async function sendCode(
  _prev: SendCodeState,
  formData: FormData
): Promise<SendCodeState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  // Rate limit: 5 OTPs por email por hora
  const rl = checkRateLimit({
    key: `otp:${parsed.data.email.toLowerCase()}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rl.ok) {
    return {
      error: `Muitos códigos enviados. Tente novamente em ${Math.ceil(rl.resetInSeconds / 60)} min.`,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Mensagem genérica — não vazar se o email existe ou não.
    return { error: "Não foi possível enviar o código. Tente novamente." };
  }

  const params = new URLSearchParams({ email: parsed.data.email });
  redirect(`/verificar?${params.toString()}`);
}

/* ------------------------------------------------------------------
 * OAuth — Google + Discord via Supabase
 * ------------------------------------------------------------------ */

type OAuthProvider = "google" | "discord";

export type OAuthState = { error?: string } | null;

/**
 * Inicia o fluxo OAuth. O Supabase redireciona pro provedor,
 * que depois volta para `/api/auth/callback` com um `code` de sessão.
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthState> {
  const supabase = await createClient();

  const hdrs = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    hdrs.get("origin") ||
    `https://${hdrs.get("host") ?? "localhost:3000"}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback?next=/inicio`,
    },
  });

  if (error || !data?.url) {
    console.error("[oauth]", provider, error);
    return {
      error: `Não foi possível iniciar login com ${provider}. Verifique se o provedor está habilitado no Supabase.`,
    };
  }

  redirect(data.url);
}

