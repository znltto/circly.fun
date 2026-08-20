"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteAccount } from "./actions";

interface DeleteDialogProps {
  username: string;
}

export function DeleteDialog({ username }: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const expected = `@${username}`;
  const canDelete = confirmValue === expected && !pending;

  function handleCancel() {
    if (pending) return;
    setOpen(false);
    setConfirmValue("");
    setError(null);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
      } catch {
        setError("Não foi possível apagar. Tente novamente.");
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border border-danger/40 bg-danger/5 p-6">
        <h2 className="font-serif text-lg text-danger">Apagar conta</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Isso apaga permanentemente sua conta, seus amigos, suas salas e todo
          o histórico. Não dá pra desfazer.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="danger"
            onClick={() => setOpen(true)}
          >
            Apagar conta...
          </Button>
        </div>
      </div>

      {open && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-6"
          >
            <h3
              id="delete-account-title"
              className="font-serif text-lg text-text-primary"
            >
              Você tem certeza?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Isso é irreversível. Para confirmar, digite{" "}
              <code className="font-mono text-text-primary">{expected}</code>{" "}
              abaixo.
            </p>

            <div className="mt-4">
              <Input
                name="confirm"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={expected}
                autoComplete="off"
                autoFocus
                error={error ?? undefined}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!canDelete}
                loading={pending}
                onClick={handleDelete}
              >
                Apagar para sempre
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
