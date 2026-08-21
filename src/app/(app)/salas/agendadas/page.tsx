import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Reuniões agendadas" };

export default async function AgendadasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const nowIso = new Date().toISOString();

  const { data: upcoming } = await supabase
    .from("rooms")
    .select(
      "slug, title, scheduled_for, duration_minutes, visibility, max_participants"
    )
    .eq("host_id", user.id)
    .eq("active", true)
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  const { data: past } = await supabase
    .from("rooms")
    .select("slug, title, scheduled_for, duration_minutes")
    .eq("host_id", user.id)
    .eq("active", true)
    .not("scheduled_for", "is", null)
    .lt("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: false })
    .limit(20);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">
            Reuniões agendadas
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Suas próximas salas com horário marcado. Sem agenda, sem push (por
            enquanto).
          </p>
        </div>
        <Link href="/salas/nova">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Agendar sala</Button>
        </Link>
      </header>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Próximas
        </h2>
        <div className="mt-3 rounded-lg border border-border bg-surface">
          {!upcoming || upcoming.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">
              Nada agendado. Crie uma sala com &ldquo;Começa em&rdquo; para aparecer aqui.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.map((room) => (
                <RoomRow key={room.slug} room={room} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {past && past.length > 0 && (
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Passadas (ativas)
          </h2>
          <div className="mt-3 rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border/60">
              {past.map((room) => (
                <RoomRow key={room.slug} room={room} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function RoomRow({
  room,
}: {
  room: {
    slug: string;
    title: string;
    scheduled_for: string | null;
    duration_minutes: number | null;
  };
}) {
  const startsAt = room.scheduled_for ? new Date(room.scheduled_for) : null;
  const now = Date.now();
  const diffMs = startsAt ? startsAt.getTime() - now : 0;
  const label =
    startsAt?.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) ?? "—";
  const rel = relativeLabel(diffMs);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-text-secondary">
        <Calendar className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{room.title}</p>
        <p className="text-xs text-text-muted">
          {label}
          {room.duration_minutes ? ` · ${room.duration_minutes} min` : ""}
          {rel ? ` · ${rel}` : ""}
        </p>
      </div>
      <Link
        href={`/s/${room.slug}`}
        className="ml-auto"
      >
        <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
          Abrir
        </Button>
      </Link>
    </li>
  );
}

function relativeLabel(diffMs: number): string {
  if (Math.abs(diffMs) < 60_000) return "agora";
  const past = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60_000);
  if (mins < 60)
    return past ? `há ${mins} min` : `em ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24)
    return past ? `há ${hours}h` : `em ${hours}h`;
  const days = Math.round(hours / 24);
  return past ? `há ${days}d` : `em ${days}d`;
}
