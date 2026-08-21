import { NextResponse } from "next/server";
import { listFriendships } from "@/lib/friends/queries";

/**
 * GET /api/friends/accepted
 *
 * Retorna amigos com friendship status = 'accepted', pronto pra usar no
 * seletor de "convidar amigos" do SuccessCard.
 */
export async function GET() {
  const all = await listFriendships();
  const accepted = all
    .filter((f) => f.status === "accepted")
    .map((f) => ({
      id: f.friend.id,
      username: f.friend.username,
      displayName: f.friend.display_name,
      avatarUrl: f.friend.avatar_url,
    }));
  return NextResponse.json(
    { friends: accepted },
    { headers: { "Cache-Control": "no-store" } }
  );
}
