import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Sobre",
  description:
    "A história do Circly — um app privado de videochamadas feito por Arthur para amigos próximos.",
};

export default function SobrePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Circly — início"
        >
          <BrandMark className="h-6 w-6" />
          <Wordmark className="text-sm text-text-primary" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Voltar
            </Button>
          </Link>
          <Link href="/entrar">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Sobre
        </p>
        <h1 className="mt-2 text-balance font-serif text-3xl md:text-5xl leading-[1.05]">
          Um lugar pequeno pra
          <br />
          <em className="not-italic text-brand">estar junto</em>.
        </h1>

        <div className="mt-12 space-y-8 text-pretty text-text-secondary leading-relaxed">
          <p className="text-lg">
            O Circly é uma sala privada de videochamada, feita pra ser usada por
            poucas pessoas — família, amigos próximos, um time pequeno. Nada de
            comunidade, nada de fila de espera, nada de &ldquo;canal público&rdquo;.
          </p>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-text-primary">
              Por que existe
            </h2>
            <p>
              A internet tá cheia de apps grandes que tentam ser tudo pra todo
              mundo — servidores gigantes, publicações, ranking, algoritmo. Isso
              é ótimo pra descobrir gente nova. É ruim pra falar com quem você
              já conhece.
            </p>
            <p>
              Quando quero chamar meu irmão pra jogar um papo rápido, eu não
              quero abrir um app cheio de notificação de canal aleatório. Eu
              quero um link, uma sala, dois ou três amigos, e pronto.
            </p>
            <p>
              O Circly é isso. Uma sala privada que se dissolve quando todo
              mundo sai. Sem histórico eterno, sem público, sem métrica.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-text-primary">
              O que ele faz
            </h2>
            <ul className="space-y-2 pl-5">
              <li className="list-disc marker:text-brand">
                Cria uma sala com um link privado. Você compartilha com quem
                quiser.
              </li>
              <li className="list-disc marker:text-brand">
                Chamada com câmera, microfone e compartilhamento de tela em
                tempo real.
              </li>
              <li className="list-disc marker:text-brand">
                Lista curta de amigos, presença ao vivo (online/em call),
                mensagens diretas 1:1.
              </li>
              <li className="list-disc marker:text-brand">
                Filtros de vídeo, push-to-talk, moderação do host.
              </li>
              <li className="list-disc marker:text-brand">
                Login sem senha por código no email. Visitante entra sem conta.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-text-primary">
              O que ele não faz
            </h2>
            <p>
              Não tem &ldquo;servidor&rdquo; nem &ldquo;canal&rdquo; no estilo Discord. Não tem
              publicação, seguidores, feed ou timeline. Não tem gravação
              automática. Não tem monetização, anúncio, coleta de dado pra
              vender. É um app pessoal, feito com carinho, pra ser usado
              devagar.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-text-primary">Quem fez</h2>
            <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-brand/40 bg-surface-raised">
                <Image
                  src="/team/arthur.jpg"
                  alt="Foto de Arthur Fernandes, criador do Circly"
                  fill
                  sizes="96px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl text-text-primary">
                  Arthur Fernandes
                </p>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  Desenvolvedor · Brasil
                </p>
                <p className="mt-3 text-sm text-text-secondary text-pretty leading-relaxed">
                  Criei o Circly pra conversar com meu círculo pequeno sem
                  depender de plataformas grandes. Feito à mão, sem
                  &quot;produto&quot; comercial em mente. Se um dia isso mudar,
                  esta página muda junto.
                </p>
                <a
                  href="mailto:arthur@endogest.com.br"
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-hover"
                >
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  arthur@endogest.com.br
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-text-primary">
              Como é construído
            </h2>
            <p>
              Next.js na Vercel, Supabase pro banco e autenticação, LiveKit pra
              transporte de áudio/vídeo/tela. Tudo hospedado em plano gratuito
              enquanto der.
            </p>
            <p>
              Segurança levada a sério: row-level security no banco, tokens de
              convite hasheados, mídia criptografada ponta a ponta pelo LiveKit,
              sem coleta de dado além do estritamente necessário. Ver{" "}
              <Link
                href="/privacidade"
                className="text-text-primary underline underline-offset-2 hover:text-brand"
              >
                Política de Privacidade
              </Link>{" "}
              para detalhes.
            </p>
          </section>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <Link href="/entrar">
            <Button size="lg">Entrar no Circly</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="lg">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
