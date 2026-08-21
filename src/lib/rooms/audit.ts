import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RoomAction =
  | "join"
  | "leave"
  | "mute-audio"
  | "mute-video"
  | "mute-screen"
  | "kick"
  | "lock"
  | "unlock"
  | "lobby-on"
  | "lobby-off"
  | "lobby-admit"
  | "lobby-deny"
  | "host-transfer"
  | "recording-start"
  | "recording-stop";

interface LogInput {
  roomId: string;
  action: RoomAction;
  actorProfileId?: string | null;
  actorDisplayName?: string | null;
  targetProfileId?: string | null;
  targetDisplayName?: string | null;
  detail?: string | null;
}

/**
 * Grava uma ação no log de auditoria da sala. Best-effort: falha na gravação
 * não afeta o fluxo principal (chama-se via `void logRoomAction(...)`).
 */
export async function logRoomAction(input: LogInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("room_actions_log").insert({
      room_id: input.roomId,
      action: input.action,
      actor_profile_id: input.actorProfileId ?? null,
      actor_display_name: input.actorDisplayName ?? null,
      target_profile_id: input.targetProfileId ?? null,
      target_display_name: input.targetDisplayName ?? null,
      detail: input.detail ?? null,
    });
  } catch (err) {
    console.warn("[audit] logRoomAction falhou:", err);
  }
}
