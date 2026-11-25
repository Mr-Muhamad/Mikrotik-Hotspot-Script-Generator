/**
 * @license
 * SPDX-License-Identifier: MIT
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

export interface PwaHandlers {
  onOfflineReady: () => void;
  onNeedRefresh: (applyUpdate: () => void) => void;
}

interface ViteImportMetaEnv {
  PROD?: boolean;
  BASE_URL?: string;
}

/**
 * Registers the generated offline service worker in production builds and binds
 * first-install readiness and user-triggered update handoff callbacks.
 */
export function registerOfflinePwa(handlers: PwaHandlers): void {
  const env = (import.meta as unknown as { env?: ViteImportMetaEnv }).env;
  if (!env?.PROD || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const base = env.BASE_URL || "./";
  const swUrl = `${base.endsWith("/") ? base : `${base}/`}sw.js`;
  const scopeUrl = base.endsWith("/") ? base : `${base}/`;

  let reloadingForUpdate = false;
  let shouldReloadOnChange = false;

  const watchInstallingWorker = (worker: ServiceWorker | null, reg: ServiceWorkerRegistration) => {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state !== "installed") return;
      if (navigator.serviceWorker.controller) {
        handlers.onNeedRefresh(() => {
          shouldReloadOnChange = true;
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        });
      } else {
        handlers.onOfflineReady();
      }
    });
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (shouldReloadOnChange && !reloadingForUpdate) {
      reloadingForUpdate = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swUrl, { scope: scopeUrl })
      .then((reg) => {
        if (reg.active && !reg.waiting && !reg.installing) {
          handlers.onOfflineReady();
        }
        if (reg.waiting && navigator.serviceWorker.controller) {
          handlers.onNeedRefresh(() => {
            shouldReloadOnChange = true;
            reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          });
        }
        reg.addEventListener("updatefound", () => {
          watchInstallingWorker(reg.installing, reg);
        });
      })
      .catch(() => {
        // Ignore service worker registration errors in unsupported contexts
      });
  });
}
