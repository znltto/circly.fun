import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomService } from "@/lib/livekit/room-service";

/**
 * GET /api/cron/rooms-sync?token=<CRON_TOKEN>
 *
 * Sincroniza salas ativas com o LiveKit. LiveKit já encerra salas
 * vazias após ~5 min (default). Aqui a gente lê a lista de salas
 * ativas no LiveKit, compara com `rooms.active=true` no Postgres, e
 * marca como encerradas as que não existem mais lá.
 *
 * Agendamento: chamar a cada 5 min por cron externo (Vercel Cron,
 * UptimeRobot, GitHub Actions).
 *
 * Segurança: rota pública mas exige `?token=` que bate com CRON_TOKEN
 * (env var). Sem token, retorna 401. Se CRON_TOKEN não estiver
 * configurada, endpoint fica desligado (retorna 501).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const providedToken =
    url.searchParams.get("token") ??
    request.headers.get("x-cron-token") ??
    // Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` automaticamente
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : "") ??
    "";

  const expected = process.env.CRON_TOKEN || process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_TOKEN não configurada." },
      { status: 501 }
    );
  }

  if (providedToken !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Lista as salas ativas no LiveKit
  let liveNames: Set<string>;
  try {
    const svc = getRoomService();
    const liveRooms = await svc.listRooms();
    liveNames = new Set(liveRooms.map((r) => r.name));
  } catch (err) {
    console.error("[rooms-sync] falha ao listar LiveKit:", err);
    return NextResponse.json(
      { error: "Falha ao consultar LiveKit." },
      { status: 502 }
    );
  }

  // 2. Salas ativas no DB
  const { data: dbRooms } = await admin
    .from("rooms")
    .select("id, slug, created_at, expires_at")
    .eq("active", true);

  if (!dbRooms || dbRooms.length === 0) {
    return NextResponse.json({
      ok: true,
      checked: 0,
      closed: 0,
      liveActive: liveNames.size,
    });
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const toClose: string[] = [];

  for (const room of dbRooms) {
    // Grace de 2 min pra salas recém-criadas (pode não ter ninguém entrado)
    const createdMs = new Date(room.created_at).getTime();
    if (now - createdMs < 2 * 60 * 1000) continue;

    // Sala expirada por `expires_at`
    if (room.expires_at && new Date(room.expires_at).getTime() < now) {
      toClose.push(room.id);
      continue;
    }

    // Não existe no LiveKit → auto-close (LiveKit dropou por ficar vazia)
    if (!liveNames.has(room.slug)) {
      toClose.push(room.id);
    }
  }

  if (toClose.length > 0) {
    await admin
      .from("rooms")
      .update({ active: false, ended_at: nowIso })
      .in("id", toClose);

    // Também marca participantes ainda "ativos" no DB como saídos
    await admin
      .from("room_participants")
      .update({ left_at: nowIso })
      .in("room_id", toClose)
      .is("left_at", null);
  }

  return NextResponse.json({
    ok: true,
    checked: dbRooms.length,
    closed: toClose.length,
    liveActive: liveNames.size,
  });
}
