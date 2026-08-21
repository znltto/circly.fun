"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  KeyRound,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { InviteFriendsPanel } from "@/components/rooms/InviteFriendsPanel";
import { createRoom, type CreateRoomState } from "@/lib/rooms/actions";

type Visibility = "link" | "friends" | "private";

const EXPIRES_OPTIONS = [
  { value: "0", label: "Não expira automaticamente" },
  { value: "1", label: "1 hora" },
  { value: "6", label: "6 horas" },
  { value: "24", label: "1 dia" },
  { value: "72", label: "3 dias" },
  { value: "168", label: "7 dias" },
  { value: "720", label: "30 dias" },
];

const DURATION_OPTIONS = [
  { value: "", label: "Sem duração definida" },
  { value: "15", label: "15 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1 h 30 min" },
  { value: "120", label: "2 horas" },
];

const MAX_PARTICIPANTS_OPTIONS = [
  { value: "2", label: "2 pessoas — 1 a 1" },
  { value: "4", label: "Até 4 pessoas" },
  { value: "8", label: "Até 8 pessoas" },
  { value: "12", label: "Até 12 pessoas" },
  { value: "20", label: "Até 20 pessoas" },
  { value: "30", label: "Até 30 pessoas" },
  { value: "50", label: "Até 50 pessoas" },
];

