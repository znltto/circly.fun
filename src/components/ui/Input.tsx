import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, hint, error, id, leftAdornment, rightAdornment, ...props },
    ref
  ) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border bg-surface px-3.5",
            "transition-colors focus-within:border-focus",
            error ? "border-danger/50" : "border-border",
            className
          )}
        >
          {leftAdornment && (
            <span className="text-text-muted shrink-0">{leftAdornment}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(
              "flex-1 bg-transparent py-2.5 text-sm text-text-primary",
              "placeholder:text-text-muted",
              "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            )}
            {...props}
          />
          {rightAdornment && (
            <span className="text-text-muted shrink-0">{rightAdornment}</span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
