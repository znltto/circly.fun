"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveOnboarding, type OnboardingState } from "./actions";

interface OnboardingFormProps {
  defaultUsername: string;
  defaultDisplayName: string;
}

export function OnboardingForm({
  defaultUsername,
  defaultDisplayName,
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    null
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Input
        name="display_name"
        label="Nome de exibição"
        hint="1-40 caracteres"
        defaultValue={defaultDisplayName}
        maxLength={40}
        required
        autoComplete="off"
      />
      <Input
        name="username"
        label="@ username"
        hint="letras minúsculas, números, _, 3-24 caracteres"
        defaultValue={defaultUsername}
        maxLength={24}
        required
        autoComplete="off"
        error={state?.error}
      />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        rightIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
      >
        Continuar
      </Button>
    </form>
  );
}
