"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * Habilita/desabilita notificações Web Push pro usuário. Registra a
 * subscription no server em /api/push/subscribe. Se o servidor não tem VAPID
 * configurado, o botão fica hidden com um aviso.
 */
export function NotificationsToggle() {
  const [supported, setSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unknown">(
    "unknown"
  );
  const [subscribed, setSubscribed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  if (!supported) return null;
  if (!VAPID_PUBLIC_KEY) {
    return (
      <p className="text-xs text-text-muted">
        Notificações não estão configuradas neste servidor.
      </p>
    );
  }

  async function enable() {
    setPending(true);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMessage("Você não permitiu notificações.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setMessage(body?.error ?? "Falha ao registrar.");
        return;
      }
      setSubscribed(true);
      setMessage("Notificações ativadas.");
    } catch (err) {
      console.warn("[push] enable falhou:", err);
      setMessage("Não consegui ativar notificações.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (err) {
      console.warn("[push] disable falhou:", err);
      setMessage("Erro ao desativar.");
    } finally {
      setPending(false);
    }
  }

  const denied = permission === "denied";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={subscribed ? disable : enable}
        disabled={pending || denied}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
          subscribed
            ? "border-brand/40 bg-brand/5 text-text-primary"
            : "border-border bg-surface text-text-primary hover:bg-surface-hover",
          (pending || denied) && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="flex items-center gap-3">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          ) : subscribed ? (
            <Bell className="h-4 w-4 text-brand" />
          ) : (
            <BellOff className="h-4 w-4 text-text-muted" />
          )}
          <span className="text-left">
            <span className="block">
              {subscribed
                ? "Notificações ativadas neste dispositivo"
                : denied
                  ? "Notificações bloqueadas pelo navegador"
                  : "Ativar notificações neste dispositivo"}
            </span>
            <span className="mt-0.5 block text-xs text-text-muted">
              {denied
                ? "Libere nas configurações do navegador para ativar."
                : subscribed
                  ? "Você recebe avisos quando alguém entra em uma sala sua."
                  : "Peça permissão para receber alertas mesmo com o app fechado."}
            </span>
          </span>
        </span>
      </button>
      {message && (
        <p role="status" className="text-xs text-text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
