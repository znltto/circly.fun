import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DownloadRecordingButton } from "./download-button";
import type { RecordingStatus } from "@/types/database";

export const metadata = { title: "Gravações" };

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const STATUS_LABEL: Record<RecordingStatus, string> = {
  starting: "iniciando",
  active: "gravando",
  complete: "pronta",
  failed: "falhou",
  aborted: "cancelada",
};

const STATUS_CLASS: Record<RecordingStatus, string> = {
  starting: "text-text-muted",
  active: "text-danger",
  complete: "text-success",
  failed: "text-danger",
  aborted: "text-text-muted",
};

export default async function GravacoesPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Confirma que a sala existe e o user tem algum vínculo (host ou participante).
  // A query em room_recordings já é filtrada por RLS, mas queremos mostrar
  // um 404 gentil se nem existe.
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, title, host_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!room) notFound();

  const isHost = room.host_id === user.id;
  if (!isHost) {
    const { data: participation } = await admin
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!participation) notFound();
  }

  // Lê as gravações via client autenticado — RLS garante filtro correto.
  const { data: recordings } = await supabase
    .from("room_recordings")
    .select(
      "id, status, storage_path, size_bytes, duration_seconds, started_at, ended_at, expires_at"
    )
    .eq("room_id", room.id)
    .order("started_at", { ascending: false });

  const list = recordings ?? [];

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          /s/{slug}
        </p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">
          Gravações desta sala
        </h1>
        <p className="mt-2 text-sm text-text-secondary text-pretty">
          {room.title}. As gravações ficam guardadas por 30 dias e são
          apagadas automaticamente depois disso.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            mascot="waiting"
            title="Nenhuma gravação ainda."
            description={
              isHost
                ? "Quando você iniciar uma gravação dentro da sala, ela vai aparecer aqui."
                : "Quando o host gravar uma reunião, ela vai aparecer aqui."
            }
            action={
              <Link href="/inicio">
                <Button variant="secondary">Voltar ao início</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                    <Video className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">
                      {formatDate(r.started_at)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      <span>Duração: {formatDuration(r.duration_seconds)}</span>
                      <span>Tamanho: {formatBytes(r.size_bytes)}</span>
                      <span
                        className={
                          STATUS_CLASS[r.status as RecordingStatus] ??
                          "text-text-muted"
                        }
                      >
                        {STATUS_LABEL[r.status as RecordingStatus] ?? r.status}
                      </span>
                    </p>
                  </div>
                </div>

                {r.status === "complete" && r.storage_path ? (
                  <DownloadRecordingButton slug={slug} recordingId={r.id} />
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs text-text-muted"
                    aria-hidden
                  >
                    <Download className="h-3.5 w-3.5" />
                    indisponível
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
