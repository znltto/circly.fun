import "server-only";

/**
 * Transcrição via Whisper. Prefere Groq (10× mais barato) se
 * GROQ_API_KEY estiver setada; senão cai em OpenAI Whisper (usa a
 * mesma OPENAI_API_KEY do assistente CCO).
 *
 * Limite de 25 MB por request em ambos. Chame com áudio compacto
 * (Opus mono 32 kbps → ~14 MB/hora).
 */

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationSeconds?: number;
  provider: "groq" | "openai";
}

const GROQ_MODEL = "whisper-large-v3-turbo";
const OPENAI_MODEL = "whisper-1";

export async function transcribeAudio(
  audio: Blob,
  opts?: { language?: string; filename?: string }
): Promise<TranscriptionResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const filename = opts?.filename ?? "audio.webm";
  // Groq exige `File` (não Blob puro) — envelopa se necessário.
  const file =
    audio instanceof File
      ? audio
      : new File([audio], filename, { type: audio.type || "audio/webm" });

  if (groqKey) {
    return callGroq(file, groqKey, opts?.language);
  }
  if (openaiKey) {
    return callOpenAI(file, openaiKey, opts?.language);
  }
  throw new Error(
    "Nenhuma API key configurada. Setar GROQ_API_KEY (recomendado) ou OPENAI_API_KEY."
  );
}

async function callGroq(
  file: File,
  key: string,
  language?: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("model", GROQ_MODEL);
  form.append("response_format", "verbose_json");
  if (language) form.append("language", language);
  else form.append("language", "pt");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    text: string;
    language?: string;
    duration?: number;
  };
  return {
    text: data.text.trim(),
    language: data.language,
    durationSeconds: data.duration,
    provider: "groq",
  };
}

async function callOpenAI(
  file: File,
  key: string,
  language?: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("model", OPENAI_MODEL);
  form.append("response_format", "verbose_json");
  if (language) form.append("language", language);
  else form.append("language", "pt");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI Whisper ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    text: string;
    language?: string;
    duration?: number;
  };
  return {
    text: data.text.trim(),
    language: data.language,
    durationSeconds: data.duration,
    provider: "openai",
  };
}
