export const LOCALES = ["pt-BR", "es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "circly_locale";

export interface LocaleMeta {
  code: Locale;
  label: string;
  shortLabel: string;
  flag: string;
  htmlLang: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  "pt-BR": {
    code: "pt-BR",
    label: "Português (Brasil)",
    shortLabel: "PT",
    flag: "🇧🇷",
    htmlLang: "pt-BR",
  },
  es: {
    code: "es",
    label: "Español",
    shortLabel: "ES",
    flag: "🇪🇸",
    htmlLang: "es",
  },
  en: {
    code: "en",
    label: "English",
    shortLabel: "EN",
    flag: "🇺🇸",
    htmlLang: "en",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | undefined | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  if (isLocale(value)) return value;
  const lower = value.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

/**
 * Interpreta um `Accept-Language` completo (com q-values, ex.:
 * "en-US,en;q=0.9,pt-BR;q=0.8") ou uma lista de tags como `navigator.languages`
 * e escolhe o primeiro locale suportado.
 */
export function pickBestLocale(input: string | string[] | undefined | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const rawList = Array.isArray(input) ? input : input.split(",");

  const candidates = rawList
    .map((entry, i) => {
      const [tag, ...params] = entry.trim().split(";");
      let q = 1 - i * 0.001;
      for (const p of params) {
        const [k, v] = p.trim().split("=");
        if (k === "q" && v) {
          const parsed = Number.parseFloat(v);
          if (Number.isFinite(parsed)) q = parsed;
        }
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter((c) => c.tag)
    .sort((a, b) => b.q - a.q);

  for (const c of candidates) {
    if (c.tag.startsWith("pt")) return "pt-BR";
    if (c.tag.startsWith("es")) return "es";
    if (c.tag.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}
