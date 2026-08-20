"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Form leve para visitante: pega o nome, guarda em sessionStorage
 * e redireciona pra tela de sala. O registro real acontece
 * quando o cliente pedir o token LiveKit (Fase 7).
 */
export function GuestJoinForm({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 40) {
      setError("Use entre 1 e 40 caracteres.");
      return;
    }
    setError(null);
    try {
      sessionStorage.setItem(`circly:guest:${slug}`, clean);
    } catch {
      // storage bloqueado — segue mesmo assim; a sala pedirá de novo
    }
    startTransition(() => {
      router.push(`/s/${slug}/sala?i=${token}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input
        label="Seu nome"
        placeholder="Como te chamam?"
        value={name}
        onChange={(e) => setName(e.target.value)}
        leftAdornment={<User className="h-4 w-4" />}
        maxLength={40}
        autoFocus
        required
        error={error ?? undefined}
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
