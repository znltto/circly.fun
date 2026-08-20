import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Guard duro do painel admin. Só emails da allowlist entram.
 * Redireciona pra /inicio se o usuário logado não for admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");
  if (!isAdminEmail(user.email)) redirect("/inicio");

  return <>{children}</>;
}
