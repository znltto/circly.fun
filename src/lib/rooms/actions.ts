"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateRoomSlug,
  generateInviteToken,
  hashInviteToken,
} from "./slug";

const createRoomSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Dê um nome curto para a sala.")
    .max(60, "Máximo 60 caracteres."),
  visibility: z.enum(["private", "link", "friends"]).default("link"),
  allow_guests: z.coerce.boolean().default(true),
  lobby_enabled: z.coerce.boolean().default(false),
  e2ee_enabled: z.coerce.boolean().default(false),
  max_participants: z.coerce.number().int().min(2).max(50).default(10),
  expires_in_hours: z.coerce.number().int().min(0).max(720).default(0),
  scheduled_for: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      // datetime-local envia "YYYY-MM-DDTHH:mm" sem timezone. new Date()
      // interpreta como horário local do server, o que dá diferença em
      // deploys em outra região. Assumimos que o navegador do host manda a
      // string na hora local dele; convertemos pra ISO UTC no client em
      // outra iteração se necessário.
      const parsed = new Date(v);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return parsed.toISOString();
    }),
  duration_minutes: z
    .coerce.number()
    .int()
    .min(5)
    .max(720)
    .optional(),
});

export type CreateRoomState =
  | {
      error?: string;
      slug?: string;
      inviteToken?: string;
      e2eeEnabled?: boolean;
    }
  | null;

/**
 * Cria uma sala + um convite inicial se `visibility='link'`.
 * Retorna o slug (sempre) e o token puro (uma única vez).
 */
export async function createRoom(
  _prev: CreateRoomState,
  formData: FormData
): Promise<CreateRoomState> {
  const parsed = createRoomSchema.safeParse({
    title: formData.get("title"),
    visibility: formData.get("visibility") ?? "link",
    allow_guests: formData.get("allow_guests") === "on",
    lobby_enabled: formData.get("lobby_enabled") === "on",
    e2ee_enabled: formData.get("e2ee_enabled") === "on",
    max_participants: formData.get("max_participants") ?? 10,
    expires_in_hours: formData.get("expires_in_hours") ?? 0,
    scheduled_for: formData.get("scheduled_for") ?? undefined,
    duration_minutes:
      formData.get("duration_minutes") === "" ||
      formData.get("duration_minutes") === null
        ? undefined
        : formData.get("duration_minutes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Slug com retry em caso de colisão (raríssima). Insert + select atômico
  // para pegar o `id` da sala sem depender de RLS num SELECT separado.
  let slug = "";
  let roomId: string | null = null;
  const expiresAt =
    parsed.data.expires_in_hours > 0
      ? new Date(
          Date.now() + parsed.data.expires_in_hours * 60 * 60 * 1000
        ).toISOString()
      : null;

  for (let attempt = 0; attempt < 5 && !roomId; attempt++) {
    slug = generateRoomSlug();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        slug,
        host_id: user.id,
        title: parsed.data.title,
        visibility: parsed.data.visibility,
        allow_guests: parsed.data.allow_guests,
        lobby_enabled: parsed.data.lobby_enabled,
        e2ee_enabled: parsed.data.e2ee_enabled,
        max_participants: parsed.data.max_participants,
        expires_at: expiresAt,
        scheduled_for: parsed.data.scheduled_for ?? null,
        duration_minutes: parsed.data.duration_minutes ?? null,
      })
      .select("id")
      .single();

    if (!error && data) {
      roomId = data.id;
      break;
    }
    if (error?.code === "23505") continue; // slug colidiu → tenta outro
    console.error("[createRoom] insert rooms falhou:", error);
    return {
      error: `Não foi possível criar a sala. [${error?.code ?? "?"}] ${error?.message ?? ""}`,
    };
  }

  if (!roomId) return { error: "Falha ao gerar slug único." };

  // Gera convite inicial se a sala aceita link. Usa service role para não
  // depender de RLS aqui — o `created_by` continua sendo o host.
  let inviteToken: string | undefined;
  if (parsed.data.visibility === "link") {
    const token = generateInviteToken();
    const admin = createAdminClient();
    const { error: inviteError } = await admin.from("room_invites").insert({
      room_id: roomId,
      token_hash: hashInviteToken(token),
      created_by: user.id,
      expires_at: expiresAt,
    });

    if (inviteError) {
      console.error("[createRoom] insert room_invites falhou:", inviteError);
      return {
        error: `Sala criada mas convite falhou: ${inviteError.message}`,
        slug,
      };
    }
    inviteToken = token;
  }

  revalidatePath("/inicio");
  return { slug, inviteToken, e2eeEnabled: parsed.data.e2ee_enabled };
}

const endRoomSchema = z.object({ slug: z.string() });

export async function endRoom(slug: string) {
  const parsed = endRoomSchema.safeParse({ slug });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("rooms")
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq("slug", parsed.data.slug)
    .eq("host_id", user.id);

  revalidatePath("/inicio");
  redirect("/inicio");
}

/**
 * Valida um convite: sala ativa, não expirada, usos disponíveis, não revogada.
 * Retorna o room_id se válido, ou null.
 * Usa service role porque tokens de convite são validados sem sessão do host.
 */
export async function resolveInvite(
  slug: string,
  token: string
): Promise<{
  roomId: string;
  hostId: string;
  allowGuests: boolean;
  maxParticipants: number;
  title: string;
} | null> {
  const admin = createAdminClient();

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, host_id, title, allow_guests, max_participants, active, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (roomError) {
    console.warn("[resolveInvite] rooms lookup falhou:", roomError.message);
    return null;
  }
  if (!room) {
    console.warn(`[resolveInvite] sala com slug '${slug}' não existe.`);
    return null;
  }
  if (!room.active) {
    console.warn(`[resolveInvite] sala '${slug}' está inativa.`);
    return null;
  }
  if (room.expires_at && new Date(room.expires_at) < new Date()) {
    console.warn(`[resolveInvite] sala '${slug}' expirou.`);
    return null;
  }

  const tokenHash = hashInviteToken(token);
  const { data: invite, error: inviteError } = await admin
    .from("room_invites")
    .select("id, room_id, expires_at, revoked_at, max_uses, uses_count")
    .eq("room_id", room.id)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteError) {
    console.warn("[resolveInvite] room_invites lookup falhou:", inviteError.message);
    return null;
  }
  if (!invite) {
    console.warn(
      `[resolveInvite] nenhum convite para room=${room.id} hash=${tokenHash.slice(0, 12)}...`
    );
    return null;
  }
  if (invite.revoked_at) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) return null;

  return {
    roomId: room.id,
    hostId: room.host_id,
    allowGuests: room.allow_guests,
    maxParticipants: room.max_participants,
    title: room.title,
  };
}
