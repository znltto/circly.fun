"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Send, Paperclip, SmilePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  sendRoomMessage,
  toggleMessageReaction,
} from "@/lib/messages/actions";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

/** Mensagem exibida no chat. Pode vir do histórico persistido ou de broadcast. */
interface ChatMessage {
  /** id vindo do banco (persistidas) ou UUID local para guests. */
  id: string;
  /** id no banco. undefined para mensagens de guest (não persistidas). */
  dbId?: string;
  senderName: string;
  senderIdentity: string;
  /** ID do profile do autor (null se guest). Usado para verificar reação própria. */
  senderProfileId: string | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt: number;
  fromSelf: boolean;
  /** true enquanto o upload/insert está em andamento. */
  pending?: boolean;
}

interface ReactionState {
  emoji: string;
  count: number;
  reactorIds: string[];
  /** true se o viewer atual reagiu com esse emoji. */
  fromSelf: boolean;
}

interface InRoomChatProps {
  roomSlug: string;
  senderIdentity: string;
  senderName: string;
  onIncoming?: () => void;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const EMOJI_PALETTE = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"] as const;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

/**
 * Chat da sala.
 *
 * DECISÕES:
 * - Histórico persistido em `messages` para usuários autenticados.
 * - Guests continuam sem persistência (broadcast Realtime apenas). Isso está
 *   documentado na UI para deixar claro.
 * - Assinamos duas fontes Realtime simultaneamente:
 *     1. `postgres_changes` em messages/message_reactions (fonte de verdade).
 *     2. broadcast `guest-message` para propagar mensagens efêmeras de guests.
 * - Reações requerem login (RLS exige reactor_id = auth.uid()). Guests podem
 *   ver contadores mas o clique mostra um hint.
 */
export function InRoomChat({
  roomSlug,
  senderIdentity,
  senderName,
  onIncoming,
}: InRoomChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [reactionsByMessage, setReactionsByMessage] = React.useState<
    Record<string, ReactionState[]>
  >({});
  const [draft, setDraft] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [viewerProfileId, setViewerProfileId] = React.useState<string | null>(
    null
  );
  const [emojiOpenFor, setEmojiOpenFor] = React.useState<string | null>(null);

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabaseRef = React.useRef<ReturnType<typeof createClient> | null>(null);

  // --- Setup: descobre sessão do viewer para calcular fromSelf/reactions --------
  React.useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setViewerProfileId(data.user?.id ?? null);
      })
      .catch(() => setViewerProfileId(null));
  }, []);

  // --- Carrega histórico + reações --------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(roomSlug)}/messages?identity=${encodeURIComponent(senderIdentity)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            sender_profile_id: string | null;
            guest_name: string | null;
            content: string;
            attachment_url: string | null;
            attachment_type: string | null;
            created_at: string;
            sender_username: string | null;
            sender_display_name: string | null;
          }>;
          reactions: Array<{
            message_id: string;
            reactor_id: string;
            emoji: string;
          }>;
        };
        if (cancelled) return;

        const mapped: ChatMessage[] = data.messages.map((m) => ({
          id: m.id,
          dbId: m.id,
          senderName:
            m.sender_display_name ??
            m.sender_username ??
            m.guest_name ??
            "Anônimo",
          senderIdentity: m.sender_profile_id ?? m.guest_name ?? "unknown",
          senderProfileId: m.sender_profile_id,
          content: m.content,
          attachmentUrl: m.attachment_url,
          attachmentType: m.attachment_type,
          createdAt: new Date(m.created_at).getTime(),
          fromSelf:
            !!viewerProfileId && m.sender_profile_id === viewerProfileId,
        }));

        setMessages(mapped);
        setReactionsByMessage(buildReactionState(data.reactions, viewerProfileId));
      } catch {
        // silencioso — histórico é best-effort
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug, viewerProfileId]);

  // --- Realtime: postgres_changes em messages + reactions + broadcast guest ---
  React.useEffect(() => {
    const supabase = supabaseRef.current ?? createClient();
    supabaseRef.current = supabase;

    const channel = supabase.channel(`room-chat:${roomSlug}`, {
      config: { broadcast: { self: false } },
    });

    // Descobre o room_id para filtrar postgres_changes. Guardamos numa closure.
    let roomIdPromise: Promise<string | null> | null = null;

    async function getRoomId(): Promise<string | null> {
      if (!roomIdPromise) {
        roomIdPromise = (async () => {
          const { data } = await supabase
            .from("rooms")
            .select("id")
            .eq("slug", roomSlug)
            .maybeSingle();
          return data?.id ?? null;
        })();
      }
      return roomIdPromise;
    }

    // Se o Realtime disparar antes de sabermos o roomId, guardamos numa fila
    // pequena para reprocessar.
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const roomId = await getRoomId();
          const row = payload.new as {
            id: string;
            room_id: string;
            sender_profile_id: string | null;
            guest_name: string | null;
            content: string;
            attachment_url: string | null;
            attachment_type: string | null;
            created_at: string;
          };
          if (roomId && row.room_id !== roomId) return;

          // Precisamos do display_name — busca leve.
          let displayName = row.guest_name ?? "Alguém";
          if (row.sender_profile_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", row.sender_profile_id)
              .maybeSingle();
            if (profile) {
              displayName = profile.display_name || profile.username || displayName;
            }
          }

          setMessages((prev) => {
            // Se já existe (fromSelf ou reprocesso), evita duplicar.
            if (prev.some((m) => m.dbId === row.id)) return prev;
            const isSelf =
              !!viewerProfileId &&
              row.sender_profile_id === viewerProfileId;
            return [
              ...prev,
              {
                id: row.id,
                dbId: row.id,
                senderName: displayName,
                senderIdentity: row.sender_profile_id ?? row.guest_name ?? "unknown",
                senderProfileId: row.sender_profile_id,
                content: row.content,
                attachmentUrl: row.attachment_url,
                attachmentType: row.attachment_type,
                createdAt: new Date(row.created_at).getTime(),
                fromSelf: isSelf,
              },
            ];
          });
          onIncoming?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.new as {
            message_id: string;
            reactor_id: string;
            emoji: string;
          };
          setReactionsByMessage((prev) =>
            applyReactionChange(prev, row, "insert", viewerProfileId)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.old as {
            message_id: string;
            reactor_id: string;
            emoji: string;
          };
          setReactionsByMessage((prev) =>
            applyReactionChange(prev, row, "delete", viewerProfileId)
          );
        }
      )
      .on(
        "broadcast",
        { event: "guest-message" },
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
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === m.id)) return prev;
            return [
              ...prev,
              {
                ...m,
                senderProfileId: null,
                fromSelf: m.senderIdentity === senderIdentity,
              },
            ];
          });
          onIncoming?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug, senderIdentity, viewerProfileId]);

  // --- Autoscroll --------------------------------------------------------------
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // --- Envio ------------------------------------------------------------------

  const isGuest = viewerProfileId === null;

  async function submitMessage(opts: {
    content: string;
    attachmentUrl?: string;
    attachmentType?: "image";
  }) {
    const content = opts.content.trim();
    if (!content && !opts.attachmentUrl) return;

    if (isGuest) {
      // Guest: apenas broadcast, sem persistência.
      const localId = crypto.randomUUID();
      const msg: ChatMessage = {
        id: localId,
        senderIdentity,
        senderName,
        senderProfileId: null,
        content,
        attachmentUrl: opts.attachmentUrl ?? null,
        attachmentType: opts.attachmentType ?? null,
        createdAt: Date.now(),
        fromSelf: true,
      };
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      await channelRef.current?.send({
        type: "broadcast",
        event: "guest-message",
        payload: {
          id: localId,
          senderIdentity,
          senderName,
          content,
          createdAt: msg.createdAt,
        },
      });
      return;
    }

    // Autenticado: persiste via server action.
    setSending(true);
    const tempId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: tempId,
      senderIdentity,
      senderName,
      senderProfileId: viewerProfileId,
      content,
      attachmentUrl: opts.attachmentUrl ?? null,
      attachmentType: opts.attachmentType ?? null,
      createdAt: Date.now(),
      fromSelf: true,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const result = await sendRoomMessage({
        roomSlug,
        content,
        attachmentUrl: opts.attachmentUrl,
        attachmentType: opts.attachmentType,
      });

      if (!result.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setUploadError(result.error);
        return;
      }

      const saved = result.message;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                id: saved.id,
                dbId: saved.id,
                senderIdentity:
                  saved.sender_profile_id ?? saved.guest_name ?? "unknown",
                senderName:
                  saved.sender_display_name ??
                  saved.sender_username ??
                  senderName,
                senderProfileId: saved.sender_profile_id,
                content: saved.content,
                attachmentUrl: saved.attachment_url,
                attachmentType: saved.attachment_type,
                createdAt: new Date(saved.created_at).getTime(),
                fromSelf: true,
              }
            : m
        )
      );
    } catch (err) {
      console.error("[InRoomChat] sendRoomMessage falhou:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setUploadError("Falha de rede ao enviar.");
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending || uploading) return;
    await submitMessage({ content: draft });
  }

  // --- Upload -----------------------------------------------------------------

  async function uploadAndSend(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Só imagens são suportadas por enquanto.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Imagem muito grande (máx. 5 MB).");
      return;
    }
    if (isGuest) {
      setUploadError("Faça login para enviar imagens.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomSlug", roomSlug);
      const res = await fetch("/api/uploads/room-image", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !body?.url) {
        setUploadError(body?.error ?? "Falha ao subir imagem.");
        return;
      }
      await submitMessage({
        content: draft,
        attachmentUrl: body.url,
        attachmentType: "image",
      });
    } catch (err) {
      console.error("[InRoomChat] upload falhou:", err);
      setUploadError("Falha de rede ao subir imagem.");
    } finally {
      setUploading(false);
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo
    if (file) void uploadAndSend(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadAndSend(file);
          return;
        }
      }
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadAndSend(file);
  }

  // --- Reactions --------------------------------------------------------------

  async function handleToggleReaction(messageId: string, emoji: string) {
    if (isGuest) {
      setUploadError("Faça login para reagir a mensagens.");
      return;
    }
    // Otimista: aplica local antes do postgres_changes chegar.
    setReactionsByMessage((prev) =>
      applyReactionChange(
        prev,
        { message_id: messageId, reactor_id: viewerProfileId!, emoji },
        // Se o viewer já reagiu com esse emoji, é remoção; senão, insert.
        prev[messageId]?.find((r) => r.emoji === emoji)?.fromSelf
          ? "delete"
          : "insert",
        viewerProfileId
      )
    );
    setEmojiOpenFor(null);
    try {
      const result = await toggleMessageReaction({ messageId, emoji });
      if (!result.ok) {
        setUploadError(result.error);
      }
    } catch (err) {
      console.error("[InRoomChat] toggleReaction falhou:", err);
    }
  }

  // --- Render -----------------------------------------------------------------

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-brand/10 backdrop-blur-sm">
          <div className="rounded-md border border-dashed border-brand bg-surface px-4 py-3 text-sm text-brand">
            Solte para enviar a imagem
          </div>
        </div>
      )}

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
          <MessageRow
            key={m.id}
            message={m}
            reactions={m.dbId ? (reactionsByMessage[m.dbId] ?? []) : []}
            canReact={!isGuest && !!m.dbId}
            emojiOpen={emojiOpenFor === m.id}
            onOpenEmoji={() =>
              setEmojiOpenFor((cur) => (cur === m.id ? null : m.id))
            }
            onToggleReaction={(emoji) =>
              m.dbId ? handleToggleReaction(m.dbId, emoji) : undefined
            }
          />
        ))}
      </div>

      {isGuest && (
        <div className="border-t border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-text-primary">
          <span className="font-medium">Você entrou como visitante.</span>{" "}
          Suas mensagens só aparecem para quem está online agora — não ficam
          salvas depois que você sai. Anexos não estão disponíveis para
          visitantes.
        </div>
      )}

      {uploadError && (
        <div className="flex items-center justify-between gap-2 border-t border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            aria-label="Fechar aviso"
            className="rounded-sm p-0.5 hover:bg-danger/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFilePicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isGuest}
          aria-label="Anexar imagem"
          title={isGuest ? "Faça login para anexar imagens" : "Anexar imagem"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={handlePaste}
          maxLength={500}
          placeholder="Mensagem"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-focus focus:outline-none"
        />
        <button
          type="submit"
          disabled={(!draft.trim() && !uploading) || sending}
          aria-label="Enviar"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponentes
// -----------------------------------------------------------------------------

function MessageRow({
  message,
  reactions,
  canReact,
  emojiOpen,
  onOpenEmoji,
  onToggleReaction,
}: {
  message: ChatMessage;
  reactions: ReactionState[];
  canReact: boolean;
  emojiOpen: boolean;
  onOpenEmoji: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-0.5",
        message.fromSelf ? "items-end" : "items-start"
      )}
    >
      {!message.fromSelf && (
        <span className="px-1 text-[10px] font-medium text-text-muted">
          {message.senderName}
        </span>
      )}

      <div
        className={cn(
          "flex max-w-[85%] items-end gap-1",
          message.fromSelf ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-1 overflow-hidden rounded-md",
            message.fromSelf
              ? "bg-brand text-brand-fg"
              : "bg-surface-raised text-text-primary",
            message.pending && "opacity-70"
          )}
        >
          {message.attachmentUrl && message.attachmentType === "image" && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachmentUrl}
                alt="Imagem anexada"
                className="max-h-[240px] w-auto max-w-full object-cover"
                loading="lazy"
              />
            </a>
          )}
          {message.content && (
            <span className="px-3 py-1.5 text-sm text-pretty">
              {message.content}
            </span>
          )}
        </div>

        {canReact && (
          <div className="relative opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={onOpenEmoji}
              aria-label="Reagir"
              className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {emojiOpen && (
              <div
                className={cn(
                  "absolute z-10 flex gap-1 rounded-md border border-border bg-surface-raised p-1 shadow-lg",
                  message.fromSelf ? "right-0 bottom-full mb-1" : "left-0 bottom-full mb-1"
                )}
                role="menu"
              >
                {EMOJI_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(emoji)}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-base hover:bg-surface-hover"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {reactions.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap gap-1 pt-0.5",
            message.fromSelf ? "justify-end" : "justify-start"
          )}
        >
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => canReact && onToggleReaction(r.emoji)}
              disabled={!canReact}
              className={cn(
                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                r.fromSelf
                  ? "border-brand/50 bg-brand/15 text-brand"
                  : "border-border bg-surface-raised text-text-secondary hover:bg-surface-hover"
              )}
            >
              <span aria-hidden>{r.emoji}</span>
              <span className="tabular-nums">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildReactionState(
  rows: Array<{ message_id: string; reactor_id: string; emoji: string }>,
  viewerId: string | null
): Record<string, ReactionState[]> {
  const acc: Record<string, Map<string, { count: number; reactorIds: string[] }>> = {};
  for (const row of rows) {
    if (!acc[row.message_id]) acc[row.message_id] = new Map();
    const bucket = acc[row.message_id];
    const cur = bucket.get(row.emoji) ?? { count: 0, reactorIds: [] };
    cur.count += 1;
    cur.reactorIds.push(row.reactor_id);
    bucket.set(row.emoji, cur);
  }
  const out: Record<string, ReactionState[]> = {};
  for (const [messageId, bucket] of Object.entries(acc)) {
    out[messageId] = Array.from(bucket.entries()).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      reactorIds: v.reactorIds,
      fromSelf: !!viewerId && v.reactorIds.includes(viewerId),
    }));
  }
  return out;
}

