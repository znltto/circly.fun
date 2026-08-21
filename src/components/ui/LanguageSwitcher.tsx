"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/config";
import { Flag } from "./Flag";

type Variant = "compact" | "block";
type Align = "left" | "right";

interface LanguageSwitcherProps {
  variant?: Variant;
  align?: Align;
  className?: string;
  /** Prefixo aplicado ao id do menu — útil quando existem múltiplos na página. */
  idPrefix?: string;
}

/**
 * Seletor de idioma com o design do Circly (sem <select> nativo).
 *
 * - `compact`: pílula fina pro header (ícone globo + código do idioma).
 * - `block`: campo completo pra formulários (label + valor + chevron).
 *
 * Fecha ao clicar fora, navegável por teclado, respeita foco.
 */
export function LanguageSwitcher({
  variant = "compact",
  align = "right",
  className,
  idPrefix = "lang",
}: LanguageSwitcherProps) {
  const { locale, setLocale, locales, meta, t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const listId = React.useId();

  const current = meta[locale];
  const items = React.useMemo(
    () => locales.map((code) => meta[code]),
    [locales, meta]
  );

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Só sincroniza o highlight quando o menu abre — evitando resetar durante
  // o hover do mouse por causa de renders subsequentes.
  React.useEffect(() => {
    if (!open) return;
    const idx = items.findIndex((it) => it.code === locale);
    setHighlight(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function commit(next: Locale) {
    setLocale(next);
    setOpen(false);
    btnRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = items[highlight];
      if (target) commit(target.code);
    }
  }

  const menu = (
    <ul
      id={`${idPrefix}-${listId}`}
      role="listbox"
      aria-label={t("languageSwitcher.ariaLabel")}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className={cn(
        "absolute z-40 mt-1 min-w-[190px] overflow-hidden rounded-lg",
        "border border-border bg-surface-raised p-1 shadow-lg shadow-black/40",
        "focus:outline-none",
        align === "right" ? "right-0" : "left-0",
        variant === "block" && "w-full min-w-0"
      )}
    >
      {items.map((it, i) => {
        const selected = it.code === locale;
        const highlighted = i === highlight;
        return (
          <li
            key={it.code}
            role="option"
            aria-selected={selected}
            onMouseEnter={() => setHighlight(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              commit(it.code);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm",
              highlighted
                ? "bg-surface-hover text-text-primary"
                : "text-text-secondary"
            )}
          >
            <Flag code={it.code} />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {selected && (
              <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );

  if (variant === "compact") {
    return (
      <div
        ref={rootRef}
        className={cn("relative inline-flex", className)}
      >
        <button
          ref={btnRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${idPrefix}-${listId}`}
          aria-label={t("languageSwitcher.ariaLabel")}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full",
            "border border-border bg-surface px-2 py-1",
            "text-xs font-medium text-text-secondary transition-colors",
            "hover:bg-surface-hover hover:text-text-primary",
            "focus:border-focus focus:outline-none",
            open && "text-text-primary"
          )}
        >
          <Flag code={current.code} />
          <span className="font-mono tracking-wider">
            {current.shortLabel}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3 w-3 text-text-muted transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && menu}
      </div>
    );
  }

  // block
  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${idPrefix}-${listId}`}
        aria-label={t("languageSwitcher.ariaLabel")}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-3",
          "rounded-md border border-border bg-surface px-3.5 py-2.5",
          "text-left text-sm text-text-primary transition-colors",
          "hover:border-border/80 focus:border-focus focus:outline-none"
        )}
      >
        <span className="flex items-center gap-2.5">
          <Flag code={current.code} />
          <span>{current.label}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && menu}
    </div>
  );
}
