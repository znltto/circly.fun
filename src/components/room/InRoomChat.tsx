"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  senderName: string;
  senderIdentity: string;
  content: string;
  createdAt: number;
  fromSelf: boolean;
}

interface InRoomChatProps {
  roomSlug: string;
  senderIdentity: string;
  senderName: string;
  onIncoming?: () => void;
}

/**
 * Chat leve dentro da sala. Usa um canal broadcast do Supabase Realtime
 * chaveado pelo slug — não persiste no banco no MVP para simplificar.
 * Fase 9 pode persistir na tabela `messages` se quiser histórico.
 */
export function InRoomChat({
  roomSlug,
  senderIdentity,
  senderName,
  onIncoming,
}: InRoomChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`room-chat:${roomSlug}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        "broadcast",
        { event: "message" },
        (payload: {
          payload: {
            id: string;
            senderIdentity: string;
            senderName: string;
            content: string;
            createdAt: number;
          };
        }) => {
          const m = payload.payload;
          setMessages((prev) => [
            ...prev,
            { ...m, fromSelf: m.senderIdentity === senderIdentity },
          ]);
          onIncoming?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [roomSlug, senderIdentity, onIncoming]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || content.length > 500) return;

    const msg = {
      id: crypto.randomUUID(),
      senderIdentity,
      senderName,
      content,
      createdAt: Date.now(),
    };

    // Optimistic
    setMessages((prev) => [...prev, { ...msg, fromSelf: true }]);
    setDraft("");

    await channelRef.current?.send({
      type: "broadcast",
      event: "message",
      payload: msg,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-text-muted">
            Nenhuma mensagem por aqui ainda.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex flex-col gap-0.5",
              m.fromSelf ? "items-end" : "items-start"
            )}
          >
            {!m.fromSelf && (
              <span className="px-1 text-[10px] font-medium text-text-muted">
                {m.senderName}
              </span>
            )}
            <span
              className={cn(
                "max-w-[85%] rounded-md px-3 py-1.5 text-sm text-pretty",
                m.fromSelf
                  ? "bg-brand text-brand-fg"
                  : "bg-surface-raised text-text-primary"
              )}
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Mensagem"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-focus focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Enviar"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
