import { listFriendships } from "@/lib/friends/queries";
import { FriendRow } from "@/components/friends/FriendRow";
import { FriendRequestCard } from "@/components/friends/FriendRequestCard";
import { AddFriendSearch } from "@/components/friends/AddFriendSearch";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchProfiles } from "./actions";

export const metadata = { title: "Pessoas" };

export default async function PessoasPage() {
  const friendships = await listFriendships();

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.direction === "incoming"
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.direction === "outgoing"
  );

  const existingFriendIds = friendships.map((f) => f.friend.id);

  return (
    <section className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:py-14">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Pessoas</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Uma lista curta de quem importa. Sem timeline, sem barulho.
        </p>
      </header>

      <AddFriendSearch
        searchAction={searchProfiles}
        existingFriendIds={existingFriendIds}
      />

      {incoming.length > 0 && (
        <Section title={`Solicitações (${incoming.length})`}>
          <div className="space-y-2">
            {incoming.map((f) => (
              <FriendRequestCard
                key={f.id}
                friendshipId={f.id}
                direction="incoming"
                friend={f.friend}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title={`Amigos${accepted.length ? ` (${accepted.length})` : ""}`}>
        <div className="rounded-lg border border-border bg-surface">
          {accepted.length === 0 ? (
            <EmptyState
              mascot="waiting"
              title="Sua lista ainda está vazia."
              description="Use a busca acima para adicionar alguém pelo @."
            />
          ) : (
            <ul className="p-2">
              {accepted.map((f) => (
                <FriendRow
                  key={f.id}
                  friendshipId={f.id}
                  friend={f.friend}
                />
              ))}
            </ul>
          )}
        </div>
      </Section>

      {outgoing.length > 0 && (
        <Section title="Aguardando resposta">
          <div className="space-y-2">
            {outgoing.map((f) => (
              <FriendRequestCard
                key={f.id}
                friendshipId={f.id}
                direction="outgoing"
                friend={f.friend}
              />
            ))}
          </div>
        </Section>
      )}
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
