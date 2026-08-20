import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
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
          Política de Privacidade
        </h1>
        <p className="text-xs text-text-muted mt-2">
          Atualizado em 20 de agosto de 2026
        </p>

        <p className="mt-8 text-text-secondary text-pretty leading-relaxed">
          Escrevi essa política pra deixar claro, na prática, o que eu coleto,
          o que não coleto e o que faço com os seus dados no Circly. Ela é
          alinhada com a LGPD (Lei nº 13.709/2018) e vale pra qualquer pessoa
          que use o serviço.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          1. Quem somos
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly é mantido por Arthur Fernandes, pessoa física, como
          projeto privado. Sou o controlador dos dados tratados pelo serviço.
          Pra falar sobre privacidade, escreve pra{" "}
          <a
            href="mailto:arthur@endogest.com.br"
            className="text-brand hover:underline"
          >
            arthur@endogest.com.br
          </a>
          .
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          2. Dados que coleto
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O mínimo pra o serviço funcionar:
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>
            <span className="text-text-primary">Email</span> — pra enviar o
            código OTP de login e pra falar com você quando algo importante
            mudar.
          </li>
          <li>
            <span className="text-text-primary">
              Nome de exibição e username
            </span>{" "}
            — pra suas pessoas te reconhecerem dentro da sala.
          </li>
          <li>
            <span className="text-text-primary">Avatar</span> (opcional) — se
            você escolher enviar uma imagem.
          </li>
          <li>
            <span className="text-text-primary">Mensagens de chat</span> —
            armazenadas até você apagar.
          </li>
          <li>
            <span className="text-text-primary">Metadata de sala</span> —
            quem entrou, quando, por quanto tempo. Sem conteúdo de áudio ou
            vídeo.
          </li>
          <li>
            <span className="text-text-primary">Endereço IP</span> — usado
            só pra limite de requisições (rate limit) e proteção contra
            abuso. Não é vinculado ao seu perfil pra fins de análise.
          </li>
        </ul>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          3. Dados que eu NÃO coleto
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Também é importante dizer o que não passa por aqui:
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>Analytics comportamentais (Google Analytics, Mixpanel, etc).</li>
          <li>Pixels de publicidade ou redes de anúncios.</li>
          <li>Cookies de terceiros pra rastreamento entre sites.</li>
          <li>Áudio e vídeo das chamadas — nada disso é gravado por padrão.</li>
          <li>Dados sensíveis pra treinar modelos de IA.</li>
        </ul>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          4. Como uso esses dados
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Uso pra três coisas, só isso: (1) fazer o serviço funcionar — te
          autenticar, entregar mensagens, conectar sua chamada; (2) me
          comunicar com você quando algo importante muda ou quando você me
          escreve; (3) entender o que quebra e melhorar o produto, olhando
          logs técnicos agregados.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          5. Terceiros que operam pra mim
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly roda em cima de três fornecedores. Eles são operadores
          de dados, seguem seus próprios controles de segurança e só recebem
          o que precisam pra fazer sua parte:
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>
            <span className="text-text-primary">Supabase</span> — banco de
            dados, autenticação e armazenamento de arquivos (ex: avatares).
          </li>
          <li>
            <span className="text-text-primary">LiveKit Cloud</span> —
            transporte de áudio e vídeo em tempo real. A mídia passa pelos
            servidores deles pra chegar até os participantes, mas não é
            armazenada.
          </li>
          <li>
            <span className="text-text-primary">Vercel</span> — hospedagem
            da aplicação web.
          </li>
        </ul>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          6. Onde os dados ficam
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O banco Postgres do Circly fica em uma instância do Supabase na
          região de São Paulo, Brasil. Os fornecedores acima podem usar
          infraestrutura em outras regiões pra entrega de conteúdo (CDN) e
          roteamento de mídia, quando necessário pra latência.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          7. Por quanto tempo eu guardo
        </h2>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>
            <span className="text-text-primary">Conta e perfil</span> — enquanto
            a conta estiver ativa. Você pode pedir exclusão a qualquer momento.
          </li>
          <li>
            <span className="text-text-primary">Mensagens de chat</span> — até
            você apagar. Se apagar sua conta, apago junto.
          </li>
          <li>
            <span className="text-text-primary">Metadata de sala</span> — até
            90 dias depois da sala ser encerrada, pra fins de diagnóstico.
          </li>
          <li>
            <span className="text-text-primary">Gravações</span> — se você
            optar por gravar uma chamada, ficam armazenadas por até 30 dias e
            depois são removidas automaticamente.
          </li>
        </ul>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          8. Segurança
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          A separação entre dados de cada pessoa é feita no banco com Row
          Level Security (RLS) do Postgres. Tokens de acesso são hasheados
          antes de ir pro banco. O transporte é TLS ponta a ponta, tanto da
          aplicação web quanto da mídia em tempo real. Nada disso é bala de
          prata, mas é o mínimo que dá pra fazer bem feito.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          9. Seus direitos (LGPD)
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Como titular dos seus dados, você tem direito a:
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary text-pretty leading-relaxed list-disc pl-5">
          <li>Confirmar que trato seus dados e acessar o que tenho.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Pedir exclusão dos seus dados.</li>
          <li>Solicitar a portabilidade dos seus dados em formato aberto.</li>
          <li>Revogar o consentimento pra tratamentos que dependem dele.</li>
        </ul>
        <p className="text-text-secondary text-pretty leading-relaxed mt-3">
          Você pode exercer boa parte desses direitos direto na página{" "}
          <Link href="/conta" className="text-brand hover:underline">
            /conta
          </Link>
          . Pro que não estiver disponível por lá, é só me escrever em{" "}
          <a
            href="mailto:arthur@endogest.com.br"
            className="text-brand hover:underline"
          >
            arthur@endogest.com.br
          </a>{" "}
          — respondo em até 15 dias.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          10. Cookies
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Uso só os cookies essenciais pra manter você logado (sessão). Sem
          cookies de rastreamento, sem cookies de terceiros, sem banner de
          consentimento — porque não tem nada opcional pra consentir.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          11. Menores de idade
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          O Circly não é destinado a menores de 13 anos e não trato dados
          pessoais dessa faixa etária de forma intencional. Se souber que
          uma pessoa menor de 13 criou conta, me avise que removo.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          12. Alterações nesta política
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Se essa política mudar de forma que afete você, envio um aviso pro
          email da sua conta antes da mudança entrar em vigor. Ajustes
          pequenos de redação podem acontecer sem aviso, mantendo a data de
          atualização no topo.
        </p>

        <h2 className="font-serif text-xl mt-10 mb-3 text-text-primary">
          13. Contato
        </h2>
        <p className="text-text-secondary text-pretty leading-relaxed">
          Qualquer coisa sobre privacidade, LGPD ou os seus dados no
          Circly:{" "}
          <a
            href="mailto:arthur@endogest.com.br"
            className="text-brand hover:underline"
          >
            arthur@endogest.com.br
          </a>
          .
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
          <Link href="/termos">
            <Button variant="ghost">Ver Termos de Uso</Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
