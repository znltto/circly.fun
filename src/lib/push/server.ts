import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

/**
 * Configura o web-push com VAPID (uma vez, na primeira chamada).
 * Requer:
 *   - VAPID_PUBLIC_KEY (também exposto como NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *   - VAPID_PRIVATE_KEY
 *   - VAPID_SUBJECT (mailto:seuemail@exemplo.com)
 *
 * Gera chaves com: `npx web-push generate-vapid-keys`.
 */
export function isPushEnabled(): boolean {
  return (
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY &&
    !!process.env.VAPID_SUBJECT
  );
}

function ensureConfigured() {
  if (configured) return;
  if (!isPushEnabled()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** URL relativa que abre ao clicar. */
  url?: string;
  /** Tag pra colapsar notificações do mesmo tópico. */
  tag?: string;
}

/**
 * Envia uma notificação Web Push pra todos os endpoints de um usuário.
 * Best-effort: falhas individuais não travam o resto. Endpoints que retornam
 * 410/404 são apagados (browser desinstalou o SW).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  if (!isPushEnabled()) return { sent: 0, removed: 0 };
  ensureConfigured();

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", userId);

  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  const json = JSON.stringify(payload);
  let sent = 0;
  const toRemove: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json
        );
        sent++;
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (status === 404 || status === 410) {
          toRemove.push(s.id);
        } else {
          console.warn("[push] envio falhou:", err);
        }
      }
    })
  );

  if (toRemove.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", toRemove);
  }

  // Atualiza timestamp de uso (best-effort)
  if (sent > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("profile_id", userId);
  }

  return { sent, removed: toRemove.length };
}
