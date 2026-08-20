"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  emptyLabel?: string;
  ariaLabel?: string;
}

/**
 * Select customizado — mesmo visual dos Inputs Conccord.
 * Navegação por teclado, click-outside pra fechar, foco visível.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  className,
  emptyLabel = "Nenhuma opção",
  ariaLabel,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const id = React.useId();

  const current = options.find((o) => o.value === value);
  const displayLabel = current?.label ?? placeholder;

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  function selectAt(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
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
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectAt(highlight);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={btnRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-label={ariaLabel ?? label}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "rounded-md border border-border bg-surface px-3.5 py-2.5",
            "text-left text-sm text-text-primary transition-colors",
            "hover:border-border/80 focus:border-focus focus:outline-none"
          )}
        >
          <span
            className={cn(
              "truncate",
              !current && "text-text-muted"
            )}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel ?? label ?? "Opções"}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className={cn(
              "absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md",
              "border border-border bg-surface-raised p-1 shadow-lg shadow-black/40",
              "focus:outline-none"
            )}
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-muted">
                {emptyLabel}
              </li>
            )}
            {options.map((opt, i) => {
              const selected = opt.value === value;
              const highlighted = i === highlight;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectAt(i);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm",
                    highlighted
                      ? "bg-surface-hover text-text-primary"
                      : "text-text-secondary"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
