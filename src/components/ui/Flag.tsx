import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

interface FlagProps {
  code: Locale;
  className?: string;
}

/**
 * Bandeirinhas em SVG inline — evita o fallback "BR / ES / US" que o
 * Windows mostra quando tenta renderizar emojis de bandeira (regional
 * indicator symbols). Proporção 4:3, pensadas para ~18×14px na UI.
 */
export function Flag({ code, className }: FlagProps) {
  const shared = cn(
    "block h-3.5 w-[18px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/20",
    className
  );

  if (code === "pt-BR") {
    return (
      <svg
        viewBox="0 0 24 18"
        role="img"
        aria-label="Bandeira do Brasil"
        className={shared}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="24" height="18" fill="#009C3B" />
        <polygon points="12,2.5 22.5,9 12,15.5 1.5,9" fill="#FFDF00" />
        <circle cx="12" cy="9" r="3.4" fill="#002776" />
        <path
          d="M8.9 9.7 A 3.5 3.5 0 0 1 15.1 9.7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.55"
        />
      </svg>
    );
  }

  if (code === "es") {
    return (
      <svg
        viewBox="0 0 24 18"
        role="img"
        aria-label="Bandera de España"
        className={shared}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="24" height="18" fill="#AA151B" />
        <rect y="4.5" width="24" height="9" fill="#F1BF00" />
      </svg>
    );
  }

  // en → US flag (bandeira dos EUA, versão simplificada)
  return (
    <svg
      viewBox="0 0 24 18"
      role="img"
      aria-label="Flag of the United States"
      className={shared}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="24" height="18" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect
          key={i}
          y={i * (18 / 13)}
          width="24"
          height={18 / 13}
          fill="#FFFFFF"
        />
      ))}
      <rect width="10.5" height={(18 / 13) * 7} fill="#3C3B6E" />
      {/* Estrelinhas simplificadas: pontos brancos em grid */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={1.2 + col * 2}
            cy={1 + row * 2.4}
            r={0.35}
            fill="#FFFFFF"
          />
        ))
      )}
    </svg>
  );
}
