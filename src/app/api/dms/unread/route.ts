import { NextResponse } from "next/server";
import { countTotalUnread } from "@/lib/dms/queries";

/**
 * GET /api/dms/unread
 *
 * Retorna o total de DMs não lidas do usuário atual. Usado por AppShell pra
 * mostrar badge no menu (Mensagens). Idempotente + rápido — RLS garante que
 * só conta as próprias.
 */
export async function GET() {
  const count = await countTotalUnread();
  return NextResponse.json({ count }, {
    headers: {
      // Sem cache — número muda em tempo real conforme mensagens chegam.
      "Cache-Control": "no-store",
    },
  });
}
