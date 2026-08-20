import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Renderiza tudo em uma única cor. Padrão: tricolor da marca. */
  mono?: boolean;
}

/**
 * Wordmark oficial "Conccord". Os dois "c" centrais em lime,
 * o restante em off-white. Use `mono` para aplicações onde
 * o wordmark precisa herdar a cor do texto (ex: dentro de botões).
 */
export function Wordmark({ className, mono = false }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block font-sans font-normal tracking-[-0.02em] leading-none whitespace-nowrap",
        className
      )}
      aria-label="Conccord"
    >
      {mono ? (
        "Conccord"
      ) : (
        <>
          <span>Con</span>
          <span className="text-brand">cc</span>
          <span>ord</span>
        </>
      )}
    </span>
  );
}
