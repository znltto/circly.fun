"use client";

import * as React from "react";
import { Focus } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "circly:auto-spotlight";

interface SpotlightContextValue {
  autoSpotlight: boolean;
  setAutoSpotlight: (v: boolean) => void;
}

const SpotlightContext = React.createContext<SpotlightContextValue | null>(null);

export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  // Default true — em reuniões pequenas o efeito é neutro; em grandes ajuda muito.
  const [autoSpotlight, setAutoSpotlightState] = React.useState(true);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "false") setAutoSpotlightState(false);
      if (raw === "true") setAutoSpotlightState(true);
    } catch {
      // sem storage — usa default
    }
  }, []);

  const setAutoSpotlight = React.useCallback((v: boolean) => {
    setAutoSpotlightState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
    } catch {
      /* noop */
    }
  }, []);

  const value = React.useMemo(
    () => ({ autoSpotlight, setAutoSpotlight }),
    [autoSpotlight, setAutoSpotlight]
  );

  return (
    <SpotlightContext.Provider value={value}>
      {children}
    </SpotlightContext.Provider>
  );
}

export function useSpotlight(): SpotlightContextValue {
  const ctx = React.useContext(SpotlightContext);
  if (!ctx) {
    return { autoSpotlight: true, setAutoSpotlight: () => {} };
  }
  return ctx;
}

/**
 * Botão pra CallControls: alterna auto-spotlight.
 */
export function SpotlightToggle() {
  const { autoSpotlight, setAutoSpotlight } = useSpotlight();
  const label = autoSpotlight
    ? "Auto-focar quem fala está ligado"
    : "Auto-focar quem fala está desligado";
  return (
    <button
      type="button"
      onClick={() => setAutoSpotlight(!autoSpotlight)}
      aria-pressed={autoSpotlight}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        autoSpotlight
          ? "bg-brand/15 text-brand hover:bg-brand/25"
          : "bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-brand"
      )}
    >
      <Focus className="h-4 w-4" />
    </button>
  );
}
