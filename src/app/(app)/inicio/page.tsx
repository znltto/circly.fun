import Link from "next/link";
import Image from "next/image";
import { Link2, Plus, Calendar, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listFriendships } from "@/lib/friends/queries";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendRowCompact } from "@/components/friends/FriendRow";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Início" };

export default async function InicioPage() {
  const supabase = await createClient();
  const t = await getT();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const friendships = await listFriendships();
  const accepted = friendships.filter((f) => f.status === "accepted");
  const incomingCount = friendships.filter(
    (f) => f.status === "pending" && f.direction === "incoming"
  ).length;

  const { data: nextRooms } = user
    ? await supabase
        .from("rooms")
        .select("slug, title, scheduled_for, duration_minutes")
        .eq("host_id", user.id)
        .eq("active", true)
        .not("scheduled_for", "is", null)
        .gte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(3)
    : { data: [] };

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("home.greetingMorning")
      : hour < 18
      ? t("home.greetingAfternoon")
      : t("home.greetingEvening");
  const displayName = profile?.display_name ?? t("home.fallbackName");

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="text-sm text-text-secondary">
        {greeting},{" "}
        <span className="text-text-primary">{displayName}</span>.
      </p>
      <h1 className="mt-1 font-serif text-3xl md:text-4xl text-balance">
        {t("home.heading")}
      </h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/salas/nova">
          <Button size="lg" leftIcon={<Plus className="h-4 w-4" />}>
            {t("home.newRoomCta")}
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="lg"
          leftIcon={<Link2 className="h-4 w-4" />}
          disabled
          title={t("home.joinDisabledHint")}
        >
          {t("home.joinWithLink")}
        </Button>
      </div>

      {incomingCount > 0 && (
        <Link
          href="/pessoas"
          className="mt-8 inline-flex items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-text-primary"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {incomingCount === 1
            ? t("home.friendRequestsOne")
            : t("home.friendRequestsMany", { count: incomingCount })}
          <span className="text-text-muted">{t("home.friendRequestsSee")}</span>
        </Link>
      )}

      <Link
        href="/salas/nova"
        aria-label={t("home.newRoomCta")}
        className="mt-10 block overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-brand/40 hover:shadow-[0_0_0_1px_hsl(var(--brand)/0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Image
          src="/banner.png"
          alt="Circly — Converse com o seu círculo"
          width={1094}
          height={378}
          sizes="(max-width: 768px) 100vw, 720px"
          priority
          className="h-auto w-full"
        />
      </Link>

      {nextRooms && nextRooms.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Próximas reuniões
            </h2>
            <Link
              href="/salas/agendadas"
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Ver todas →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border bg-surface">
            {nextRooms.map((room) => {
              const startsAt = new Date(room.scheduled_for!);
              const label = startsAt.toLocaleString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={room.slug}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-text-secondary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {room.title}
                    </p>
                    <p className="text-xs text-text-muted">{label}</p>
                  </div>
                  <Link
                    href={`/s/${room.slug}`}
                    aria-label={`Abrir ${room.title}`}
                    className="ml-auto rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {t("home.yourFriends")}
          </h2>
          <Link
            href="/pessoas"
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            {t("home.seeAll")}
          </Link>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-surface">
          {accepted.length === 0 ? (
            <EmptyState
              mascot="waiting"
              title={t("home.emptyFriendsTitle")}
              description={t("home.emptyFriendsDescription")}
              action={
                <Link href="/pessoas">
                  <Button variant="secondary">{t("home.emptyFriendsAction")}</Button>
                </Link>
              }
            />
          ) : (
            <ul className="p-2">
              {accepted.slice(0, 8).map((f) => (
                <FriendRowCompact key={f.id} friend={f.friend} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
