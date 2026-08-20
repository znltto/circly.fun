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
// O padrão do projeto Conccord é 8 (o Supabase de Arthur enviou 8 dígitos).
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

      <form action={resendAction} className="flex items-center gap-3 text-sm">
        <input type="hidden" name="email" value={email} />
        <span className="text-text-muted">Não recebeu?</span>
        <button
          type="submit"
          disabled={resending}
          className="text-text-secondary underline underline-offset-2 hover:text-text-primary disabled:opacity-50"
        >
          {resending ? "Reenviando..." : "Reenviar código"}
        </button>
        {resendState?.error && (
          <span className="text-danger">{resendState.error}</span>
        )}
      </form>
    </div>
  );
}
