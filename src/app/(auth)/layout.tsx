import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Conccord — início"
        >
          <BrandMark className="h-6 w-6 text-brand" />
          <Wordmark className="text-sm text-text-primary" />
        </Link>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md flex-col justify-center px-6 py-12">
        {children}
      </div>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-text-muted">
        <span>© {new Date().getFullYear()} Conccord</span>
        <span className="font-mono">Perto, mesmo de longe.</span>
      </footer>
    </main>
  );
}
