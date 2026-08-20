import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLivekitToken } from "@/lib/livekit/token";
import { resolveInvite } from "@/lib/rooms/actions";
import { makeLivekitIdentity } from "@/lib/rooms/slug";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  slug: z.string().min(1),
  inviteToken: z.string().optional(),
  guestName: z.string().min(1).max(40).optional(),
});

/**
 * POST /api/livekit/token
 * Corpo: { slug, inviteToken?, guestName? }
 *
 * Regras:
 *  - Se o requisitante está logado:
 *    - Host → recebe token com roomAdmin.
 *    - Amigo aceito (visibility='friends') → token de user.
 *    - Portador de convite válido → token de user.
 *  - Se não está logado:
 *    - Precisa de convite válido + allow_guests + guestName → token de guest.
 *  - Sempre valida capacidade máxima.
 *  - Nunca retorna dados privados da sala (título, host, etc.) além do já sabido.
 */
export async function POST(request: Request) {
  // Rate limit: 20 tokens por minuto por IP (mais que suficiente pra
  // uso normal, corta bot loops)
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `livekit-token:${ip}`,
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente em ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

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

  const { slug, inviteToken, guestName } = parsed.data;

  if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    return NextResponse.json(
      { error: "LiveKit não configurado." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Busca a sala (via admin — RLS bloqueia leitura para não-participantes,
  // mas a autorização já é feita explicitamente abaixo).
  const { data: room } = await admin
    .from("rooms")
    .select(
      "id, host_id, title, visibility, allow_guests, max_participants, active, expires_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!room || !room.active) {
    return NextResponse.json({ error: "Sala indisponível." }, { status: 404 });
  }
  if (room.expires_at && new Date(room.expires_at) < new Date()) {
    return NextResponse.json({ error: "Sala expirada." }, { status: 410 });
  }

  // Capacidade
  const { count: activeCount } = await admin
    .from("room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .is("left_at", null);

  if ((activeCount ?? 0) >= room.max_participants) {
    return NextResponse.json({ error: "Sala cheia." }, { status: 409 });
  }

  // Determinar papel e identidade
  let role: "host" | "user" | "guest" = "user";
  let identity: string;
  let displayName: string;
  let profileIdForRecord: string | null = null;
  let guestNameForRecord: string | null = null;

  if (user) {
    // Perfil
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .single();

    displayName = profile?.display_name ?? user.email ?? "Usuário";

    if (user.id === room.host_id) {
      role = "host";
    } else if (room.visibility === "friends") {
      const { data: friendship } = await admin
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${room.host_id}),and(requester_id.eq.${room.host_id},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json(
          { error: "Sem acesso a esta sala." },
          { status: 403 }
        );
      }
    } else {
      // visibility='link' ou 'private' → precisa de convite válido
      const invite = inviteToken
        ? await resolveInvite(slug, inviteToken)
        : null;
      if (!invite) {
        return NextResponse.json(
          { error: "Convite inválido ou expirado." },
          { status: 403 }
        );
      }
    }

    identity = makeLivekitIdentity({ kind: "user", userId: user.id });
    profileIdForRecord = user.id;
  } else {
    // Visitante → precisa de convite + allow_guests + guestName
    if (!inviteToken || !guestName) {
      return NextResponse.json(
        { error: "Faltando convite ou nome." },
        { status: 400 }
      );
    }
    const invite = await resolveInvite(slug, inviteToken);
    if (!invite || !invite.allowGuests) {
      return NextResponse.json(
        { error: "Convite indisponível para visitantes." },
        { status: 403 }
      );
    }
    role = "guest";
    identity = makeLivekitIdentity({ kind: "guest" });
    displayName = guestName.trim().slice(0, 40);
    guestNameForRecord = displayName;
  }

  // Upsert participante ativo
  try {
    await admin.from("room_participants").insert({
      room_id: room.id,
      profile_id: profileIdForRecord,
      guest_name: guestNameForRecord,
      livekit_identity: identity,
    });
  } catch {
    // Se por acaso duplicar (usuário reabrindo a página), ignoramos.
  }

  // Se veio via convite, incrementa uses_count (best-effort, não atômico).
  // Para uso >100 req/s trocar por uma RPC PL/pgSQL com UPDATE ... SET uses_count = uses_count + 1.
  if (inviteToken && (!user || user.id !== room.host_id)) {
    const hashHex = (await import("node:crypto"))
      .createHash("sha256")
      .update(inviteToken)
      .digest("hex");
    const { data: inviteRow } = await admin
      .from("room_invites")
      .select("id, uses_count")
      .eq("token_hash", hashHex)
      .maybeSingle();
    if (inviteRow) {
      await admin
        .from("room_invites")
        .update({ uses_count: inviteRow.uses_count + 1 })
        .eq("id", inviteRow.id);
    }
  }

  const jwt = await createLivekitToken({
    roomName: slug,
    identity,
    name: displayName,
    role,
  });

  return NextResponse.json({
    token: jwt,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    role,
    identity,
    roomTitle: room.title,
  });
}
