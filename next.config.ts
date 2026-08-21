import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes será reativado na Fase 4, quando as rotas de auth existirem.

  async headers() {
    return [
      {
        // Service worker: nunca cacheia. Sem isso, browser/CDN pode manter
        // versão antiga do SW por horas e nada de update ocorre.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Manifest: mesma coisa — muda com pouca frequência mas quando muda
        // precisamos que o browser pegue.
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        // Assets versionados pelo Next (hash no nome do arquivo) — cache
        // agressivo é seguro.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
