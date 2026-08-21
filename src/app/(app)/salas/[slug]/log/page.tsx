import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Log da sala" };

const ACTION_LABEL: Record<string, string> = {
  join: "Entrou",
  leave: "Saiu",
  "mute-audio": "Silenciou microfone",
  "mute-video": "Desligou câmera",
  "mute-screen": "Parou compartilhamento",
  kick: "Removeu",
  lock: "Trancou a sala",
  unlock: "Destrancou a sala",
  "lobby-on": "Ativou sala de espera",
  "lobby-off": "Desativou sala de espera",
  "lobby-admit": "Aprovou entrada",
  "lobby-deny": "Recusou entrada",
  "host-transfer": "Passou controle",
  "recording-start": "Iniciou gravação",
  "recording-stop": "Encerrou gravação",
};

export default async function RoomAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, title, host_id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) notFound();
  if (room.host_id !== user.id) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-text-secondary">
          O log de ações é visível só pelo host da sala.
        </p>
      </section>
    );
  }

  const { data: entries } = await admin
    .from("room_actions_log")
    .select(
      "id, action, actor_display_name, target_display_name, detail, created_at"
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = entries ?? [];

  return (
    <section className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/s/${slug}`}
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar à sala
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl">Log da sala</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {room.title} · <span className="font-mono text-xs">/s/{slug}</span>
          </p>
        </div>
        <a
          href={`/api/rooms/${slug}/audit?format=csv`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
          Nenhuma ação registrada ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-border bg-surface-raised/50 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Autor</th>
                <th className="px-4 py-3 font-medium">Alvo</th>
                <th className="px-4 py-3 font-medium">Detalhe</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border/60 hover:bg-surface-hover/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-text-muted">
                    {new Date(r.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-primary">
                    {ACTION_LABEL[r.action] ?? r.action}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {r.actor_display_name ?? (
                      <span className="italic text-text-muted">sistema</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {r.target_display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {r.detail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
