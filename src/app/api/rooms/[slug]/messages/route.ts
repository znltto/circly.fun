import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRoomMessages, listReactionsForMessages } from "@/lib/messages/queries";

/**
 * GET /api/rooms/[slug]/messages?identity=<livekit_identity>
 *
 * Retorna as últimas 50 mensagens da sala + as reações associadas.
 * Funciona para usuários autenticados (checagem por profile_id) e para
 * guests (checagem por livekit_identity — o mesmo emitido no token).
 *
 * O `identity` é passado como query param porque guests não têm sessão
 * do Supabase; ainda assim, precisamos garantir que só entregamos histórico
 * pra quem realmente está na sala.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const identity = url.searchParams.get("identity") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const messages = await listRoomMessages(slug, user?.id ?? null, identity, 50);
  const reactions = await listReactionsForMessages(messages.map((m) => m.id));

  return NextResponse.json({ messages, reactions });
}
