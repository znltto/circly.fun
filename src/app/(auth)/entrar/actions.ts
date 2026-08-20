"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
