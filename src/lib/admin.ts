/**
 * Lista de emails com acesso ao painel admin.
 *
 * Comparação case-insensitive contra o email da sessão Supabase.
 * Os 3 emails cobrem: OTP (arthur@endogest.com.br), Google OAuth
 * e Discord OAuth (ambos com arthurczfernandes@gmail.com).
 *
 * Se quiser adicionar/remover admins, edite aqui. É segredo relativo
 * (não é sensível — só uma allowlist).
 */
export const ADMIN_EMAILS: readonly string[] = [
  "arthur@endogest.com.br",
  "arthurczfernandes@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === normalized);
}
