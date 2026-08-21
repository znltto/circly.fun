import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  kickParticipant,
  mutePublishedTrack,
} from "@/lib/livekit/room-service";
import { logRoomAction, type RoomAction } from "@/lib/rooms/audit";

const bodySchema = z.object({
  slug: z.string().min(1),
  identity: z.string().min(1),
  action: z.enum(["mute-audio", "mute-video", "mute-screen", "kick"]),
});

/**
 * POST /api/livekit/moderate
 *
 * Só o host da sala pode executar. Valida no server via Supabase session
 * → busca `rooms.host_id` e compara com `auth.uid()`.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { slug, identity, action } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, host_id, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }

  if (room.host_id !== user.id) {
    return NextResponse.json(
      { error: "Só o host pode moderar." },
      { status: 403 }
    );
  }

  // Host não pode moderar a si mesmo (mecanismo de autoproteção)
  if (identity.startsWith(`u:${user.id}`)) {
    return NextResponse.json(
      { error: "Você não pode moderar a si mesmo." },
      { status: 400 }
    );
  }

  try {
    if (action === "kick") {
      await kickParticipant(slug, identity);
    } else if (action === "mute-audio") {
      await mutePublishedTrack(slug, identity, "audio");
    } else if (action === "mute-video") {
      await mutePublishedTrack(slug, identity, "video");
    } else if (action === "mute-screen") {
      await mutePublishedTrack(slug, identity, "screen_share");
    }
  } catch (err) {
    console.error("[moderate] falhou:", err);
    return NextResponse.json(
      { error: "Falha ao aplicar ação." },
      { status: 500 }
    );
  }

  // Resolve nomes pra deixar o log legível na UI do host.
  const [{ data: actor }, { data: participant }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    admin
      .from("room_participants")
      .select("guest_name, profile_id")
      .eq("room_id", room.id)
      .eq("livekit_identity", identity)
      .maybeSingle(),
  ]);

  let targetName = participant?.guest_name ?? null;
  if (!targetName && participant?.profile_id) {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", participant.profile_id)
      .maybeSingle();
    targetName = targetProfile?.display_name ?? null;
  }

  void logRoomAction({
    roomId: room.id,
    action: action as RoomAction,
    actorProfileId: user.id,
    actorDisplayName: actor?.display_name ?? null,
    targetProfileId: participant?.profile_id ?? null,
    targetDisplayName: targetName,
  });

  return NextResponse.json({ ok: true });
}
