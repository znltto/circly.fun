"use client";

import * as React from "react";
import { X, Send, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Bolha flutuante bottom-right + modal de ajuda/suporte.
 */
export function HelpBubble() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [rendered, setRendered] = React.useState(false); // controla mount durante animação
  const welcomeMsg = React.useMemo<ChatMessage>(
    () => ({ id: "welcome", role: "assistant", content: t("help.welcome") }),
    [t]
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([welcomeMsg]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Atualiza a mensagem inicial se o usuário trocar o idioma e ainda não
  // interagiu.
  React.useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [welcomeMsg];
      }
      return prev;
    });
  }, [welcomeMsg]);

  // Coreografia: entrar → mount + tick de RAF pra transição pegar
  React.useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    // sair: aguarda animação (200ms) antes de desmontar
    const t = setTimeout(() => setRendered(false), 220);
    return () => clearTimeout(t);
  }, [open]);

  // Focus no input quando abre
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape fecha
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Autoscroll
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };

      if (!res.ok || !body.text) {
        setError(body.error ?? t("help.unavailable"));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: body.text! },
      ]);
    } catch {
      setError(t("help.networkError"));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      {/* ------------------------------------------------------------
       *  Bolha flutuante — só aparece quando o modal está fechado.
       * ------------------------------------------------------------ */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("help.openLabel")}
        aria-expanded={open}
        className={cn(
          "fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6",
          "group flex h-12 w-12 items-center justify-center rounded-full",
          "border border-border bg-surface shadow-lg shadow-black/40",
          "transition-all duration-200 ease-out-quart",
          "hover:border-border/80 hover:bg-surface-hover",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          open
            ? "pointer-events-none scale-50 opacity-0"
            : "scale-100 opacity-100"
        )}
      >
        <HelpCircle
          className="h-5 w-5 text-text-secondary transition-colors group-hover:text-text-primary"
          aria-hidden
        />
      </button>

      {/* ------------------------------------------------------------
       *  Backdrop — fecha ao clicar fora (só desktop; mobile ocupa tela)
       * ------------------------------------------------------------ */}
      {rendered && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={cn(
            "fixed inset-0 z-30 hidden md:block",
            "bg-background/40 backdrop-blur-[2px]",
            "transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* ------------------------------------------------------------
       *  Modal / drawer do chat
       * ------------------------------------------------------------ */}
      {rendered && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("help.title")}
          className={cn(
            "fixed z-40 flex flex-col",
            // Mobile: full-screen. Desktop: bottom-right panel
            "inset-0 md:bottom-6 md:right-6 md:top-auto md:left-auto",
            "md:h-[620px] md:w-[400px]",
            "overflow-hidden border-border bg-surface shadow-2xl shadow-black/60",
            "md:rounded-2xl md:border",
            // Animação
            "origin-bottom-right transition-all duration-200 ease-out-quart",
            open
              ? "scale-100 opacity-100 translate-y-0"
              : "scale-90 opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {/* -------- Header -------- */}
          <header className="flex items-center justify-between border-b border-border bg-surface-raised/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                <HelpCircle className="h-4 w-4 text-text-secondary" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {t("help.title")}
                </p>
                <p className="text-[11px] text-text-muted">
                  {t("help.subtitle")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              aria-label={t("help.closeLabel")}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* -------- Mensagens -------- */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-background/30 px-4 py-4"
          >
            {messages.map((m, i) => (
              <Message
                key={m.id}
                role={m.role}
                content={m.content}
                delay={i === 0 ? 100 : 0}
              />
            ))}

            {sending && <TypingIndicator />}

            {error && (
              <div
                role="alert"
                className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {error}
              </div>
            )}
          </div>

          {/* -------- Input -------- */}
          <div className="border-t border-border bg-surface-raised/50 p-3">
            <div className="flex items-end gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors focus-within:border-brand/60">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("help.placeholder")}
                rows={1}
                maxLength={2000}
                disabled={sending}
                className="max-h-32 flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                aria-label={t("help.sendLabel")}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all",
                  "bg-brand text-brand-fg hover:bg-brand-hover hover:scale-105 active:scale-95",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-text-muted">
              {t("help.disclaimer")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
 *  Componentes auxiliares
 * ------------------------------------------------------------------ */

function Message({
  role,
  content,
  delay = 0,
}: {
  role: "user" | "assistant";
  content: string;
  delay?: number;
}) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        "flex transition-all duration-300 ease-out-quart",
        role === "user" ? "justify-end" : "justify-start",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2 text-sm leading-relaxed text-pretty",
          role === "user"
            ? "rounded-br-sm bg-brand text-brand-fg shadow-sm shadow-brand/20"
            : "rounded-bl-sm bg-surface-raised text-text-primary"
        )}
      >
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex">
      <div className="flex items-center gap-1 rounded-xl rounded-bl-sm bg-surface-raised px-3.5 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
      </div>
    </div>
  );
}
