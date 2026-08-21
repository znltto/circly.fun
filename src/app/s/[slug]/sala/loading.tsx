import { CcoMascot } from "@/components/brand/CcoMascot";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Loading da rota /s/[slug]/sala.
 * Aparece enquanto o server prepara a página (auth + resolveInvite +
 * contagem de participantes). Substitui a tela preta que aparecia antes.
 */
export default function SalaLoading() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6" animate />
          <Wordmark className="text-sm" />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute h-32 w-32 animate-ping rounded-full bg-brand/10"
            style={{ animationDuration: "2.5s" }}
          />
          <span
            aria-hidden
            className="absolute h-24 w-24 animate-pulse rounded-full bg-brand/5"
          />
          <CcoMascot
            variant="waiting"
            className="relative h-24 w-24 text-brand"
          />
        </div>

        <div className="space-y-2">
          <p className="font-serif text-2xl text-text-primary">
            Preparando a sala...
          </p>
          <p className="text-sm text-text-muted">
            Só um segundo.
          </p>
        </div>
      </section>
    </main>
  );
}
