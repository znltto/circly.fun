import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/rooms/[slug]/audit?format=json|csv
 *
 * Log de ações da sala. Só o host lê. Formato CSV pra download direto.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id, title")
    .eq("slug", slug)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "Só o host." }, { status: 403 });
  }

  const { data: entries } = await admin
    .from("room_actions_log")
    .select(
      "id, action, actor_display_name, target_display_name, detail, created_at"
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = entries ?? [];

  if (format === "csv") {
    const header = "created_at,action,actor,target,detail\n";
    const body = rows
      .map((r) =>
        [
          r.created_at,
          r.action,
          csvEscape(r.actor_display_name ?? ""),
          csvEscape(r.target_display_name ?? ""),
          csvEscape(r.detail ?? ""),
        ].join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-audit.csv"`,
      },
    });
  }

  return NextResponse.json({ roomTitle: room.title, entries: rows });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
