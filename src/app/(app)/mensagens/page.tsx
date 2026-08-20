import Link from "next/link";
import { listConversations } from "@/lib/dms/queries";
import { UserAvatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Mensagens" };

export default async function MensagensPage() {
  const conversations = await listConversations();

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">Mensagens</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Conversas privadas com seus amigos.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            mascot="waiting"
            title="Sem conversas ainda."
            description="Adicione amigos em Pessoas para começar a conversar."
            action={
              <Link href="/pessoas">
                <Button variant="secondary">Ir para pessoas</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-1 rounded-lg border border-border bg-surface p-2">
          {conversations.map((c) => (
            <li key={c.friend.id}>
              <Link
                href={`/mensagens/${c.friend.username}`}
                className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-surface-hover"
              >
                <UserAvatar
                  name={c.friend.display_name}
                  src={c.friend.avatar_url}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm text-text-primary">
                      {c.friend.display_name}
                    </p>
                    {c.lastMessage && (
                      <span className="shrink-0 font-mono text-[10px] text-text-muted">
                        {formatRelative(c.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {c.lastMessage ? (
                      <>
                        {c.lastMessage.from_self && (
                          <span className="text-text-secondary">Você: </span>
                        )}
                        {c.lastMessage.content}
                      </>
                    ) : (
                      <span className="italic">Nenhuma mensagem ainda</span>
                    )}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-medium text-brand-fg"
                    aria-label={`${c.unreadCount} mensagens não lidas`}
                  >
                    {c.unreadCount > 99 ? "99+" : c.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
