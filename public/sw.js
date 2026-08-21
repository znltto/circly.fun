/* Circly service worker
 * Vanilla SW — sem libs.
 * Estratégias:
 *   - install: cacheia app shell mínimo + skipWaiting (ativa imediato)
 *   - activate: limpa caches antigos + clients.claim
 *   - fetch:
 *       - ignora /api/*, cross-origin sensível (supabase/livekit/ws) e não-GET
 *       - cache-first para /_next/static/* e assets estáticos (img/font) —
 *         seguro porque Next hash-eia os arquivos
 *       - NETWORK-FIRST para navegações (páginas) — evita servir HTML velho
 *         quando tem versão nova no servidor (o motivo do "Ctrl+F5")
 *   - message SKIP_WAITING: cliente força ativação de SW novo
 *
 * CACHE_NAME é bumpado a cada mudança pra invalidar todo o cache antigo.
 */

const CACHE_NAME = "circly-v3";
const NAV_TIMEOUT_MS = 3000;

const APP_SHELL = [
  "/",
  "/entrar",
  "/icon.svg",
  "/apple-icon.svg",
  "/brand/circly-icon.svg",
  "/brand/circly-logo.svg",
  "/manifest.json",
];

const STATIC_ASSET_DESTS = new Set(["image", "font", "style", "script"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch(() => {
              /* falha silenciosa se rota ainda não existir */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* -------- Web Push -------- */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Circly", body: event.data.text() };
  }
  const title = payload.title || "Circly";
  const options = {
    body: payload.body || "",
    icon: "/brand/icon-192.png",
    badge: "/brand/icon-192.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/inicio" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inicio";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              return client.focus().then((focused) => {
                if ("navigate" in focused) return focused.navigate(url);
              });
            } catch {
              /* segue pro openWindow */
            }
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

function isIgnoredCrossOrigin(url) {
  const host = url.hostname;
  if (host.endsWith(".supabase.co")) return true;
  if (host.endsWith(".supabase.in")) return true;
  if (host.endsWith(".livekit.cloud")) return true;
  return false;
}

function isCacheableStatic(url, request) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (STATIC_ASSET_DESTS.has(request.destination)) return true;
  return false;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

/**
 * Network-first com timeout curto e fallback pro cache. Ideal pra páginas —
 * garante que o HTML servido é o mais novo se a rede tá OK, mas mantém
 * usabilidade offline.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const network = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)
      ),
    ]);
    if (network && network.ok && network.type === "basic") {
      cache.put(request, network.clone()).catch(() => {});
    }
    return network;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Sem cache e sem rede — devolve resposta mínima pro browser não travar.
    return new Response("Sem conexão.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/* -------- Mensagens do cliente -------- */

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Só GET
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Ignora esquemas não-http(s) (ex.: ws:, wss:, chrome-extension:)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Ignora API do próprio app
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  // Ignora hosts sensíveis (supabase / livekit)
  if (url.origin !== self.location.origin && isIgnoredCrossOrigin(url)) {
    return;
  }

  // Estáticos same-origin: cache-first
  if (isCacheableStatic(url, request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Páginas same-origin (navegações): network-first com timeout curto.
  // Assim, um deploy novo aparece na próxima navegação sem precisar Ctrl+F5.
  if (
    url.origin === self.location.origin &&
    (request.mode === "navigate" || request.destination === "document")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Fallback pra estaticos same-origin não classificados (rara ocorrência):
  // stale-while-revalidate mantém tudo funcional sem cacheamento agressivo.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
