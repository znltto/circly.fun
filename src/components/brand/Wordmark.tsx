import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Renderiza tudo em uma única cor. Padrão: tricolor da marca. */
  mono?: boolean;
}

/**
 * Wordmark oficial "Circly". As duas letras centrais "cl" em lime,
 * o restante em off-white — mantém o acento visual no meio da palavra,
 * como no Conccord original com "cc".
 */
export function Wordmark({ className, mono = false }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block font-sans font-normal tracking-[-0.02em] leading-none whitespace-nowrap",
        className
      )}
      aria-label="Circly"
    >
      {mono ? (
        "Circly"
      ) : (
        <>
          <span>Cir</span>
          <span className="text-brand">cl</span>
          <span>y</span>
        </>
      )}
    </span>
  );
}
