"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  /** Valor ISO absoluto (ex. new Date().toISOString()). "" = vazio. */
  value: string;
  onChange: (isoValue: string) => void;
  label?: string;
  hint?: string;
  minDate?: Date;
  className?: string;
  /** Placeholder do botão quando não há valor selecionado. */
  placeholder?: string;
  /** Nome do hidden input, se for usado com <form action>. */
  name?: string;
  /** Locale usado no formato exibido. Default pt-BR. */
  locale?: string;
}

const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * DateTimePicker do Circly — substitui o `<input type="datetime-local">` nativo
 * por um popover com calendário + seletor de hora.
 *
 * - Valor externo em ISO absoluto (UTC), mas a UI mostra a hora local do browser.
 * - Emite um hidden input com o mesmo ISO quando `name` é passado, dá pra usar
 *   direto num `<form action>` sem JS extra no server.
 */
export function DateTimePicker({
  value,
  onChange,
  label,
  hint,
  minDate,
  className,
  placeholder = "Escolher data e horário",
  name,
  locale = "pt-BR",
}: DateTimePickerProps) {
  const parsed = React.useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() =>
    startOfMonth(parsed ?? new Date())
  );
  const [draftHour, setDraftHour] = React.useState<number>(
    parsed?.getHours() ?? 12
  );
  const [draftMin, setDraftMin] = React.useState<number>(
    parsed ? Math.floor(parsed.getMinutes() / 5) * 5 : 0
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();

  const today = new Date();
  const effectiveMin = minDate ?? null;

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Sincroniza o mês visível e o horário rascunho sempre que abre — assim,
  // reabrir depois de um clear volta pro estado atual, não pro anterior.
  React.useEffect(() => {
    if (!open) return;
    const anchor = parsed ?? new Date();
    setViewMonth(startOfMonth(anchor));
    if (parsed) {
      setDraftHour(parsed.getHours());
      setDraftMin(Math.floor(parsed.getMinutes() / 5) * 5);
    }
  }, [open, parsed]);

  const days = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  function commitDate(day: Date) {
    const composed = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      draftHour,
      draftMin,
      0,
      0
    );
    onChange(composed.toISOString());
  }

  function commitTime(hour: number, minute: number) {
    setDraftHour(hour);
    setDraftMin(minute);
    if (parsed) {
      const composed = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        hour,
        minute,
        0,
        0
      );
      onChange(composed.toISOString());
    }
  }

  function clear() {
    onChange("");
    setOpen(false);
    btnRef.current?.focus();
  }

  const displayValue = parsed
    ? parsed.toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1.5", className)}>
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
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "rounded-md border border-border bg-surface px-3.5 py-2.5",
            "text-left text-sm transition-colors",
            "hover:border-border/80 focus:border-focus focus:outline-none",
            !displayValue && "text-text-muted"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <span className="truncate">
              {displayValue ?? placeholder}
            </span>
          </span>
          {displayValue ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  clear();
                }
              }}
              className="rounded-full p-0.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
              aria-label="Limpar data"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          )}
        </button>

        {open && (
          <div
            role="dialog"
            aria-label={label ?? "Escolher data e horário"}
            className={cn(
              "absolute z-40 mt-1 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg",
              "border border-border bg-surface-raised p-3 shadow-lg shadow-black/40"
            )}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                className="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:border-focus focus:outline-none"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium text-text-primary">
                {MONTHS_PT[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:border-focus focus:outline-none"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-0.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {WEEKDAYS_PT.map((w) => (
                <div key={w} className="py-1 text-center">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 px-0.5">
              {days.map(({ date, inMonth }) => {
                const selected = parsed && isSameDay(date, parsed);
                const isToday = isSameDay(date, today);
                const disabled =
                  effectiveMin !== null &&
                  date <
                    new Date(
                      effectiveMin.getFullYear(),
                      effectiveMin.getMonth(),
                      effectiveMin.getDate()
                    );
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => commitDate(date)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                      "focus:border-focus focus:outline-none",
                      !inMonth && "text-text-muted/50",
                      inMonth && !selected && "text-text-primary hover:bg-surface-hover",
                      selected &&
                        "bg-brand text-brand-fg hover:bg-brand-hover",
                      !selected &&
                        isToday &&
                        "ring-1 ring-inset ring-brand/40",
                      disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
              <Clock className="h-4 w-4 text-text-muted" aria-hidden />
              <TimeSpinner
                value={draftHour}
                min={0}
                max={23}
                onChange={(h) => commitTime(h, draftMin)}
                ariaLabel="Hora"
              />
              <span className="text-sm text-text-muted">:</span>
              <TimeSpinner
                value={draftMin}
                min={0}
                max={55}
                step={5}
                onChange={(m) => commitTime(draftHour, m)}
                ariaLabel="Minuto"
              />
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:border-focus focus:outline-none"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                  className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-fg hover:bg-brand-hover focus:border-focus focus:outline-none"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-text-muted">{hint}</p>}

      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

interface TimeSpinnerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}

function TimeSpinner({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
}: TimeSpinnerProps) {
  function clamp(next: number) {
    if (next < min) return max;
    if (next > max) return min;
    return next;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="rounded-sm px-1.5 py-0.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus:border-focus focus:outline-none"
        aria-label={`Diminuir ${ariaLabel}`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={pad2(value)}
        aria-label={ariaLabel}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          const num = raw === "" ? min : parseInt(raw, 10);
          if (!Number.isNaN(num)) {
            const clamped = Math.max(min, Math.min(max, num));
            onChange(clamped);
          }
        }}
        className="w-10 rounded-sm border border-border bg-surface px-1.5 py-1 text-center font-mono text-sm text-text-primary focus:border-focus focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="rounded-sm px-1.5 py-0.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus:border-focus focus:outline-none"
        aria-label={`Aumentar ${ariaLabel}`}
      >
        +
      </button>
    </div>
  );
}

function buildMonthGrid(monthStart: Date): { date: Date; inMonth: boolean }[] {
  const firstWeekday = monthStart.getDay();
  const startDay = new Date(monthStart);
  startDay.setDate(monthStart.getDate() - firstWeekday);

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === monthStart.getMonth(),
    });
  }
  return cells;
}
