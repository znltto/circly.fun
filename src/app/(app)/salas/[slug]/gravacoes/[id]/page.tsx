import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertTriangle,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { DownloadRecordingButton } from "../download-button";
import { RecordingDetail } from "./recording-detail";
import type { RecordingProcessingStatus } from "@/types/database";

export const metadata = { title: "Análise da gravação" };

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default async function GravacaoDetalhePage({ params }: PageProps) {
  const { slug, id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

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

  const { data: rec } = await supabase
    .from("room_recordings")
    .select("*")
    .eq("id", id)
    .eq("room_id", room.id)
    .maybeSingle();

  if (!rec) notFound();

  const proc = (rec.processing_status ??
    "pending") as RecordingProcessingStatus;

  return (
    <section className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <Link
        href={`/salas/${slug}/gravacoes`}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Gravações da sala
      </Link>

      <header className="mt-3 mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          /s/{slug}
        </p>
        <h1 className="mt-2 font-serif text-2xl md:text-3xl">
          {room.title}
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-text-secondary">
          <span>{formatDate(rec.started_at)}</span>
          <span>·</span>
          <span>{formatDuration(rec.duration_seconds)}</span>
          {rec.language && (
            <>
              <span>·</span>
              <span className="uppercase">{rec.language}</span>
            </>
          )}
        </p>
      </header>

      {proc === "pending" && (
        <StatusCard
          icon={<Loader2 className="h-4 w-4 animate-spin" />}
          tone="brand"
          title="Aguardando análise."
          body="A gravação foi salva. A IA vai transcrever e resumir em breve — pode levar alguns minutos após o fim da reunião."
        />
      )}

      {proc === "processing" && (
        <StatusCard
          icon={<Sparkles className="h-4 w-4 animate-pulse" />}
          tone="brand"
          title="Transcrevendo agora."
          body="O Whisper está processando o áudio. Volte daqui a pouco — a página vai mostrar o resumo, tópicos, decisões e action items."
        />
      )}

      {proc === "failed" && (
        <StatusCard
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
          title="A análise IA falhou."
          body={
            rec.processing_error ??
            "Não foi possível transcrever/analisar essa gravação. O vídeo ainda está disponível."
          }
        />
      )}

      {proc === "skipped" && (
        <StatusCard
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="warning"
          title="Sem áudio para transcrever."
          body="Essa gravação não capturou áudio (o compartilhamento de tela pode ter sido sem som). O vídeo continua disponível pra download."
        />
      )}

      {proc === "complete" && (
        <RecordingDetail
          summary={rec.summary ?? ""}
          topics={coerceArray<string>(rec.topics_json)}
          decisions={coerceArray<string>(rec.decisions_json)}
          actionItems={coerceArray<{
            task: string;
            owner?: string;
            when?: string;
          }>(rec.action_items_json)}
          participants={coerceArray<string>(rec.participants_json)}
          transcript={rec.transcript ?? ""}
        />
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {rec.status === "complete" && rec.storage_path ? (
          <DownloadRecordingButton slug={slug} recordingId={rec.id} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-text-muted">
            <Download className="h-3.5 w-3.5" />
            vídeo indisponível
          </span>
        )}
        <Link href={`/salas/${slug}/gravacoes`}>
          <Button variant="ghost" size="sm">
            Voltar à lista
          </Button>
        </Link>
      </div>
    </section>
  );
}

function StatusCard({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "brand" | "danger" | "warning";
}) {
  const toneClass =
    tone === "brand"
      ? "border-brand/40 bg-brand/5 text-brand"
      : tone === "danger"
        ? "border-danger/40 bg-danger/5 text-danger"
        : "border-warning/40 bg-warning/5 text-warning";
  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-sm text-text-secondary">{body}</p>
    </div>
  );
}

function coerceArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}
