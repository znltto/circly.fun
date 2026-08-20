import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canFriendJoin } from "@/lib/rooms/queries";
import { resolveInvite } from "@/lib/rooms/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoomController } from "@/components/room/RoomController";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ i?: string }>;
}

export default async function SalaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { i: inviteToken } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Autorização
  let authorized = false;
  let roomTitle = "";
  let displayName = "";

  if (user) {
    const access = await canFriendJoin(slug);
    if (access) {
      authorized = true;
      roomTitle = access.title;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      displayName = profile?.display_name ?? "Você";
    } else if (inviteToken) {
      const invite = await resolveInvite(slug, inviteToken);
      if (invite) {
        authorized = true;
        roomTitle = invite.title;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        displayName = profile?.display_name ?? "Você";
      }
    }
  } else if (inviteToken) {
    const invite = await resolveInvite(slug, inviteToken);
    if (invite && invite.allowGuests) {
      authorized = true;
      roomTitle = invite.title;
      displayName = "";
    }
  }

  if (!authorized) {
    return <AccessDenied slug={slug} />;
  }

  // Contagem inicial de participantes + flag de consentimento (via admin,
  // evita depender de RLS aqui)
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, recording_consent_required")
    .eq("slug", slug)
    .single();

  let participantCount = 0;
  let requiresRecordingConsent = false;
  if (room) {
    const { count } = await admin
      .from("room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .is("left_at", null);
    participantCount = count ?? 0;
    requiresRecordingConsent = room.recording_consent_required ?? false;
  }

  return (
    <RoomController
      slug={slug}
      inviteToken={inviteToken}
      isAuthenticated={!!user}
      initialDisplayName={displayName}
      roomTitle={roomTitle}
      participantCount={participantCount}
      requiresRecordingConsent={requiresRecordingConsent}
    />
  );
}

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-brand" />
          <Wordmark className="text-sm" />
        </Link>
        <span className="font-mono text-xs text-text-muted">/s/{slug}</span>
      </header>

      <section className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            mascot="connection-error"
            title="Sem acesso a esta sala."
            description="O link pode ter expirado, ter sido revogado, ou você precisa entrar com sua conta."
            action={
              <Link href="/">
                <Button variant="secondary">Voltar ao início</Button>
              </Link>
            }
          />
        </div>
      </section>
    </main>
  );
}
