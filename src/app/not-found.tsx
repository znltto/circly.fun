import Link from "next/link";
import { CcoMascot } from "@/components/brand/CcoMascot";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-brand" />
          <Wordmark className="text-sm" />
        </Link>
      </header>

      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        <CcoMascot variant="offline" className="h-28 w-28 text-text-secondary" />
        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-text-muted">
          404
        </p>
        <h1 className="mt-2 font-serif text-3xl text-balance">
          Esta página não existe.
        </h1>
        <p className="mt-2 text-sm text-text-secondary text-pretty">
          O endereço pode estar errado, ou o que você procurava saiu do ar.
        </p>
        <Link href="/" className="mt-8">
          <Button variant="secondary">Voltar ao início</Button>
        </Link>
      </section>
    </main>
  );
}