export function NovaSalaForm({ appUrl }: { appUrl: string }) {
  const [state, formAction, pending] = useActionState<
    CreateRoomState,
    FormData
  >(createRoom, null);

  const [visibility, setVisibility] = React.useState<Visibility>("link");
  const [allowGuests, setAllowGuests] = React.useState(true);
  const [lobbyEnabled, setLobbyEnabled] = React.useState(false);
  const [e2eeEnabled, setE2eeEnabled] = React.useState(false);
  const [maxParticipants, setMaxParticipants] = React.useState("10");
  const [expiresInHours, setExpiresInHours] = React.useState("0");
  const [scheduleEnabled, setScheduleEnabled] = React.useState(false);
  const [scheduledIso, setScheduledIso] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("");

  if (state?.slug) {
    return <SuccessCard appUrl={appUrl} state={state} />;
  }

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <SectionCard
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        title="Identidade"
        description="Um nome curto pra reconhecer a sala mais tarde."
      >
        <Input
          name="title"
          label="Nome da sala"
          placeholder="Ex: papo de sexta"
          required
          maxLength={60}
          error={state?.error}
        />
      </SectionCard>

      <SectionCard
        icon={<Users className="h-4 w-4" aria-hidden />}
        title="Quem pode entrar"
        description="Escolha o tipo de acesso. Isso não muda depois."
      >
        <div className="space-y-2.5">
          <VisibilityOption
            value="link"
            current={visibility}
            onSelect={setVisibility}
            icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}
            label="Quem tiver o link"
            description="Um link privado. Visitantes podem entrar informando um nome."
          />
          <VisibilityOption
            value="friends"
            current={visibility}
            onSelect={setVisibility}
            icon={<Users className="h-3.5 w-3.5" aria-hidden />}
            label="Amigos aceitos"
            description="Apenas quem já é seu amigo pode entrar. Sem link público."
          />
          <VisibilityOption
            value="private"
            current={visibility}
            onSelect={setVisibility}
            icon={<Lock className="h-3.5 w-3.5" aria-hidden />}
            label="Só eu, por enquanto"
            description="Você cria a sala e convida depois — ninguém entra até liberar."
          />
        </div>
        <input type="hidden" name="visibility" value={visibility} />
      </SectionCard>

      <SectionCard
        icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        title="Segurança e acesso"
        description="Controles opcionais pra apertar o cerco na entrada."
      >
        <div className="space-y-2.5">
          <Switch
            name="allow_guests"
            checked={allowGuests}
            onChange={setAllowGuests}
            label="Permitir visitantes"
            description="Deixa pessoas sem conta entrarem só com um nome."
          />
          <Switch
            name="lobby_enabled"
            checked={lobbyEnabled}
            onChange={setLobbyEnabled}
            label="Sala de espera"
            description="Novas pessoas aguardam sua aprovação antes de entrar. Recomendado pra reunião com pessoas de fora."
          />
          <Switch
            name="e2ee_enabled"
            checked={e2eeEnabled}
            onChange={setE2eeEnabled}
            icon={<KeyRound className="h-3.5 w-3.5 text-brand" aria-hidden />}
            label="Criptografia ponta-a-ponta"
            description={
              <>
                O servidor nunca vê áudio/vídeo. A chave vai no fim do link
                (parte depois do <code className="font-mono">#</code>) — quem
                recebe o link já entra. <strong>Desativa a gravação.</strong>
              </>
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Users className="h-4 w-4" aria-hidden />}
        title="Limites"
        description="Quantas pessoas cabem e por quanto tempo a sala fica de pé."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Máximo de participantes"
            value={maxParticipants}
            onChange={setMaxParticipants}
            options={MAX_PARTICIPANTS_OPTIONS}
          />
          <Select
            label="Sala expira em"
            value={expiresInHours}
            onChange={setExpiresInHours}
            options={EXPIRES_OPTIONS}
          />
        </div>
        <input
          type="hidden"
          name="max_participants"
          value={maxParticipants}
        />
        <input
          type="hidden"
          name="expires_in_hours"
          value={expiresInHours}
        />
      </SectionCard>

      <SectionCard
        icon={<CalendarClock className="h-4 w-4" aria-hidden />}
        title="Agendamento"
        description="Aparece nas próximas reuniões. Quem chegar antes vê contagem regressiva."
      >
        <Switch
          checked={scheduleEnabled}
          onChange={(next) => {
            setScheduleEnabled(next);
            if (!next) {
              setScheduledIso("");
              setDurationMinutes("");
            }
          }}
          label="Agendar essa sala"
          description={
            scheduleEnabled
              ? "Escolha data, horário e duração abaixo."
              : "Deixe desligado se for reunião agora."
          }
        />

        {scheduleEnabled && (
          <div className="grid gap-4 pt-1 md:grid-cols-2">
            <DateTimePicker
              name="scheduled_for"
              label="Começa em"
              value={scheduledIso}
              onChange={setScheduledIso}
              minDate={new Date()}
              hint="Fuso do seu navegador."
            />
            <Select
              label="Duração estimada"
              value={durationMinutes}
              onChange={setDurationMinutes}
              options={DURATION_OPTIONS}
              placeholder="Sem duração definida"
            />
            {durationMinutes !== "" && (
              <input
                type="hidden"
                name="duration_minutes"
                value={durationMinutes}
              />
            )}
          </div>
        )}
      </SectionCard>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-10 -mx-2 rounded-lg border border-border/60 bg-surface/95 p-3 shadow-lg shadow-black/30 backdrop-blur">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          rightIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          Criar sala
        </Button>
      </div>
    </form>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VisibilityOption({
  value,
  current,
  onSelect,
  label,
  description,
  icon,
}: {
  value: Visibility;
  current: Visibility;
  onSelect: (next: Visibility) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={cnBase(
        "flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors",
        selected
          ? "border-brand/50 bg-brand/5"
          : "border-border bg-surface hover:border-border/80 hover:bg-surface-hover"
      )}
    >
      <span
        className={cnBase(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-brand bg-brand" : "border-border bg-background"
        )}
      >
        {selected && (
          <span className="h-1.5 w-1.5 rounded-full bg-brand-fg" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="flex items-center gap-1.5 text-text-primary">
          {icon}
          {label}
        </span>
        <span className="mt-0.5 block text-text-muted">{description}</span>
      </span>
    </button>
  );
}

// utilitário local — evita import extra do cn nesse arquivo de client component
function cnBase(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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

      <InviteFriendsPanel roomSlug={state.slug!} appUrl={appUrl} />

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
