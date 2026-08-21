import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditForm } from "./edit-form";
import { DeleteDialog } from "./delete-dialog";
import { LanguageSection } from "./language-section";
import { NotificationsToggle } from "@/components/pwa/NotificationsToggle";
import { getT, getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Conta" };

const LOCALE_TO_DATE: Record<string, string> = {
  "pt-BR": "pt-BR",
  es: "es-ES",
  en: "en-US",
};

export default async function ContaPage() {
  const supabase = await createClient();
  const t = await getT();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, created_at, status_message, status_emoji")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-text-secondary">
          {t("account.profileNotFound")}
        </p>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    LOCALE_TO_DATE[locale] ?? "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">
          {t("account.pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {t("account.pageSubtitle")}
        </p>
      </header>

      <EditForm
        displayName={profile.display_name}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        statusMessage={profile.status_message}
        statusEmoji={profile.status_emoji}
      />

      <LanguageSection />

      <section
        aria-labelledby="conta-notificacoes-heading"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h2
          id="conta-notificacoes-heading"
          className="font-serif text-lg text-text-primary"
        >
          Notificações
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Receba um aviso quando alguém entrar em uma sala sua ou responder um
          convite. Funciona mesmo com o app fechado.
        </p>
        <div className="mt-5">
          <NotificationsToggle />
        </div>
      </section>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-serif text-lg text-text-primary">
          {t("account.accountHeading")}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">{t("account.email")}</dt>
            <dd className="font-mono text-text-primary truncate">
              {user.email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">{t("account.memberSince")}</dt>
            <dd className="text-text-primary">{memberSince}</dd>
          </div>
        </dl>
      </div>

      <DeleteDialog username={profile.username} />
    </div>
  );
}
