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
  Plus,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/Avatar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { InstallButton } from "@/components/pwa/InstallButton";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

// Landing precisa re-renderizar por request pra pegar auth atualizado.
// Sem isso, Next pode servir uma versão prerendered sem sessão.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const t = await getT();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const loggedIn = !!user && !!profile;

  return (
    <main className="relative min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md"
          aria-label={`Circly — ${t("nav.home").toLowerCase()}`}
        >
          <BrandMark className="h-7 w-7" />
          <Wordmark className="text-base" />
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <InstallButton className="mr-1 hidden sm:inline-flex" />
          <LanguageSwitcher align="right" className="mr-1" />
          {loggedIn ? (
            <>
              <Link href="/salas/nova">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  {t("landing.newRoom")}
                </Button>
              </Link>
              <Link
                href="/inicio"
                className="ml-1 flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-3 py-1 transition-colors hover:bg-surface-hover"
                aria-label={`${t("nav.home")} — ${profile.display_name}`}
              >
                <UserAvatar
                  name={profile.display_name}
                  src={profile.avatar_url}
                  size="sm"
                />
                <span className="hidden font-mono text-xs text-text-secondary sm:inline">
                  @{profile.username}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/entrar">
                <Button variant="ghost" size="sm">
                  {t("landing.signIn")}
                </Button>
              </Link>
              <Link href="/entrar">
                <Button
                  size="sm"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t("landing.createRoom")}
                </Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <div className="grid gap-12 md:grid-cols-[.85fr_1.15fr] md:items-center md:gap-16">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              {t("landing.tagline")}
            </p>

            <h1 className="text-balance font-serif text-[44px] leading-[1.05] md:text-[64px] md:leading-[1]">
              {t("landing.hero1")}{" "}
              <em className="not-italic text-brand">{t("landing.heroEmphasis")}</em>
              <br />
              {t("landing.hero2")}
            </h1>

            <p className="mt-6 max-w-md text-pretty text-lg text-text-secondary">
              {t("landing.description")}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/entrar">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {t("landing.createOne")}
                </Button>
              </Link>
              <Link href="/entrar">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Link2 className="h-4 w-4" />}
                >
                  {t("landing.joinLink")}
                </Button>
              </Link>
            </div>

            <p className="mt-8 font-mono text-xs text-text-muted">
              {t("landing.urlHint")}<span className="text-text-secondary">ab12cd</span>
            </p>
          </div>

          <CallMockup />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            title={t("landing.feature1Title")}
            body={t("landing.feature1Body")}
          />
          <Feature
            title={t("landing.feature2Title")}
            body={t("landing.feature2Body")}
          />
          <Feature
            title={t("landing.feature3Title")}
            body={t("landing.feature3Body")}
          />
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-12">
            <div className="col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label={`Circly — ${t("nav.home").toLowerCase()}`}
              >
                <BrandMark className="h-6 w-6" />
                <Wordmark className="text-base" />
              </Link>
              <p className="mt-4 max-w-xs text-sm text-text-secondary text-pretty">
                {t("landing.footerBio")}
              </p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t("landing.footerStatus")}
              </p>
            </div>

            <FooterColumn
              title={t("landing.footerProduct")}
              links={[
                { href: "/", label: t("nav.home") },
                { href: "/salas/nova", label: t("landing.createRoom") },
                { href: "/entrar", label: t("landing.signIn") },
              ]}
            />

            <FooterColumn
              title={t("landing.footerCircly")}
              links={[
                { href: "/sobre", label: t("landing.footerCircly") },
                { href: "/termos", label: t("nav.terms") },
                { href: "/privacidade", label: t("nav.privacy") },
              ]}
            />

            <FooterColumn
              title={t("landing.footerContact")}
              links={[
                { href: "/contato", label: t("landing.footerContact") },
                {
                  href: "mailto:arthur@endogest.com.br",
                  label: "arthur@endogest.com.br",
                  external: true,
                },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 text-xs text-text-muted md:flex-row md:items-center">
            <span>
              © {new Date().getFullYear()} Circly. {t("landing.footerCredit")}{" "}
              <a
                href="mailto:arthur@endogest.com.br"
                className="text-text-secondary hover:text-text-primary"
              >
                Arthur Fernandes
              </a>
              .
            </span>
            <span className="font-mono">v0.1 · MVP</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={`${link.href}:${link.label}`}>
            {link.external ? (
              <a
                href={link.href}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
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
    <div className="relative w-full max-w-2xl md:justify-self-end lg:max-w-none lg:min-w-[560px]">
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
            {/* Palco: Arthur compartilhando tela (gameplay) */}
            <ScreenShareTile
              sharer="Arthur"
              gameplayImage="/team/gameplay.png"
              pipImage="/team/arthur-cartoon.png"
              className="col-span-2 aspect-[16/10]"
            />
            <ParticipantTile
              name="Maria"
              initials="MA"
              imageSrc="/team/maria-cartoon.png"
              gradient="from-fuchsia-500/40 via-purple-500/25 to-indigo-500/15"
              micOn
              className="aspect-[4/3]"
            />
            <ParticipantTile
              name="Lucas"
              initials="LU"
              imageSrc="/team/lucas-cartoon.png"
              gradient="from-amber-500/40 via-orange-500/25 to-rose-500/15"
              className="aspect-[4/3]"
            />
          </div>

          {/* Selo do CCO no canto */}
          {/* Selo Circly no canto do tile em destaque */}
          <div className="pointer-events-none absolute right-6 top-6 flex items-center gap-2.5 rounded-full border border-brand/40 bg-background/85 py-2 pl-2.5 pr-4 shadow-xl shadow-black/40 backdrop-blur-md">
            <BrandMark className="h-6 w-6" />
            <Wordmark className="text-lg leading-none" />
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

/**
 * Tile especial de screen-share: mostra o que o Arthur está compartilhando
 * (gameplay) com a webcam dele em picture-in-picture no canto.
 * Se `gameplayImage` não existir, cai em fallback com HUD desenhado.
 */
function ScreenShareTile({
  sharer,
  gameplayImage,
  pipImage,
  className,
}: {
  sharer: string;
  gameplayImage?: string;
  pipImage?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-brand/50 bg-black shadow-inner shadow-brand/10",
        className
      )}
    >
      {gameplayImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gameplayImage}
            alt={`${sharer} compartilhando tela`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </>
      ) : (
        <FallbackGameplay />
      )}

      {/* Badge "compartilhando" */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-brand/95 px-2.5 py-1 text-[10px] font-medium text-brand-fg shadow-lg shadow-brand/30">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-fg" />
        {sharer} está compartilhando
      </div>

      {/* Picture-in-Picture do Arthur (webcam sobre o gameplay) */}
      {pipImage && (
        <div className="absolute bottom-3 right-3 h-20 w-24 overflow-hidden rounded-md border-2 border-background bg-surface-raised shadow-xl shadow-black/60 sm:h-24 sm:w-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pipImage}
            alt={sharer}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[9px] text-white/90">
            <span className="flex items-center gap-0.5">
              <Mic className="h-2 w-2" />
              {sharer}
            </span>
            <span className="h-1 w-1 rounded-full bg-brand shadow-[0_0_6px_1px_rgba(215,255,63,0.6)]" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder de gameplay caso a imagem real ainda não exista.
 * Um retângulo escuro com HUD desenhado em SVG (life, munição, minimapa).
 */
function FallbackGameplay() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-neutral-900 to-black">
      {/* Vinheta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      {/* Crosshair no centro */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70">
        <div className="relative h-4 w-4">
          <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-brand/80" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-brand/80" />
          <span className="absolute left-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-brand/80" />
          <span className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-brand/80" />
          <span className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
        </div>
      </div>

      {/* HUD: HP + munição */}
      <div className="absolute bottom-3 left-3 space-y-1 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-brand">HP</span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/4 bg-gradient-to-r from-success to-brand" />
          </div>
          <span className="text-[9px] text-white/70">73</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px]">
          <span className="text-brand">AMMO</span>
          <span className="text-white/80">27</span>
          <span className="text-white/40">/ 90</span>
        </div>
      </div>

      {/* Minimapa no canto superior direito */}
      <div className="absolute right-3 top-3 h-12 w-12 rounded-sm border border-brand/40 bg-black/60 backdrop-blur-sm">
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_4px_1px_rgba(215,255,63,0.7)]" />
        <div className="absolute right-1 top-1 h-0.5 w-0.5 rounded-full bg-danger" />
        <div className="absolute left-2 bottom-2 h-0.5 w-0.5 rounded-full bg-danger" />
      </div>
    </div>
  );
}

interface ParticipantTileProps {
  name: string;
  initials: string;
  gradient: string;
  imageSrc?: string;
  micOn?: boolean;
  speaking?: boolean;
  className?: string;
}

function ParticipantTile({
  name,
  initials,
  gradient,
  imageSrc,
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
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div
            className={cn(
              "absolute inset-0 mix-blend-overlay bg-gradient-to-br opacity-40",
              gradient
            )}
          />
        </>
      ) : (
        <>
          <div
            className={cn("absolute inset-0 bg-gradient-to-br", gradient)}
          />
          <div className="absolute inset-0 bg-surface-raised/60 mix-blend-multiply" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-2xl text-text-primary/80">
              {initials}
            </span>
          </div>
        </>
      )}

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
