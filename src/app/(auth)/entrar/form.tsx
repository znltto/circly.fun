"use client";

import * as React from "react";
import { useActionState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import { DiscordIcon } from "@/components/brand/DiscordIcon";
import { sendCode, signInWithOAuth, type SendCodeState } from "./actions";

export function EntrarForm() {
  const [state, formAction, pending] = useActionState<SendCodeState, FormData>(
    sendCode,
    null
  );

  const [oauthLoading, setOauthLoading] = React.useState<
    "google" | "discord" | null
  >(null);
  const [oauthError, setOauthError] = React.useState<string | null>(null);

  async function handleOAuth(provider: "google" | "discord") {
    setOauthLoading(provider);
    setOauthError(null);
    const result = await signInWithOAuth(provider);
    // Se chegou aqui é porque signInWithOAuth NÃO redirecionou → erro
    if (result?.error) {
      setOauthError(result.error);
    }
    setOauthLoading(null);
  }

  return (
    <div className="space-y-6">
      {/* Botões OAuth */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {oauthLoading === "google" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Continuar com Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("discord")}
          disabled={!!oauthLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-md bg-[#5865F2] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {oauthLoading === "discord" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <DiscordIcon className="h-4 w-4" />
          )}
          Continuar com Discord
        </button>

        {oauthError && (
          <p role="alert" className="text-xs text-danger">
            {oauthError}
          </p>
        )}
      </div>

      {/* Divisor */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            ou por email
          </span>
        </div>
      </div>

      {/* Formulário de email */}
      <form action={formAction} className="space-y-4" noValidate>
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="voce@email.com"
          autoComplete="email"
          required
          leftAdornment={<Mail className="h-4 w-4" />}
          error={state?.error}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          rightIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          Enviar código
        </Button>
      </form>
    </div>
  );
}
