import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatCompletion,
  CCO_SYSTEM_PROMPT,
  type ChatMessage,
} from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

// Preço gpt-4o-mini (dólares por 1M tokens, atualizar se OpenAI mudar).
// Convertido para micro-dólares por token (1 USD = 1_000_000 μUSD).
const COST_INPUT_MICRO_PER_TOKEN = 0.15;   // = $0.15 / 1M tokens
const COST_OUTPUT_MICRO_PER_TOKEN = 0.60;  // = $0.60 / 1M tokens

/**
 * POST /api/chat
 *
 * - Rate limit: 20 msgs/h por usuário logado, 6/h por IP para anônimo.
 * - Máximo 20 mensagens de histórico por request (limita context).
 * - Grava log em ai_chat_logs para o painel admin ver uso e custos.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = getClientIp(request.headers);
  const key = user ? `chat:${user.id}` : `chat:ip:${ip}`;
  const limit = user ? 20 : 6;

  const rl = checkRateLimit({ key, limit, windowSeconds: 3600 });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Muitas mensagens. Tente em ${Math.ceil(rl.resetInSeconds / 60)} min.`,
      },
      { status: 429 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagens inválidas." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Assistente indisponível no momento." },
      { status: 501 }
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: CCO_SYSTEM_PROMPT },
    ...parsed.data.messages,
  ];

  const lastUserMessage =
    [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ??
    null;

  try {
    const result = await chatCompletion(messages, {
      maxTokens: 400,
      temperature: 0.7,
    });

    // Log best-effort — falha na gravação não deve derrubar a resposta.
    void logChatTurn({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      ip,
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
      userMessage: lastUserMessage,
      assistantMessage: result.text,
    });

    return NextResponse.json({ text: result.text });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json(
      { error: "Não consegui responder agora. Tenta de novo em instantes." },
      { status: 502 }
    );
  }
}

/* ------------------------------------------------------------------
 *  Log helper — grava a troca em ai_chat_logs via service role
 * ------------------------------------------------------------------ */

interface LogInput {
  userId: string | null;
  userEmail: string | null;
  ip: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  userMessage: string | null;
  assistantMessage: string | null;
}

async function logChatTurn(input: LogInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const costMicroDollars = Math.round(
      input.promptTokens * COST_INPUT_MICRO_PER_TOKEN +
        input.completionTokens * COST_OUTPUT_MICRO_PER_TOKEN
    );
    await admin.from("ai_chat_logs").insert({
      user_id: input.userId,
      user_email: input.userEmail,
      ip: input.ip,
      model: "gpt-4o-mini",
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: input.totalTokens,
      cost_micro_dollars: costMicroDollars,
      user_message: input.userMessage,
      assistant_message: input.assistantMessage,
    });
  } catch (err) {
    console.warn("[chat log] falhou:", err);
  }
}
