"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Campo de código OTP de 6 dígitos com navegação por teclado,
 * paste-friendly (aceita "123456"), e foco automático entre slots.
 */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  autoFocus,
  className,
  ariaLabel = "Código de verificação",
}: OTPInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  const digits = React.useMemo(() => {
    const arr = value.split("").slice(0, length);
    while (arr.length < length) arr.push("");
    return arr;
  }, [value, length]);

  React.useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  React.useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  function setDigit(index: number, next: string) {
    const clean = next.replace(/\D/g, "");
    if (clean.length === 0) {
      const arr = [...digits];
      arr[index] = "";
      onChange(arr.join(""));
      return;
    }

    if (clean.length > 1) {
      const start = index;
      const arr = [...digits];
      for (let i = 0; i < clean.length && start + i < length; i++) {
        arr[start + i] = clean[i];
      }
      const nextIndex = Math.min(start + clean.length, length - 1);
      onChange(arr.join(""));
      inputsRef.current[nextIndex]?.focus();
      inputsRef.current[nextIndex]?.select();
      return;
    }

    const arr = [...digits];
    arr[index] = clean;
    onChange(arr.join(""));
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
      inputsRef.current[index + 1]?.select();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      inputsRef.current[i + 1]?.focus();
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="group"
        aria-label={ariaLabel}
        // Grid ajusta o número de colunas ao length; slots encolhem em telas
        // pequenas mantendo o toque ergonômico.
        className="grid w-full gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={d}
            disabled={disabled}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={(e) => e.target.select()}
            aria-label={`Dígito ${i + 1}`}
            aria-invalid={!!error || undefined}
            className={cn(
              "aspect-[3/4] min-w-0 rounded-md border bg-surface text-center font-mono text-lg sm:text-xl",
              "text-text-primary transition-colors",
              "focus:outline-none focus:border-focus",
              error ? "border-danger/50" : "border-border",
              disabled && "opacity-50"
            )}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
