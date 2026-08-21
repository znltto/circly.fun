import "server-only";
import { chatCompletion, type ChatMessage } from "./openai";

export interface RecordingAnalysis {
  summary: string;
  topics: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    owner?: string;
    when?: string;
  }>;
  participants: string[];
}

const SYSTEM = `Você é um assistente que estrutura reuniões do Circly em resumos objetivos.

Recebe um transcript bruto de uma videochamada em português e devolve um JSON válido com:
- summary: string com 2-4 frases resumindo o que foi decidido/discutido
- topics: array de 3-8 tópicos principais (bullets curtos, no máximo 12 palavras cada)
- decisions: array de decisões explícitas tomadas (frases começando com verbo, ex "Adotar X", "Adiar Y")
- actionItems: array de tarefas com formato { task, owner?, when? }. task é o TODO no imperativo. owner é o nome mencionado se identificável, senão omitir. when é o prazo mencionado se citado, senão omitir.
- participants: array com os nomes que apareceram como falando ou sendo mencionados

Regras:
- SEMPRE português brasileiro, curto e direto
- Nunca invente decisão ou owner que não estejam no transcript
- Se o transcript for muito curto (menos de 100 palavras), retorne summary com 1 frase e arrays vazios
- Devolva APENAS o JSON, sem markdown, sem comentários
- Ordene tópicos e decisões pela ordem que apareceram no transcript`;

export async function analyzeTranscript(
  transcript: string
): Promise<RecordingAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Transcript da reunião:\n\n${transcript}\n\nAgora devolva o JSON estruturado.`,
    },
  ];

  const { text } = await chatCompletion(messages, {
    maxTokens: 1500,
    temperature: 0.3,
  });

  // Tenta parsear direto, e se falhar tenta extrair JSON do texto
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as RecordingAnalysis;
    return {
      summary: parsed.summary ?? "",
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.filter((a) => a && typeof a.task === "string")
        : [],
      participants: Array.isArray(parsed.participants)
        ? parsed.participants
        : [],
    };
  } catch (err) {
    console.error("[analyzeTranscript] JSON parse falhou:", err, cleaned);
    // Fallback: retorna summary bruto e arrays vazios
    return {
      summary: text.slice(0, 500),
      topics: [],
      decisions: [],
      actionItems: [],
      participants: [],
    };
  }
}
