import {
  Users,
  UserPlus,
  DoorOpen,
  Radio,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  DollarSign,
  Calendar,
  Activity,
} from "lucide-react";
import {
  loadAdminStats,
  loadRecentConversations,
  formatUsd,
} from "./queries";

export const metadata = { title: "Painel Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, conversations] = await Promise.all([
    loadAdminStats(),
    loadRecentConversations(30),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 space-y-10 md:py-14">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-brand">
          Painel de administração
        </p>
        <h1 className="font-serif text-3xl md:text-4xl">Como está o Circly</h1>
        <p className="text-sm text-text-secondary">
          Números atualizados agora. Só você vê essa página.
        </p>
      </header>

      {/* Bloco: Usuários e amigos */}
      <StatSection title="Comunidade">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Usuários totais"
          value={stats.usersTotal}
        />
        <StatCard
          icon={<UserPlus className="h-4 w-4" />}
          label="Novos (7 dias)"
          value={stats.usersLast7d}
          accent
        />
        <StatCard
          icon={<MessagesSquare className="h-4 w-4" />}
          label="Amizades aceitas"
          value={stats.friendshipsAccepted}
        />
      </StatSection>

      {/* Bloco: Salas e chamadas */}
      <StatSection title="Salas e chamadas">
        <StatCard
          icon={<DoorOpen className="h-4 w-4" />}
          label="Salas criadas (total)"
          value={stats.roomsTotal}
        />
        <StatCard
          icon={<Radio className="h-4 w-4" />}
          label="Salas ativas agora"
          value={stats.roomsActive}
          accent={stats.roomsActive > 0}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Salas hoje"
          value={stats.callsToday}
        />
      </StatSection>

      {/* Bloco: Mensagens */}
      <StatSection title="Mensagens hoje">
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Chat de sala"
          value={stats.messagesToday}
        />
        <StatCard
          icon={<MessagesSquare className="h-4 w-4" />}
          label="DMs 1:1"
          value={stats.dmsToday}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Trocas com IA"
          value={stats.aiTurnsTotal}
        />
      </StatSection>

      {/* Bloco: Custo IA */}
      <StatSection title="Assistente CCO — custos OpenAI">
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Tokens usados (total)"
          value={stats.aiTokensTotal.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Gasto neste mês"
          value={formatUsd(stats.aiCostMicroDollarsMonth)}
          accent
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Gasto acumulado"
          value={formatUsd(stats.aiCostMicroDollars)}
          hint="Desde o primeiro dia"
        />
      </StatSection>

      {/* Últimas conversas com CCO */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Últimas conversas com o assistente
          </h2>
          <span className="font-mono text-[10px] text-text-muted">
            {conversations.length} mais recentes
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
            Nenhuma conversa ainda. O CCO aparece pra todo mundo mas
            precisa alguém puxar assunto.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full">
              <thead className="border-b border-border bg-surface-raised/50 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Quando</th>
                  <th className="px-4 py-3 font-medium">Quem</th>
                  <th className="px-4 py-3 font-medium">Perguntou</th>
                  <th className="px-4 py-3 font-medium">CCO respondeu</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {conversations.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border/60 align-top hover:bg-surface-hover/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-text-muted">
                      {new Date(c.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {c.user_email ? (
                        <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                          {c.user_email}
                        </span>
                      ) : (
                        <span className="text-text-muted italic">anônimo</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-text-primary">
                      <p className="line-clamp-3 text-pretty text-xs">
                        {c.user_message ?? (
                          <span className="italic text-text-muted">
                            (mensagem vazia)
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-text-secondary">
                      <p className="line-clamp-3 text-pretty text-xs">
                        {c.assistant_message ?? "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] text-text-secondary">
                      {c.total_tokens.toLocaleString("pt-BR")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] text-text-secondary">
                      {formatUsd(c.cost_micro_dollars)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

/* ------------------------------------------------------------------
 *  UI helpers
 * ------------------------------------------------------------------ */

function StatSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{children}</div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={
        accent
          ? "relative overflow-hidden rounded-lg border border-brand/40 bg-brand/5 p-5"
          : "relative overflow-hidden rounded-lg border border-border bg-surface p-5"
      }
    >
      <div className="flex items-center gap-2 text-text-muted">
        <span className={accent ? "text-brand" : "text-text-muted"}>
          {icon}
        </span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-3 font-serif text-3xl text-text-primary">{value}</p>
      {hint && (
        <p className="mt-1 text-[11px] text-text-muted">{hint}</p>
      )}
    </div>
  );
}
