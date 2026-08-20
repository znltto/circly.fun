"use client";

import * as React from "react";
import { Mail, Search, Copy } from "lucide-react";
import {
  Button,
  Input,
  OTPInput,
  UserAvatar,
  PresenceIndicator,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CcoMascot, type CcoVariant } from "@/components/brand/CcoMascot";

/**
 * /design — catálogo visual privado do design system.
 * Não vai a produção (não linkado em lugar nenhum, indexação bloqueada abaixo).
 * Use para validar visual e regressões.
 */
export default function DesignSystem() {
  const [otp, setOtp] = React.useState("");

  return (
    <>
      <meta name="robots" content="noindex" />
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
          <header className="flex items-end justify-between border-b border-border pb-6">
            <div>
              <p className="font-mono text-xs text-text-muted">
                catálogo interno
              </p>
              <h1 className="mt-1 font-serif text-3xl">Design System</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <BrandMark className="h-4 w-4 text-brand" />
              <Wordmark />
              <span className="font-mono">v0.1</span>
            </div>
          </header>

          <Section title="Marca">
            <div className="grid gap-6 md:grid-cols-3">
              <Card label="BrandMark">
                <div className="flex items-center gap-6">
                  <BrandMark className="h-8 w-8 text-brand" />
                  <BrandMark className="h-12 w-12 text-brand" />
                  <BrandMark className="h-16 w-16 text-brand" />
                </div>
              </Card>
              <Card label="Wordmark">
                <div className="space-y-3">
                  <Wordmark className="text-2xl" />
                  <Wordmark className="text-base text-text-secondary" />
                </div>
              </Card>
              <Card label="Composto">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="h-6 w-6 text-brand" />
                  <Wordmark className="text-base" />
                </div>
              </Card>
            </div>
          </Section>

          <Section title="Cores">
            <div className="grid gap-3 md:grid-cols-6">
              <Swatch className="bg-background border" label="background" />
              <Swatch className="bg-surface" label="surface" />
              <Swatch className="bg-surface-raised" label="raised" />
              <Swatch className="bg-surface-hover" label="hover" />
              <Swatch className="bg-brand" label="brand" darkText />
              <Swatch className="bg-brand-hover" label="brand-hover" darkText />
              <Swatch className="bg-success" label="success" darkText />
              <Swatch className="bg-warning" label="warning" darkText />
              <Swatch className="bg-danger" label="danger" />
              <Swatch className="bg-focus" label="focus" darkText />
              <Swatch className="bg-border" label="border" />
              <Swatch className="bg-text-primary" label="text" darkText />
            </div>
          </Section>

          <Section title="Tipografia">
            <div className="space-y-4">
              <p className="font-display text-[56px] leading-[1.05]">
                Perto, mesmo de longe.
              </p>
              <p className="font-display text-3xl">Bowlby One display</p>
              <p className="text-xl">Título de seção — Nunito Sans</p>
              <p className="text-base">
                Corpo de texto padrão. Nunito Sans 16 / 24.
              </p>
              <p className="text-sm text-text-secondary">
                Texto secundário — 14 / 20.
              </p>
              <p className="text-xs text-text-muted">
                Metadata e legendas — 12 / 16.
              </p>
              <p className="font-mono text-sm text-text-secondary">
                circly.app/s/ab12cd
              </p>
            </div>
          </Section>

          <Section title="Botões">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button leftIcon={<Mail className="h-4 w-4" />}>
                  Com ícone
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Inputs">
            <div className="grid gap-6 md:grid-cols-2">
              <Input
                label="Email"
                placeholder="voce@email.com"
                type="email"
                leftAdornment={<Mail className="h-4 w-4" />}
                hint="Enviaremos um código de 6 dígitos."
              />
              <Input
                label="Buscar amigo"
                placeholder="username"
                leftAdornment={<Search className="h-4 w-4" />}
              />
              <Input
                label="Erro"
                defaultValue="não_existe"
                error="Este username não foi encontrado."
              />
              <Input
                label="Link da sala"
                readOnly
                defaultValue="circly.app/s/ab12cd"
                rightAdornment={<Copy className="h-4 w-4" />}
              />
            </div>
          </Section>

          <Section title="OTP">
            <div className="max-w-sm space-y-4">
              <OTPInput
                value={otp}
                onChange={setOtp}
                onComplete={(v) => console.log("completo:", v)}
                autoFocus
              />
              <p className="text-xs text-text-muted">
                Digite ou cole um código. Estado atual:{" "}
                <span className="font-mono text-text-secondary">
                  {otp || "vazio"}
                </span>
              </p>
            </div>
          </Section>

          <Section title="Avatares e presença">
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <UserAvatar name="Arthur Fernandes" size="sm" status="online" />
                <UserAvatar name="Arthur Fernandes" size="md" status="in-call" />
                <UserAvatar name="Arthur Fernandes" size="lg" status="busy" />
                <UserAvatar name="Arthur Fernandes" size="xl" status="offline" />
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <PresenceIndicator status="online" showLabel />
                <PresenceIndicator status="in-call" showLabel />
                <PresenceIndicator status="busy" showLabel />
                <PresenceIndicator status="offline" showLabel />
              </div>
            </div>
          </Section>

          <Section title="Mascote CCO — todas as variantes">
            <div className="grid gap-6 md:grid-cols-4">
              {(
                [
                  "idle",
                  "waiting",
                  "offline",
                  "muted",
                  "camera-off",
                  "connection-error",
                  "goodbye",
                ] as CcoVariant[]
              ).map((variant) => (
                <Card key={variant} label={variant}>
                  <div className="flex justify-center">
                    <CcoMascot
                      variant={variant}
                      className="h-20 w-20 text-text-primary"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section title="EmptyState">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface">
                <EmptyState
                  mascot="waiting"
                  title="Ninguém por aqui, ainda."
                  description="Assim que alguém entrar pelo link, você verá aparecer."
                  action={<Button variant="secondary">Copiar link</Button>}
                />
              </div>
              <div className="rounded-lg border border-border bg-surface">
                <EmptyState
                  mascot="connection-error"
                  title="Não conseguimos conectar."
                  description="Verifique sua internet e tente novamente."
                  action={<Button>Tentar de novo</Button>}
                />
              </div>
            </div>
          </Section>

          <Section title="Skeleton">
            <div className="max-w-md space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </>
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
    <section className="space-y-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Swatch({
  className,
  label,
  darkText,
}: {
  className: string;
  label: string;
  darkText?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`h-16 rounded-md border-border ${className}`} />
      <p
        className={`font-mono text-[10px] uppercase tracking-wider ${
          darkText ? "text-text-muted" : "text-text-muted"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
