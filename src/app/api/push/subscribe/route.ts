import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushEnabled } from "@/lib/push/server";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /api/push/subscribe
 *
 * Registra (ou atualiza) a PushSubscription do usuário atual. Endpoint é
 * chave natural — se já existir, sobrescreve keys.
 */
export async function POST(request: Request) {
  if (!isPushEnabled()) {
    return NextResponse.json(
      { error: "Push notifications não configuradas neste servidor." },
      { status: 501 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  // Upsert por endpoint (unique)
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    profile_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
