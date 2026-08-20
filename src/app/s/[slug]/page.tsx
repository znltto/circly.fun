import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canFriendJoin } from "@/lib/rooms/queries";
import { resolveInvite } from "@/lib/rooms/actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GuestJoinForm } from "./guest-form";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ i?: string }>;
}

/**
 * Pré-entrada da sala. Fluxo:
 *  1. Se logado + host ou amigo aceito (visibility=friends) → vai direto pra sala.
 *  2. Se `?i=<token>` válido → vai direto pra sala (registra participação).
 *  3. Se `?i=<token>` válido + guest (não logado) e allow_guests → pede nome.
 *  4. Caso contrário → mensagem genérica (não enumera existência).
 *
 * A tela de câmera/microfone/dispositivos vem na Fase 7.
 */
export default async function SalaPreJoinPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { i: token } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Amigo / host
  if (user) {
    const friendAccess = await canFriendJoin(slug);
    if (friendAccess) {
      redirect(`/s/${slug}/sala`);
    }
  }

  // 2) Convite por link
  const invite = token ? await resolveInvite(slug, token) : null;
  if (invite && user) {
    // Logado: entra direto (registro efetivo acontece ao pegar o token LiveKit)
    redirect(`/s/${slug}/sala?i=${token}`);
  }

  const canGuestJoin = !!invite && invite.allowGuests && !user;

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-brand" />
          <Wordmark className="text-sm" />
        </Link>
        {!user && (
          <Link href="/entrar">
            <Button variant="ghost" size="sm">
              Entrar como usuário
            </Button>
          </Link>
        )}
      </header>

      <section className="mx-auto max-w-md px-6 py-16">
        {canGuestJoin && invite ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-brand uppercase">
                Convite de sala
              </p>
              <h1 className="mt-2 font-serif text-3xl text-balance">
                {invite.title}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Você foi convidado. Diga como quer aparecer para as outras
                pessoas.
              </p>
            </div>

            <GuestJoinForm slug={slug} token={token ?? ""} />

            <p className="text-xs text-text-muted">
              Prefere entrar com sua conta?{" "}
              <Link
                href={`/entrar?next=${encodeURIComponent(`/s/${slug}?i=${token}`)}`}
                className="text-text-secondary underline underline-offset-2 hover:text-text-primary"
              >
                Fazer login
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface">
            <EmptyState
              mascot="connection-error"
              title="Este convite não está disponível."
              description="O link pode ter expirado, sido revogado ou nunca ter existido. Peça um novo para quem te convidou."
              action={
                <Link href="/">
                  <Button variant="secondary">Voltar ao início</Button>
                </Link>
              }
            />
          </div>
        )}
      </section>
    </main>
  );
}
