import Link from "next/link";
import { Mail, Clock, MessageCircle, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Contato",
  description: "Fale com o criador do Circly.",
};

export default function ContatoPage() {
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
          Contato
        </p>
        <h1 className="mt-2 text-balance font-serif text-3xl md:text-5xl leading-[1.05]">
          Fala <em className="not-italic text-brand">comigo</em>.
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-lg text-text-secondary">
          O Circly é um projeto pessoal. Quem responde sou eu mesmo, o Arthur.
          Escreva sobre bugs, ideias, feedback, pedidos de convite ou só pra
          bater papo.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Card
            icon={<Mail className="h-4 w-4 text-brand" />}
            title="Email"
            body="Melhor canal pra assuntos importantes ou longos."
            action={
              <a
                href="mailto:arthur@endogest.com.br"
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-text-primary transition-colors hover:bg-surface-hover"
              >
                arthur@endogest.com.br
              </a>
            }
          />

          <Card
            icon={<Clock className="h-4 w-4 text-brand" />}
            title="Resposta"
            body="Respondo em até 48h úteis. Se for bug crítico da sua conta, sinaliza no assunto que eu priorizo."
          />

          <Card
            icon={<MessageCircle className="h-4 w-4 text-brand" />}
            title="Bugs & sugestões"
            body="Manda com contexto: qual navegador, o que estava fazendo, print se puder. Facilita muito."
          />

          <Card
            icon={<BrandMark className="h-5 w-5 text-brand" />}
            title="Convite pra usar"
            body="O Circly é privado e por convite. Se quer testar, escreve dizendo quem indicou você."
          />
        </div>

        <section className="mt-14 space-y-3">
          <h2 className="font-serif text-xl text-text-primary">
            Sobre privacidade
          </h2>
          <p className="text-pretty text-text-secondary leading-relaxed">
            Se sua mensagem contém dado sensível (foto, nome de terceiros,
            informação privada), leia primeiro a{" "}
            <Link
              href="/privacidade"
              className="text-text-primary underline underline-offset-2 hover:text-brand"
            >
              Política de Privacidade
            </Link>
            . Nunca compartilhe senha, token de acesso ou chaves de API por
            email.
          </p>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <Link href="/sobre">
            <Button variant="secondary" size="lg">
              Sobre o Circly
            </Button>
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

function Card({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-serif text-lg text-text-primary">{title}</p>
      </div>
      <p className="mt-2 text-sm text-text-secondary text-pretty leading-relaxed">
        {body}
      </p>
      {action}
    </div>
  );
}
