import { cn } from "@/lib/utils";

export type CcoVariant =
  | "idle"
  | "waiting"
  | "offline"
  | "muted"
  | "camera-off"
  | "connection-error"
  | "goodbye";

interface CcoMascotProps extends React.SVGAttributes<SVGSVGElement> {
  variant?: CcoVariant;
  className?: string;
}

/**
 * CCO — mascote do Circly.
 * Usa a mesma linguagem visual da logo (órbita com 3 nós + presenças internas).
 * O que muda entre estados é o miolo (os "olhos") e sutis alterações nos arcos.
 *
 * Usa `currentColor` para o traço principal — pinta com a cor do texto.
 * Estados específicos (erro, acento) usam variáveis fixas para ficar coerente
 * com a paleta da marca.
 */
export function CcoMascot({
  variant = "idle",
  className,
  ...props
}: CcoMascotProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaFor(variant)}
      className={cn("select-none", className)}
      {...props}
    >
      <Orbit variant={variant} />
      <Nodes variant={variant} />
      <Inner variant={variant} />
    </svg>
  );
}

function ariaFor(v: CcoVariant): string {
  switch (v) {
    case "idle":
      return "CCO em estado tranquilo";
    case "waiting":
      return "CCO aguardando";
    case "offline":
      return "CCO desconectado";
    case "muted":
      return "CCO em silêncio";
    case "camera-off":
      return "CCO com câmera desligada";
    case "connection-error":
      return "CCO com erro de conexão";
    case "goodbye":
      return "CCO se despedindo";
  }
}

function Orbit({ variant }: { variant: CcoVariant }) {
  const stroke =
    variant === "connection-error"
      ? "hsl(var(--danger))"
      : "currentColor";

  // No estado offline, órbita mais tênue e tracejada (parada).
  if (variant === "offline") {
    return (
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
        strokeDasharray="3 4"
      >
        <path d="M60.9 25.5 A27 27 0 0 0 26.6 10.7" />
        <path d="M11.2 25.2 A27 27 0 0 0 11.5 47.4" />
        <path d="M27.2 61.5 A27 27 0 0 0 60.9 46.5" />
      </g>
    );
  }

  // Erro: um dos arcos quebrado.
  if (variant === "connection-error") {
    return (
      <g strokeWidth="2.5" strokeLinecap="round" stroke="currentColor">
        <path d="M60.9 25.5 A27 27 0 0 0 26.6 10.7" />
        <path d="M11.2 25.2 A27 27 0 0 0 11.5 33" opacity="0.4" />
        <path d="M11.5 40 A27 27 0 0 0 11.5 47.4" opacity="0.4" />
        <path d="M27.2 61.5 A27 27 0 0 0 60.9 46.5" />
      </g>
    );
  }

  return (
    <g
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.9"
    >
      <path d="M60.9 25.5 A27 27 0 0 0 26.6 10.7" />
      <path d="M11.2 25.2 A27 27 0 0 0 11.5 47.4" />
      <path d="M27.2 61.5 A27 27 0 0 0 60.9 46.5" />
    </g>
  );
}

function Nodes({ variant }: { variant: CcoVariant }) {
  const dim = variant === "offline" || variant === "goodbye" ? 0.45 : 1;

  return (
    <g fill="currentColor" opacity={dim}>
      <circle cx="17" cy="16" r="5" />
      {variant === "connection-error" ? (
        <circle cx="63" cy="36" r="5" fill="hsl(var(--danger))" opacity="1" />
      ) : (
        <circle cx="63" cy="36" r="5" />
      )}
      <circle cx="17" cy="57" r="5" />
    </g>
  );
}

function Inner({ variant }: { variant: CcoVariant }) {
  const dotColor = "currentColor";

  switch (variant) {
    case "idle":
    case "waiting":
      return (
        <g fill={dotColor}>
          <circle cx="29" cy="36" r="3.2" />
          <circle cx="40" cy="36" r="3.2" />
        </g>
      );

    case "offline":
      // olhos fechados: dois pequenos traços horizontais
      return (
        <g stroke={dotColor} strokeWidth="2.4" strokeLinecap="round">
          <line x1="26" y1="36" x2="32" y2="36" />
          <line x1="37" y1="36" x2="43" y2="36" />
        </g>
      );

    case "muted":
      return (
        <>
          <g fill={dotColor}>
            <circle cx="29" cy="34" r="3.2" />
            <circle cx="40" cy="34" r="3.2" />
          </g>
          {/* linha "silenciada" abaixo dos olhos */}
          <line
            x1="28"
            y1="44"
            x2="41"
            y2="44"
            stroke={dotColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </>
      );

    case "camera-off":
      return (
        <>
          <g fill={dotColor} opacity="0.35">
            <circle cx="29" cy="36" r="3.2" />
            <circle cx="40" cy="36" r="3.2" />
          </g>
          {/* traço oblíquo passando por cima */}
          <line
            x1="22"
            y1="46"
            x2="47"
            y2="26"
            stroke={dotColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      );

    case "connection-error":
      return (
        <>
          <g fill={dotColor}>
            <circle cx="29" cy="36" r="3.2" />
            <circle cx="40" cy="36" r="3.2" />
          </g>
        </>
      );

    case "goodbye":
      // olhos como arcos descendentes (despedida serena)
      return (
        <g stroke={dotColor} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M26 34c2 3 4 3 6 0" />
          <path d="M37 34c2 3 4 3 6 0" />
        </g>
      );
  }
}
