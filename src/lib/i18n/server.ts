import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  pickBestLocale,
  type Locale,
} from "./config";
import { createTranslator } from "./translate";

/**
 * Lê o locale atual no server. Prioriza cookie do usuário; senão detecta pelo
 * `Accept-Language` (com respeito a q-values); senão cai no padrão pt-BR.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  try {
    const headerStore = await headers();
    const accept = headerStore.get("accept-language");
    if (accept) return pickBestLocale(accept);
  } catch {
    // Contextos sem headers (edge/static) — ignora.
  }

  return DEFAULT_LOCALE;
}

/** Indica se já existe cookie de idioma persistido para este usuário. */
export async function hasLocaleCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return !!value && isLocale(value);
}

export async function getT() {
  const locale = await getLocale();
  return createTranslator(locale);
}
