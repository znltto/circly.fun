import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { transcribeAudio } from "@/lib/transcription";
import { analyzeTranscript } from "@/lib/recording-analysis";

const RECORDINGS_BUCKET = "recordings";

// Processamento pode demorar; permitir até 5 minutos.
export const maxDuration = 300;

/**
 * POST /api/rooms/[slug]/recording/[id]/process
 *
 * Baixa o áudio-only da gravação, transcreve com Whisper e analisa com
 * gpt-4o-mini pra produzir summary + topics + decisions + action items.
 * Salva tudo em room_recordings. Idempotente — se já foi processada,
 * retorna a análise existente.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Apenas admins." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("room_recordings")
    .select(
      "id, room_id, audio_path, processing_status, transcript, summary, rooms!inner(slug)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!rec) {
    return NextResponse.json(
      { error: "Gravação não encontrada." },
      { status: 404 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomSlug = (rec as any).rooms?.slug as string | undefined;
  if (roomSlug !== slug) {
    return NextResponse.json({ error: "Slug divergente." }, { status: 400 });
  }

  // Idempotência
  if (rec.processing_status === "complete") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  if (!rec.audio_path) {
    await admin
      .from("room_recordings")
      .update({
        processing_status: "skipped",
        processing_error: "Sem audio_path — gravação não tinha stream de áudio.",
      })
      .eq("id", id);
    return NextResponse.json(
      { error: "Sem áudio para transcrever." },
      { status: 400 }
    );
  }

  // Marca como processando
  await admin
    .from("room_recordings")
    .update({ processing_status: "processing" })
    .eq("id", id);

  try {
    // 1. Baixa o áudio do Storage
    const { data: audioBlob, error: downloadError } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .download(rec.audio_path);

    if (downloadError || !audioBlob) {
      throw new Error(
        `Falha ao baixar áudio: ${downloadError?.message ?? "sem body"}`
      );
    }

    // 2. Transcreve
    const transcription = await transcribeAudio(audioBlob, {
      language: "pt",
      filename: "audio.webm",
    });

    // 3. Analisa
    let analysis;
    try {
      analysis = await analyzeTranscript(transcription.text);
    } catch (err) {
      console.error("[process] analyze falhou, salvando só transcript:", err);
      analysis = {
        summary: transcription.text.slice(0, 500),
        topics: [],
        decisions: [],
        actionItems: [],
        participants: [],
      };
    }

    // 4. Salva no banco
    await admin
      .from("room_recordings")
      .update({
        processing_status: "complete",
        processed_at: new Date().toISOString(),
        transcript: transcription.text,
        language: transcription.language ?? "pt",
        summary: analysis.summary,
        topics_json: analysis.topics,
        decisions_json: analysis.decisions,
        action_items_json: analysis.actionItems,
        participants_json: analysis.participants,
      })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      provider: transcription.provider,
      transcriptLength: transcription.text.length,
      topics: analysis.topics.length,
      actionItems: analysis.actionItems.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process] falhou:", err);
    await admin
      .from("room_recordings")
      .update({
        processing_status: "failed",
        processing_error: message.slice(0, 500),
      })
      .eq("id", id);
    return NextResponse.json(
      { error: "Falha ao processar. Ver logs do servidor." },
      { status: 502 }
    );
  }
}
