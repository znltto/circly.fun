"use client";

import { useActionState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendCode, type SendCodeState } from "./actions";

export function EntrarForm() {
  const [state, formAction, pending] = useActionState<SendCodeState, FormData>(
    sendCode,
    null
  );

  return (
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
  );
}
