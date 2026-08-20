import Link from "next/link";
import { EntrarForm } from "./form";

export const metadata = {
  title: "Entrar",
};

export default function EntrarPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-text-primary text-balance">
          Bem-vindo de volta.
        </h1>
        <p className="text-sm text-text-secondary text-pretty">
          Digite seu email e enviaremos um código de 6 dígitos para você entrar.
          Sem senha, sem cadastro.
        </p>
      </div>

      <EntrarForm />

      <p className="text-xs text-text-muted">
        Só quer entrar em uma sala? Use o link que enviaram para você — não
        precisa de conta.{" "}
        <Link
          href="/"
          className="text-text-secondary underline underline-offset-2 hover:text-text-primary"
        >
          Voltar ao início
        </Link>
        .
      </p>
    </div>
  );
}