function applyReactionChange(
  state: Record<string, ReactionState[]>,
  change: { message_id: string; reactor_id: string; emoji: string },
  op: "insert" | "delete",
  viewerId: string | null
): Record<string, ReactionState[]> {
  const next = { ...state };
  const list = [...(next[change.message_id] ?? [])];
  const idx = list.findIndex((r) => r.emoji === change.emoji);

  if (op === "insert") {
    if (idx === -1) {
      list.push({
        emoji: change.emoji,
        count: 1,
        reactorIds: [change.reactor_id],
        fromSelf: !!viewerId && change.reactor_id === viewerId,
      });
    } else {
      const cur = list[idx];
      if (cur.reactorIds.includes(change.reactor_id)) return state; // dedup
      const reactorIds = [...cur.reactorIds, change.reactor_id];
      list[idx] = {
        ...cur,
        count: cur.count + 1,
        reactorIds,
        fromSelf: cur.fromSelf || (!!viewerId && change.reactor_id === viewerId),
      };
    }
  } else {
    if (idx === -1) return state;
    const cur = list[idx];
    const reactorIds = cur.reactorIds.filter((id) => id !== change.reactor_id);
    if (reactorIds.length === 0) {
      list.splice(idx, 1);
    } else {
      list[idx] = {
        ...cur,
        count: reactorIds.length,
        reactorIds,
        fromSelf: !!viewerId && reactorIds.includes(viewerId),
      };
    }
  }

  next[change.message_id] = list;
  return next;
}
