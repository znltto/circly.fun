import Link from "next/link";
import { Link2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listFriendships } from "@/lib/friends/queries";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendRowCompact } from "@/components/friends/FriendRow";

export const metadata = { title: "Início" };

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const friendships = await listFriendships();
  const accepted = friendships.filter((f) => f.status === "accepted");
  const incomingCount = friendships.filter(
    (f) => f.status === "pending" && f.direction === "incoming"
  ).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const displayName = profile?.display_name ?? "por aí";

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="text-sm text-text-secondary">
        {greeting},{" "}
        <span className="text-text-primary">{displayName}</span>.
      </p>
      <h1 className="mt-1 font-serif text-3xl md:text-4xl text-balance">
        Com quem você quer conversar?
      </h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/salas/nova">
          <Button size="lg" leftIcon={<Plus className="h-4 w-4" />}>
            Nova sala
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="lg"
          leftIcon={<Link2 className="h-4 w-4" />}
          disabled
          title="Chega na próxima fase"
        >
          Entrar com link
        </Button>
      </div>

      {incomingCount > 0 && (
        <Link
          href="/pessoas"
          className="mt-8 inline-flex items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-text-primary"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {incomingCount === 1
            ? "1 solicitação de amizade"
            : `${incomingCount} solicitações de amizade`}
          <span className="text-text-muted">— ver</span>
        </Link>
      )}

      <div className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Seus amigos
          </h2>
          <Link
            href="/pessoas"
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Ver todos →
          </Link>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-surface">
          {accepted.length === 0 ? (
            <EmptyState
              mascot="waiting"
              title="Nenhum amigo por aqui."
              description="Adicione alguém em Pessoas para ver quem está online."
              action={
                <Link href="/pessoas">
                  <Button variant="secondary">Ir para pessoas</Button>
                </Link>
              }
            />
          ) : (
            <ul className="p-2">
              {accepted.slice(0, 8).map((f) => (
                <FriendRowCompact key={f.id} friend={f.friend} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
