import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Circly — início"
        >
          <BrandMark className="h-6 w-6" />
          <Wordmark className="text-sm text-text-primary" />
        </Link>
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Voltar
          </Button>
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="font-serif text-3xl md:text-4xl text-text-primary">
          Termos de Uso
        </h1>
        <p className="text-xs text-text-muted mt-2">
          Atualizado em 20 de agosto de 2026
        </p>

        <p className="mt-8 text-text-secondary text-pretty leading-relaxed">
          Oi. Estes são os termos que valem quando você usa o Circly. Escrevi
          na primeira pessoa e sem juridiquês, porque o Circly é um projeto
          pequeno, pensado pra círculos privados de amigos — não é uma
          plataforma corporativa. Se algo aqui não fizer sentido pra você,
          me escreve.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          1. Aceite
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Ao criar uma conta, entrar numa sala ou usar qualquer parte do
          Circly, você concorda com estes termos. Se não concordar, tudo bem
          — basta não usar.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          2. O que é o Circly
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly é uma aplicação privada de videochamadas, feita pra
          grupos pequenos e por convite. Não é um serviço público, não tem
          diretório aberto de salas e não é aberto pra qualquer pessoa da
          internet. Você entra porque alguém te chamou.
        </p>
        <p className="text-text-secondary text-pretty leading-relaxed mt-3">
          O produto ainda está em construção. Coisas mudam, quebram e voltam
          a funcionar. Vou tentar avisar quando algo importante mudar.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          3. Idade mínima
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Você precisa ter pelo menos 13 anos pra usar o Circly. Se souber
          que uma pessoa menor de 13 está usando, me avise que removo a conta.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          4. Uso permitido
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly é pra uso particular, entre pessoas que se conhecem.
          Você não pode revender acesso, empacotar o serviço dentro de outro
          produto ou usar comercialmente sem autorização por escrito. Se você
          quer usar pra alguma coisa fora disso, fala comigo antes.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          5. Condutas proibidas
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Enquanto usa o Circly, você concorda em não:
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>Assediar, ameaçar ou intimidar outras pessoas.</li>
          <li>Fazer nada ilegal, ou usar o serviço pra facilitar algo ilegal.</li>
          <li>
            Enviar spam, correntes, phishing ou qualquer conteúdo em massa não
            solicitado.
          </li>
          <li>
            Fazer engenharia reversa, raspagem automatizada, injeção ou
            qualquer tentativa de contornar RLS, autenticação ou controles de
            segurança.
          </li>
          <li>
            Gravar, distribuir ou publicar imagem, voz ou vídeo de outra
            pessoa sem consentimento — incluindo deepfakes, montagens ou
            usos fora do contexto original da sala.
          </li>
          <li>
            Se passar por outra pessoa, criar contas falsas ou usar a conta
            de terceiros.
          </li>
        </ul>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          6. Contas
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          A conta é vinculada ao seu email e o acesso é feito por código
          único (OTP) enviado por email. Você é responsável por manter o
          controle desse email e por não compartilhar o código com ninguém.
          Se alguém entrar na sua caixa, entra na sua conta.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          7. Conteúdo
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Tudo que você fala, escreve ou compartilha continua sendo seu.
          Você me concede apenas a licença mínima e temporária necessária
          pra transmitir esse conteúdo em tempo real pras pessoas na mesma
          sala — nada além disso. Não uso seu conteúdo pra treinar modelos,
          pra vender pra terceiros, nem pra qualquer coisa fora do próprio
          serviço.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          8. Suspensão e encerramento
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Se você violar estes termos, posso suspender ou encerrar sua conta
          sem aviso prévio, especialmente em casos de assédio, atividade
          ilegal ou risco à segurança de outras pessoas. Em situações menos
          graves, vou tentar conversar antes.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          9. Isenção de garantias
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly é oferecido no melhor esforço possível (“best-effort”),
          sem SLA, sem garantia de disponibilidade contínua e sem promessa
          de que vai atender a um propósito específico. Coisas podem falhar,
          ficar fora do ar ou perder dados temporariamente. Use com essa
          expectativa em mente.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          10. Limitação de responsabilidade
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Na máxima extensão permitida por lei, não me responsabilizo por
          danos indiretos, perda de dados, perda de receita, interrupção de
          atividades ou danos morais decorrentes do uso — ou da
          impossibilidade de uso — do Circly. Você usa o serviço por sua
          conta e risco.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          11. Alterações nos termos
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Posso atualizar estes termos com o tempo. Quando a mudança for
          substancial (por exemplo, algo que afete seus direitos ou como
          seus dados são tratados), envio um aviso por email pro endereço
          da sua conta antes de entrar em vigor.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          12. Lei aplicável e foro
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Estes termos são regidos pelas leis da República Federativa do
          Brasil. Fica eleito o foro da comarca do meu domicílio pra
          resolver qualquer questão que não puder ser resolvida por
          conversa direta.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          13. Contato
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Dúvida, problema, pedido, reclamação? Escreve pra{" "}
          <a
            href="mailto:arthur@endogest.com.br"
            className="text-brand hover:underline"
          >
            arthur@endogest.com.br
          </a>
          . Eu respondo.
        </p>

        <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <Link href="/">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Voltar ao início
            </Button>
          </Link>
          <Link href="/privacidade">
            <Button variant="ghost">Ver Política de Privacidade</Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
