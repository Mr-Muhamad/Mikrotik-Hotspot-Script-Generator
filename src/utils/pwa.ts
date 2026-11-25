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

let pwaRegistrationStarted = false;

/**
 * Registers the generated offline service worker in production builds and binds
 * first-install readiness and user-triggered update handoff callbacks.
 */
export function registerOfflinePwa(handlers: PwaHandlers): void {
  const env = (import.meta as unknown as { env?: ViteImportMetaEnv }).env;
  if (!env?.PROD || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (pwaRegistrationStarted) {
    return;
  }
  pwaRegistrationStarted = true;

  const base = env.BASE_URL || "./";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const swUrl = `${normalizedBase}sw.js`;
  const scopeUrl = normalizedBase;

  const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;
  let shouldReloadOnChange = false;

  const notifyUpdateAvailable = (reg: ServiceWorkerRegistration) => {
    handlers.onNeedRefresh(() => {
      shouldReloadOnChange = true;
      reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  };

  const watchInstallingWorker = (worker: ServiceWorker | null, reg: ServiceWorkerRegistration) => {
    if (!worker) return;
    const handleState = () => {
      if (worker.state !== "installed" && worker.state !== "activated") return;
      if (hadControllerAtStart && worker.state === "installed") {
        notifyUpdateAvailable(reg);
      } else if (!hadControllerAtStart || worker.state === "activated") {
        handlers.onOfflineReady();
      }
    };
    handleState();
    worker.addEventListener("statechange", handleState);
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (shouldReloadOnChange && !reloadingForUpdate) {
      reloadingForUpdate = true;
      window.location.reload();
      return;
    }
    if (!hadControllerAtStart) {
      handlers.onOfflineReady();
    }
  });

  const doRegister = () => {
    navigator.serviceWorker
      .register(swUrl, { scope: scopeUrl })
      .then((reg) => {
        if (reg.active) {
          handlers.onOfflineReady();
        }
        if (reg.waiting && hadControllerAtStart) {
          notifyUpdateAvailable(reg);
        }
        if (reg.installing) {
          watchInstallingWorker(reg.installing, reg);
        }
        reg.addEventListener("updatefound", () => {
          watchInstallingWorker(reg.installing, reg);
        });
      })
      .catch(() => {
        pwaRegistrationStarted = false;
      });
  };

  if (document.readyState !== "loading") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister, { once: true });
  }
}
