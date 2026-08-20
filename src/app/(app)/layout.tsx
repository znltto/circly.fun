import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { isAdminEmail } from "@/lib/admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status_message, status_emoji")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Trigger de criação não rodou por algum motivo — cria mínimo aqui.
    // (Também pode indicar que a migration 0001 não foi aplicada.)
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-sm text-text-secondary">
        <p>
          Não encontramos seu perfil. Se você acabou de se cadastrar, aguarde
          alguns segundos e recarregue. Se persistir, verifique se a migration
          0001_profiles.sql foi aplicada no Supabase.
        </p>
      </main>
    );
  }

  const isAdmin = isAdminEmail(user.email);

  return (
    <AppShell user={profile} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
