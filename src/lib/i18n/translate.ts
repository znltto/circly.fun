import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TranslationKey = Path<Dictionary>;

/**
 * Fabrica uma função `t(key, vars?)` para um locale específico.
 * Usa fallback pra pt-BR quando a chave estiver ausente.
 * Suporta interpolação simples com `{nome}` no valor.
 */
export function createTranslator(locale: Locale) {
  const primary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const fallback = DICTIONARIES[DEFAULT_LOCALE];

  return function t(
    key: TranslationKey,
    vars?: Record<string, string | number>
  ): string {
    const raw = resolvePath(primary, key) ?? resolvePath(fallback, key) ?? key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
      raw
    );
  };
}

function resolvePath(dict: Dictionary, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = dict;
  for (const p of parts) {
    if (current && typeof current === "object" && p in current) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}
