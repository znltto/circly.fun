import { cn } from "@/lib/utils";

interface BrandMarkProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
  /** Renderiza em uma única cor (usa currentColor). Padrão: bicolor da marca. */
  mono?: boolean;
}

/**
 * BrandMark oficial do Conccord.
 * Três nós lime ao redor de uma órbita interrompida, com duas presenças
 * brancas ao centro. Bicolor por padrão; use `mono` para contextos
 * onde a marca precisa herdar a cor do texto.
 */
export function BrandMark({
  className,
  mono = false,
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
      aria-label="Conccord"
      className={cn("h-6 w-6", className)}
      {...props}
    >
      <path
        d="M60.9 25.5 A27 27 0 0 0 26.6 10.7"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M11.2 25.2 A27 27 0 0 0 11.5 47.4"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M27.2 61.5 A27 27 0 0 0 60.9 46.5"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="16" r="5" fill={primary} />
      <circle cx="63" cy="36" r="5" fill={primary} />
      <circle cx="17" cy="57" r="5" fill={primary} />
      <circle cx="29" cy="36" r="3.2" fill={inner} />
      <circle cx="40" cy="36" r="3.2" fill={inner} />
    </svg>
  );
}
