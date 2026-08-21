import { CcoMascot } from "@/components/brand/CcoMascot";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Loading da rota /s/[slug] (pré-entrada do convite).
 * Fica visível enquanto valida convite e sessão.
 */
export default function InvitePreloader() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center px-6 py-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6" animate />
          <Wordmark className="text-sm" />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute h-28 w-28 animate-ping rounded-full bg-brand/10"
            style={{ animationDuration: "2.5s" }}
          />
          <CcoMascot
            variant="waiting"
            className="relative h-20 w-20 text-brand"
          />
        </div>
        <p className="font-serif text-xl text-text-primary">
          Verificando convite...
        </p>
      </section>
    </main>
  );
}
