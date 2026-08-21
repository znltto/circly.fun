"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Nome do hidden input espelho, pra usar num <form action>. Emite "on" quando ligado. */
  name?: string;
  className?: string;
}

/**
 * Toggle switch do Circly. Usado no lugar do <input type="checkbox">
 * para configurações binárias.
 *
 * Emite um `<input type="hidden" name={name} value="on">` só quando ligado,
 * de forma a espelhar o comportamento do checkbox tradicional em FormData.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
  name,
  className,
}: SwitchProps) {
  const id = React.useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 transition-colors",
        checked && "border-brand/40 bg-brand/5",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/60",
          checked ? "bg-brand" : "bg-surface-hover",
          disabled && "cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
      <div className="min-w-0 flex-1 text-sm">
        {label && (
          <span className="flex items-center gap-1.5 text-text-primary">
            {icon}
            {label}
          </span>
        )}
        {description && (
          <span className="mt-0.5 block text-text-muted">
            {description}
          </span>
        )}
      </div>
      {name && checked && (
        <input type="hidden" name={name} value="on" />
      )}
    </label>
  );
}
