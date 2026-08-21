"use client";

import * as React from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  LOCALE_META,
  pickBestLocale,
  type Locale,
} from "./config";
import { createTranslator } from "./translate";

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: ReturnType<typeof createTranslator>;
  locales: readonly Locale[];
  meta: typeof LOCALE_META;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  initialLocale: Locale;
  /**
   * Server já detectou cookie do usuário? Se sim, não tenta auto-detectar
   * pelo navegador — respeita a escolha persistida.
   */
  hasPersistedLocale?: boolean;
  children: React.ReactNode;
}

function hasLocaleCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) =>
    c.trim().startsWith(`${LOCALE_COOKIE}=`)
  );
}

export function I18nProvider({
  initialLocale,
  hasPersistedLocale,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${oneYear}; SameSite=Lax`;
      document.documentElement.lang = LOCALE_META[next].htmlLang;
    }
  }, []);

  // Auto-detecção no primeiro carregamento sem cookie: se o navegador do
  // usuário sinaliza um idioma que suportamos e é diferente do que o server
  // adivinhou, aplica.
  React.useEffect(() => {
    if (hasPersistedLocale) return;
    if (hasLocaleCookie()) return;
    if (typeof navigator === "undefined") return;
    const languages =
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? Array.from(navigator.languages)
        : navigator.language
        ? [navigator.language]
        : [];
    if (languages.length === 0) return;
    const detected = pickBestLocale(languages);
    if (detected !== locale) {
      setLocale(detected);
    } else {
      // Persiste mesmo assim, pra próximos requests o server já saber.
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${detected}; path=/; max-age=${oneYear}; SameSite=Lax`;
    }
    // Executa uma única vez no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = React.useMemo(() => createTranslator(locale), [locale]);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      locales: LOCALES,
      meta: LOCALE_META,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Fallback silencioso: em contextos onde o provider ainda não carregou,
    // devolve pt-BR sem quebrar a árvore.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: createTranslator(DEFAULT_LOCALE),
      locales: LOCALES,
      meta: LOCALE_META,
    } satisfies I18nContextValue;
  }
  return ctx;
}
