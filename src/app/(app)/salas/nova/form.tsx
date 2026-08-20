"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createRoom, type CreateRoomState } from "@/lib/rooms/actions";

export function NovaSalaForm({ appUrl }: { appUrl: string }) {
  const [state, formAction, pending] = useActionState<
    CreateRoomState,
    FormData
  >(createRoom, null);

  if (state?.slug) {
    return <SuccessCard appUrl={appUrl} state={state} />;
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Input
        name="title"
        label="Nome da sala"
        placeholder="Ex: papo de sexta"
        required
        maxLength={60}
        error={state?.error}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-primary">
          Quem pode entrar
        </legend>
        <VisibilityOption
          value="link"
          label="Quem tiver o link"
          description="Você compartilha um link privado. Visitantes podem entrar com um nome."
          defaultChecked
        />
        <VisibilityOption
          value="friends"
          label="Amigos aceitos"
          description="Apenas quem já é seu amigo pode entrar. Sem link público."
        />
        <VisibilityOption
          value="private"
          label="Só eu, por enquanto"
          description="Você cria a sala e depois convida — ninguém entra até liberar."
        />
      </fieldset>

      <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
        <input
          id="allow_guests"
          name="allow_guests"
          type="checkbox"
          defaultChecked
          className="mt-1 h-4 w-4 rounded border-border bg-background accent-brand"
        />
        <label htmlFor="allow_guests" className="text-sm">
          <span className="text-text-primary">Permitir visitantes</span>
          <span className="mt-0.5 block text-text-muted">
            Deixa pessoas sem conta entrarem só com um nome.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="max_participants"
          label="Máximo de participantes"
          type="number"
          min={2}
          max={50}
          defaultValue={10}
        />
        <Input
          name="expires_in_hours"
          label="Expira em (horas)"
          type="number"
          min={0}
          max={720}
          defaultValue={0}
          hint="0 = não expira até você encerrar."
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        rightIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
      >
        Criar sala
      </Button>
    </form>
  );
}

function VisibilityOption({
  value,
  label,
  description,
  defaultChecked,
}: {
  value: "link" | "friends" | "private";
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 transition-colors has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
      <input
        type="radio"
        name="visibility"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 border-border bg-background accent-brand"
      />
      <span className="text-sm">
        <span className="text-text-primary">{label}</span>
        <span className="mt-0.5 block text-text-muted">{description}</span>
      </span>
    </label>
  );
}

function SuccessCard({
  appUrl,
  state,
}: {
  appUrl: string;
  state: NonNullable<CreateRoomState>;
}) {
  const router = useRouter();
  const url = state.inviteToken
    ? `${appUrl}/s/${state.slug}?i=${state.inviteToken}`
    : `${appUrl}/s/${state.slug}`;

  const [copied, setCopied] = React.useState(false);
  const [entering, startEntering] = React.useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem clipboard API — usuário copia manualmente
    }
  }

  function handleEnter() {
    startEntering(() => {
      router.push(`/s/${state.slug}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-brand/40 bg-brand/5 p-6">
        <p className="text-xs font-medium tracking-wide text-brand uppercase">
          Sala criada
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {state.inviteToken
            ? "Compartilhe este link com quem quiser convidar. Ele funciona uma vez enquanto a sala existir."
            : "Você pode gerar convites depois de entrar na sala."}
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 font-mono text-xs text-text-muted">Link de convite</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-sm bg-background px-3 py-2 font-mono text-sm text-text-primary">
            {url}
          </code>
          <Button
            variant="secondary"
            size="md"
            onClick={copyLink}
            leftIcon={
              copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
          >
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleEnter}
          loading={entering}
          disabled={entering}
          rightIcon={!entering ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {entering ? "Abrindo sala..." : "Entrar na sala"}
        </Button>
        <Link href="/inicio">
          <Button variant="ghost" disabled={entering}>
            Voltar
          </Button>
        </Link>
      </div>
    </div>
  );
}
