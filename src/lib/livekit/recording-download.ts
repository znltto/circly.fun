import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gera uma URL assinada de download para uma gravação. TTL curto (5 min).
 * Usa service role — mas o caller precisa ter validado antes que o user
 * tem acesso à sala.
 */
export async function createRecordingSignedUrl(
  storagePath: string
): Promise<string | null> {
  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 5);

  if (error || !data) {
    console.warn("[recording-download] createSignedUrl falhou:", error);
    return null;
  }
  return data.signedUrl;
}
