import { EmptyState } from "@/components/ui/EmptyState";
import { listPendingInvitations } from "@/lib/rooms/invitations";
import { InvitationCard } from "./InvitationCard";

export const metadata = { title: "Convites" };

// Cada visita re-consulta o Supabase — convites entram e saem em tempo real.
export const dynamic = "force-dynamic";

export default async function ConvitesPage() {
  const pending = await listPendingInvitations();

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-brand uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          Convites
        </p>
        <h1 className="font-serif text-3xl md:text-4xl">
          Você foi convidado
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Salas que seus amigos abriram e te chamaram pra entrar.
        </p>
      </header>

      {pending.length === 0 ? (
        <EmptyState
          title="Nenhum convite pendente"
          description="Quando alguém te chamar pra uma sala, aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {pending.map((inv) => (
            <li key={inv.id}>
              <InvitationCard invitation={inv} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
