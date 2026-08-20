import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * SERVICE ROLE client. Bypasses RLS. Use ONLY in server code
 * for privileged operations (e.g. issuing LiveKit tokens, admin actions).
 *
 * Never import from a Client Component. Never expose the key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Verifique .env.local."
    );
  }

  return createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
