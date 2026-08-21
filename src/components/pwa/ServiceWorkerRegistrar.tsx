"use client";

import { useEffect } from "react";

/**
 * Registra o service worker + monitora atualizações.
 *
 * Fluxo:
 *  1. Registra `/sw.js`.
 *  2. Se um novo SW está no estado `waiting` (ou aparece via `updatefound`),
 *     manda `SKIP_WAITING` — o SW ativa imediatamente sem esperar todas as
 *     abas fecharem.
 *  3. Quando o SW ativo muda (`controllerchange`), força reload da página —
 *     assim o usuário vê o deploy novo automaticamente na próxima requisição
 *     (sem precisar Ctrl+F5).
 *  4. Faz `.update()` também quando a aba fica visível ou volta a ficar
 *     online, pra pegar deploys durante a sessão.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    let registration: ServiceWorkerRegistration | null = null;
    let reloading = false;

    function activate(sw: ServiceWorker | null) {
      if (!sw) return;
      // Estado "installed" == waiting (SW instalou mas ainda não ativou).
      // SKIP_WAITING é a mensagem custom que o próprio sw.js escuta.
      if (sw.state === "installed" || sw.state === "installing") {
        sw.postMessage({ type: "SKIP_WAITING" });
      }
    }

    function onControllerChange() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }

    async function register() {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Se já tem SW esperando no momento do registro, ativa agora.
        if (registration.waiting) {
          activate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              // Se já tinha controller antes, é upgrade — pede skip waiting.
              if (navigator.serviceWorker.controller) {
                activate(installing);
              }
            }
          });
        });

        // Update oportunista quando volta pra aba ou reconecta.
        function tryUpdate() {
          registration?.update().catch(() => {
            /* ignora — rede fora, próxima tentativa */
          });
        }
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") tryUpdate();
        });
        window.addEventListener("online", tryUpdate);
      } catch (err) {
        console.warn("SW register falhou:", err);
      }
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );
    void register();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  return null;
}
