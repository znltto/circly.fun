import { redirect } from "next/navigation";
import { VerificarForm } from "./form";

export const metadata = {
  title: "Verificar código",
};

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerificarPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/entrar");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-text-primary text-balance">
          Digite o código.
        </h1>
        <p className="text-sm text-text-secondary text-pretty">
          Enviamos um código para{" "}
          <span className="text-text-primary">{email}</span>. Ele expira em 10
          minutos.
        </p>
      </div>

      <VerificarForm email={email} />
    </div>
  );
}
