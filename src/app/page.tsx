import Link from "next/link";
import {
  ArrowRight,
  Link2,
  Mic,
  MicOff,
  Video,
  ScreenShare,
  MessageSquare,
  MoreHorizontal,
  Phone,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md"
          aria-label="Conccord — início"
        >
          <BrandMark className="h-7 w-7" />
          <Wordmark className="text-base" />
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link href="/entrar">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link href="/entrar">
            <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Criar sala
            </Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <div className="grid gap-16 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              Feito para poucas pessoas, com carinho.
            </p>

            <h1 className="text-balance font-serif text-[44px] leading-[1.05] md:text-[64px] md:leading-[1]">
              Perto, <em className="not-italic text-brand">mesmo</em>
              <br />
              de longe.
            </h1>

            <p className="mt-6 max-w-md text-pretty text-lg text-text-secondary">
              Uma sala privada para conversar, ver e compartilhar com quem
              importa. Sem servidores, sem ruído, sem convite público.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/entrar">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Criar uma sala
                </Button>
              </Link>
              <Link href="/entrar">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Link2 className="h-4 w-4" />}
                >
                  Entrar com link
                </Button>
              </Link>
            </div>

            <p className="mt-8 font-mono text-xs text-text-muted">
              conccord.app/s/<span className="text-text-secondary">ab12cd</span>
            </p>
          </div>

          <CallMockup />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            title="Sua sala"
            body="Crie, compartilhe um link e convide. Sem cadastro para quem entra."
          />
          <Feature
            title="Sua presença"
            body="Câmera, voz ou tela — do jeito que fizer sentido no momento."
          />
          <Feature
            title="Suas pessoas"
            body="Uma lista curta de amigos, sem timeline, sem barulho."
          />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} Conccord</span>
          <span className="font-mono">v0.1 · MVP em construção</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l border-border pl-5">
      <h3 className="font-serif text-xl text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary text-pretty">{body}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Mockup da chamada — composição visual pra landing, sem estado real.
 * -------------------------------------------------------------------------- */

function CallMockup() {
  return (
    <div className="relative w-full max-w-md justify-self-end">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[32px] bg-brand/[0.04] blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-danger/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-danger" />
            </span>
            <span className="text-xs text-text-secondary">Ao vivo</span>
            <span className="text-text-muted">·</span>
            <span className="text-xs text-text-primary">Papo de sexta</span>
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            3 pessoas
          </span>
        </div>

        <div className="relative p-3">
          <div className="grid grid-cols-2 gap-2">
            <ParticipantTile
              name="Arthur"
              initials="AR"
              gradient="from-emerald-500/40 via-teal-500/25 to-cyan-500/15"
              micOn
              speaking
              className="col-span-2 aspect-[16/10]"
            />
            <ParticipantTile
              name="Maria"
              initials="MA"
              gradient="from-fuchsia-500/40 via-purple-500/25 to-indigo-500/15"
              micOn
              className="aspect-[4/3]"
            />
            <ParticipantTile
              name="Lucas"
              initials="LU"
              gradient="from-amber-500/40 via-orange-500/25 to-rose-500/15"
              className="aspect-[4/3]"
            />
          </div>

          {/* Selo do CCO no canto */}
          <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-1 backdrop-blur">
            <CcoMascot variant="idle" className="h-5 w-5 text-brand" />
            <span className="font-mono text-[10px] text-text-secondary">
              conccord
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-border/70 bg-background/40 px-4 py-3">
          <ControlPill active>
            <Mic className="h-3.5 w-3.5" />
          </ControlPill>
          <ControlPill active>
            <Video className="h-3.5 w-3.5" />
          </ControlPill>
          <ControlPill accent>
            <ScreenShare className="h-3.5 w-3.5" />
          </ControlPill>
          <span className="mx-1 h-4 w-px bg-border" />
          <ControlPill>
            <MessageSquare className="h-3.5 w-3.5" />
          </ControlPill>
          <ControlPill>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </ControlPill>
          <span className="mx-1 h-4 w-px bg-border" />
          <ControlPill danger>
            <Phone className="h-3.5 w-3.5 rotate-[135deg]" />
          </ControlPill>
        </div>
      </div>
    </div>
  );
}

interface ParticipantTileProps {
  name: string;
  initials: string;
  gradient: string;
  micOn?: boolean;
  speaking?: boolean;
  className?: string;
}

function ParticipantTile({
  name,
  initials,
  gradient,
  micOn,
  speaking,
  className,
}: ParticipantTileProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border bg-surface-raised",
        speaking ? "border-brand/60" : "border-border/60",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="absolute inset-0 bg-surface-raised/60 mix-blend-multiply" />

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-2xl text-text-primary/80">
          {initials}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-2 text-[10px]">
        <span className="flex items-center gap-1 text-white/90">
          {micOn ? (
            <Mic className="h-2.5 w-2.5" />
          ) : (
            <MicOff className="h-2.5 w-2.5 text-danger" />
          )}
          {name}
        </span>
        {speaking && (
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_2px_rgba(215,255,63,0.4)]" />
        )}
      </div>
    </div>
  );
}

function ControlPill({
  children,
  active,
  accent,
  danger,
}: {
  children: React.ReactNode;
  active?: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full",
        danger
          ? "bg-danger/15 text-danger"
          : accent
          ? "bg-brand/15 text-brand"
          : active
          ? "bg-surface-raised text-text-primary"
          : "bg-surface-raised/60 text-text-secondary"
      )}
    >
      {children}
    </span>
  );
}
