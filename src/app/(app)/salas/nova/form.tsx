"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, ArrowRight, ShieldCheck } from "lucide-react";
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

      <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
        <input
          id="lobby_enabled"
          name="lobby_enabled"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border bg-background accent-brand"
        />
        <label htmlFor="lobby_enabled" className="text-sm">
          <span className="text-text-primary">Sala de espera</span>
          <span className="mt-0.5 block text-text-muted">
            Novas pessoas ficam aguardando você aprovar antes de entrar.
            Recomendado pra reunião com pessoas de fora.
          </span>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
        <input
          id="e2ee_enabled"
          name="e2ee_enabled"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border bg-background accent-brand"
        />
        <label htmlFor="e2ee_enabled" className="text-sm">
          <span className="flex items-center gap-1.5 text-text-primary">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            Criptografia ponta-a-ponta
          </span>
          <span className="mt-0.5 block text-text-muted">
            O servidor nunca vê áudio/vídeo. A chave vai no fim do link
            (parte depois do <code className="font-mono">#</code>) — quem
            recebe o link já entra. <strong>Desativa a gravação</strong>.
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

      <ScheduleFields />

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

function ScheduleFields() {
  const [localValue, setLocalValue] = React.useState("");

  // Converte "YYYY-MM-DDTHH:mm" (hora local do browser) → ISO absoluto pro
  // hidden field que a server action lê. Se vazio, hidden fica vazio.
  const isoValue = React.useMemo(() => {
    if (!localValue) return "";
    const d = new Date(localValue);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [localValue]);

  return (
    <fieldset className="rounded-md border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-medium text-text-primary">
        Agendar (opcional)
      </legend>
      <p className="mb-3 text-xs text-text-muted">
        Se preencher, aparece nas suas próximas reuniões. Convidados que
        chegarem antes veem uma contagem regressiva.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="scheduled_for_local"
            className="block text-xs font-medium text-text-secondary"
          >
            Começa em
          </label>
          <input
            id="scheduled_for_local"
            type="datetime-local"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-focus focus:outline-none"
          />
          <p className="text-[11px] text-text-muted">
            {isoValue
              ? `Fuso do seu navegador (será registrado como ${new Date(
                  isoValue
                ).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}).`
              : "Fuso do seu navegador."}
          </p>
          <input type="hidden" name="scheduled_for" value={isoValue} />
        </div>
        <Input
          name="duration_minutes"
          label="Duração (min)"
          type="number"
          min={5}
          max={720}
          placeholder="30"
          hint="Só para contexto — não encerra sozinho."
        />
      </div>
    </fieldset>
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

  // Chave E2EE gerada só no client — nunca sai daqui a não ser via fragmento
  // do link, que o navegador não envia pro server.
  const e2eeKey = React.useMemo(() => {
    if (!state.e2eeEnabled) return "";
    try {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      return btoa(String.fromCharCode(...bytes))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    } catch {
      return "";
    }
  }, [state.e2eeEnabled]);

  const baseUrl = state.inviteToken
    ? `${appUrl}/s/${state.slug}?i=${state.inviteToken}`
    : `${appUrl}/s/${state.slug}`;
  const url = e2eeKey ? `${baseUrl}#k=${e2eeKey}` : baseUrl;

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
      // Preserva o fragmento (chave E2EE) na navegação
      const target = e2eeKey
        ? `/s/${state.slug}#k=${e2eeKey}`
        : `/s/${state.slug}`;
      router.push(target);
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

      {state.e2eeEnabled && (
        <div className="rounded-md border border-brand/40 bg-brand/5 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-brand">
            <ShieldCheck className="h-4 w-4" />
            Sala com criptografia ponta-a-ponta
          </p>
          <p className="mt-2 text-text-secondary">
            A chave de criptografia está no fim do link, depois do{" "}
            <code className="font-mono">#</code>. Sem esse trecho, o
            convidado não decodifica a chamada. Guarde e compartilhe o link
            inteiro. A gravação está desabilitada.
          </p>
        </div>
      )}

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
