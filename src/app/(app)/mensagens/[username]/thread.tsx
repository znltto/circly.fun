"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/Avatar";
import { sendDirectMessage, markThreadRead } from "@/lib/dms/actions";
import { cn } from "@/lib/utils";
import type { DmMessage, DmProfile } from "@/lib/dms/queries";

interface DmThreadProps {
  friend: DmProfile;
  initialMessages: DmMessage[];
}

export function DmThread({ friend, initialMessages }: DmThreadProps) {
  const [messages, setMessages] = React.useState<DmMessage[]>(initialMessages);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);

  const selfIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      selfIdRef.current = data.user?.id ?? null;
    });

    // Realtime: escuta INSERTs em direct_messages e filtra por par
    const channel = supabase
      .channel(`dm:${friend.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const m = payload.new as DmMessage;
          const selfId = selfIdRef.current;
          if (!selfId) return;
          const belongs =
            (m.sender_id === selfId && m.recipient_id === friend.id) ||
            (m.sender_id === friend.id && m.recipient_id === selfId);
          if (!belongs) return;
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === m.id)) return prev;
            return [...prev, { ...m, from_self: m.sender_id === selfId }];
          });
          if (m.sender_id === friend.id) {
            // recebida do amigo: marca como lida
            void markThreadRead(friend.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [friend.id]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || content.length > 2000) return;

    setSending(true);
    setError(null);
    setDraft("");

    // optimistic
    const temp: DmMessage = {
      id: `temp-${crypto.randomUUID()}`,
      sender_id: selfIdRef.current ?? "",
      recipient_id: friend.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      from_self: true,
    };
    setMessages((prev) => [...prev, temp]);

    const result = await sendDirectMessage(friend.id, content);

    if (result?.error) {
      setError(result.error);
      // remove o optimistic
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setDraft(content);
    }
    setSending(false);
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col md:h-screen">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
        <Link
          href="/mensagens"
          className="rounded-sm p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary md:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <UserAvatar
          name={friend.display_name}
          src={friend.avatar_url}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text-primary">
            {friend.display_name}
          </p>
          <p className="truncate font-mono text-xs text-text-muted">
            @{friend.username}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-6"
      >
        {messages.length === 0 && (
          <div className="mt-16 text-center text-sm text-text-muted">
            Sem mensagens ainda. Mande a primeira.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex flex-col gap-0.5",
              m.from_self ? "items-end" : "items-start"
            )}
          >
            <span
              className={cn(
                "max-w-[85%] rounded-md px-3.5 py-2 text-sm text-pretty",
                m.from_self
                  ? "bg-brand text-brand-fg"
                  : "bg-surface-raised text-text-primary"
              )}
            >
              {m.content}
            </span>
            <span className="px-1 font-mono text-[10px] text-text-muted">
              {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border p-3 md:p-4"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Mensagem para ${friend.display_name}`}
          maxLength={2000}
          className="flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-focus focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Enviar"
          className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="border-t border-danger/40 bg-danger/10 px-4 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </section>
  );
}
