import { cn } from "@/lib/utils";

interface BrandMarkProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
  /** Renderiza em uma única cor (usa currentColor). Padrão: bicolor da marca. */
  mono?: boolean;
  /**
   * Ativa animação sutil da marca:
   * - Os 3 nós lime pulsam devagar em fase alternada (idle/heartbeat).
   * - Os 2 pontos internos respiram junto.
   * Cuidado: só ative onde faz sentido (header, hero) — em ícones pequenos
   * de UI dá bagunça.
   * Respeita `prefers-reduced-motion`.
   */
  animate?: boolean;
}

/**
 * BrandMark oficial do Circly.
 * Três nós lime ao redor de uma órbita interrompida, com duas presenças
 * brancas ao centro. Bicolor por padrão; use `mono` para contextos
 * onde a marca precisa herdar a cor do texto.
 */
export function BrandMark({
  className,
  mono = false,
  animate = false,
  ...props
}: BrandMarkProps) {
  const primary = mono ? "currentColor" : "#D7FF3F";
  const inner = mono ? "currentColor" : "#F5F5F2";

  return (
    <svg
      viewBox="0 0 72 72"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Circly"
      className={cn("h-6 w-6", animate && "brandmark-live", className)}
      {...props}
    >
      <path
        d="M60.9 25.5 A27 27 0 0 0 26.6 10.7"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animate ? "brandmark-arc-1" : undefined}
      />
      <path
        d="M11.2 25.2 A27 27 0 0 0 11.5 47.4"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animate ? "brandmark-arc-2" : undefined}
      />
      <path
        d="M27.2 61.5 A27 27 0 0 0 60.9 46.5"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animate ? "brandmark-arc-3" : undefined}
      />
      <circle
        cx="17"
        cy="16"
        r="5"
        fill={primary}
        className={animate ? "brandmark-node-1" : undefined}
      />
      <circle
        cx="63"
        cy="36"
        r="5"
        fill={primary}
        className={animate ? "brandmark-node-2" : undefined}
      />
      <circle
        cx="17"
        cy="57"
        r="5"
        fill={primary}
        className={animate ? "brandmark-node-3" : undefined}
      />
      <circle
        cx="29"
        cy="36"
        r="3.2"
        fill={inner}
        className={animate ? "brandmark-inner" : undefined}
      />
      <circle
        cx="40"
        cy="36"
        r="3.2"
        fill={inner}
        className={animate ? "brandmark-inner brandmark-inner-2" : undefined}
      />
    </svg>
  );
}
