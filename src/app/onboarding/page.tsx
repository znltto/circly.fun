import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-md items-center px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Circly — início"
        >
          <BrandMark className="h-6 w-6 text-brand" />
          <Wordmark className="text-sm text-text-primary" />
        </Link>
      </header>

      <div className="mx-auto max-w-md px-6 py-16">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl text-text-primary text-balance">
            Como quer aparecer aqui?
          </h1>
          <p className="text-sm text-text-secondary text-pretty">
            Escolha um @ e um nome que suas pessoas vão ver.
          </p>
        </div>

        <div className="mt-8">
          <OnboardingForm
            defaultUsername={profile?.username ?? ""}
            defaultDisplayName={profile?.display_name ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
