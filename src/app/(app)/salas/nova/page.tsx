import { NovaSalaForm } from "./form";

export const metadata = { title: "Nova sala" };

export default function NovaSalaPage() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <section className="mx-auto max-w-2xl px-6 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">Nova sala</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Uma sala privada, criada agora, para você chamar alguém.
        </p>
      </header>

      <NovaSalaForm appUrl={appUrl} />
    </section>
  );
}
