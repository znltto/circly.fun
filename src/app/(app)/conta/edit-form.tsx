"use client";

import * as React from "react";
import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserAvatar } from "@/components/ui/Avatar";
import { updateProfile, type UpdateProfileState } from "./actions";

interface EditFormProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  /** Mantido no tipo pra compatibilidade — não exposto na UI. */
  statusEmoji?: string | null;
}

export function EditForm({
  displayName,
  username,
  avatarUrl,
  statusMessage,
}: EditFormProps) {
  const [state, formAction, pending] = useActionState<
    UpdateProfileState,
    FormData
  >(updateProfile, null);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(avatarUrl);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        setUploadError(body.error ?? "Falha ao subir imagem.");
      } else {
        setPreviewUrl(body.url);
      }
    } catch {
      setUploadError("Erro de rede.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-serif text-lg text-text-primary">Perfil</h2>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="relative">
          <UserAvatar name={displayName} src={previewUrl} size="xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Trocar avatar"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg hover:bg-brand-hover disabled:opacity-50"
          >
            {uploading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-fg border-t-transparent" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleUpload}
        />
        <p className="text-xs text-text-muted">
          JPG, PNG, WebP ou GIF. Máximo 2 MB.
        </p>
        {uploadError && (
          <p role="alert" className="text-xs text-danger">
            {uploadError}
          </p>
        )}
      </div>

      <form action={formAction} className="mt-8 space-y-4" noValidate>
        <Input
          name="display_name"
          label="Nome de exibição"
          hint="1-40 caracteres"
          defaultValue={displayName}
          maxLength={40}
          required
          autoComplete="off"
        />
        <Input
          name="username"
          label="@ username"
          hint="letras minúsculas, números, _, 3-24 caracteres"
          defaultValue={username}
          maxLength={24}
          required
          autoComplete="off"
          error={state?.error}
        />

        <div className="pt-2">
          <Input
            name="status_message"
            label="Status"
            hint="Uma mensagem curta que aparece do lado do seu nome."
            placeholder="Ex: focado, voltarei em 5min…"
            defaultValue={statusMessage ?? ""}
            maxLength={60}
            aria-label="Mensagem do status"
          />
        </div>

        {state?.success && (
          <p className="text-xs text-success" role="status">
            Alterações salvas.
          </p>
        )}

        <Button type="submit" loading={pending}>
          Salvar alterações
        </Button>
      </form>
    </div>
  );
}
