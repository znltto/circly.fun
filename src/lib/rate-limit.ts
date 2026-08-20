import "server-only";

/**
 * Rate limiter simples baseado em sliding window in-memory.
 *
 * Adequado pra: MVP com uma única instância, dev, tráfego baixo.
 * NÃO adequado pra: múltiplas instâncias Vercel serverless — cada
 * função tem seu próprio process.
 *
 * Upgrade path: quando `UPSTASH_REDIS_REST_URL` estiver setado,
 * troque essa implementação por `@upstash/ratelimit`. Interface pública
 * (`checkRateLimit`) fica igual, só a implementação muda.
 */

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

// Limpa buckets ociosos a cada 5min pra evitar leak
if (typeof globalThis !== "undefined" && !("__circly_rl_cleaner" in globalThis)) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      const cutoff = now - 60 * 60 * 1000; // 1h
      const recent = bucket.timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) store.delete(key);
      else bucket.timestamps = recent;
    }
  }, 5 * 60 * 1000);
  (globalThis as unknown as { __circly_rl_cleaner: boolean }).__circly_rl_cleaner = true;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInSeconds: number;
}

interface RateLimitOptions {
  /** Chave única do bucket (ex: `otp:${email}` ou `token:${ip}`) */
  key: string;
  /** Máximo de requests permitidos na janela */
  limit: number;
  /** Janela em segundos */
  windowSeconds: number;
}

/**
 * Verifica se a request está dentro do limite. Se sim, incrementa e retorna
 * `ok: true`. Se não, retorna `ok: false` com quanto tempo até resetar.
 */
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const bucket = store.get(opts.key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      ok: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  bucket.timestamps.push(now);
  store.set(opts.key, bucket);

  return {
    ok: true,
    remaining: opts.limit - bucket.timestamps.length,
    resetInSeconds: opts.windowSeconds,
  };
}

/**
 * Extrai um identificador de IP do request. Vercel expõe via headers,
 * caso contrário cai em `unknown`.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
