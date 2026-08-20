import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback para magic links (caso o email vier com link em vez de código).
 * O fluxo principal do Circly é OTP, mas o Supabase envia ambos por padrão.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/inicio";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));
}
