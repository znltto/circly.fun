import { NextResponse } from "next/server";
import { countPendingInvitations } from "@/lib/rooms/invitations";

/**
 * GET /api/invitations/count
 *
 * Retorna quantos convites de sala estão pendentes pro usuário atual.
 * Usado pra badge no menu.
 */
export async function GET() {
  const count = await countPendingInvitations();
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } }
  );
}
