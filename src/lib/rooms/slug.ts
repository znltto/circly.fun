import "server-only";
import { randomBytes, createHash } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/1/l/o para reduzir confusão visual

/**
 * Slug curto e legível para /s/{slug}. Não sequencial, não previsível.
 * Retorna 8 chars usando alfabeto de 32 símbolos (40 bits de entropia).
 */
export function generateRoomSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Token de convite: 24 bytes → 32 chars base64url. Só retornado ao criador.
 * O que fica no banco é `hashInviteToken(token)`.
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Identity única do participante no LiveKit. Usa userId quando disponível
 * ou um id efêmero para visitantes, prefixado com "u:" ou "g:" para clareza.
 */
export function makeLivekitIdentity(opts:
  | { kind: "user"; userId: string }
  | { kind: "guest" }): string {
  if (opts.kind === "user") return `u:${opts.userId}`;
  return `g:${randomBytes(9).toString("base64url")}`;
}
