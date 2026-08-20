"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { OTPInput } from "@/components/ui/OTPInput";
import {
  verifyCode,
  resendCode,
  type VerifyState,
} from "./actions";

// Supabase pode ser configurado com OTP de 6, 7 ou 8 dígitos.
// O padrão do projeto Circly é 8 (o Supabase de Arthur enviou 8 dígitos).
const OTP_LENGTH = 8;

export function VerificarForm({ email }: { email: string }) {
  const [code, setCode] = React.useState("");
  const [verifyState, verifyAction, verifying] = useActionState<
    VerifyState,
    FormData
  >(verifyCode, null);

  const [resendState, resendAction, resending] = useActionState<
    VerifyState,
    FormData
  >(resendCode, null);

  // Timer de reenvio (segundos restantes). Alimentado pelo `retryAfter`
  // que a server action devolve quando bate no rate limit.
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendState?.retryAfter && resendState.retryAfter > 0) {
      setCooldown(resendState.retryAfter);
    }
  }, [resendState]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const canResend = !resending && cooldown === 0;

  return (
    <div className="space-y-6">
      <form action={verifyAction} className="space-y-6" noValidate>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={code} />

        <OTPInput
          length={OTP_LENGTH}
          value={code}
          onChange={setCode}
          autoFocus
          error={verifyState?.error}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={code.length !== OTP_LENGTH}
          loading={verifying}
        >
          Entrar
        </Button>
      </form>

      <form
        action={resendAction}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      >
        <input type="hidden" name="email" value={email} />
        <span className="text-text-muted">Não recebeu?</span>
        <button
          type="submit"
          disabled={!canResend}
          className="text-text-secondary underline underline-offset-2 hover:text-text-primary disabled:no-underline disabled:opacity-50"
        >
          {resending
            ? "Reenviando..."
            : cooldown > 0
              ? `Reenviar em ${formatCooldown(cooldown)}`
              : "Reenviar código"}
        </button>
        {resendState?.error && cooldown === 0 && (
          <span className="text-danger">{resendState.error}</span>
        )}
      </form>
    </div>
  );
}

function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec.toString().padStart(2, "0")}s`;
}
