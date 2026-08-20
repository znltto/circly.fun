import { NextResponse } from "next/server";

/**
 * Health check simples pra monitoramento externo (UptimeRobot, StatusCake).
 * Retorna 200 + timestamp + versão. Não toca o banco pra evitar custo.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "circly",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  });
}
