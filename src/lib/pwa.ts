import { isSafeToReload } from "@/lib/dirtyState";

type Listener = (updateReady: boolean) => void;

const listeners = new Set<Listener>();
let updateReady = false;
let applying = false;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | null = null;
let started = false;

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min — sem polling agressivo
const SAFE_RETRY_MS = 20 * 1000;
let reloading = false;

export function onPwaUpdateState(listener: Listener): () => void {
  listeners.add(listener);
  listener(updateReady);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l(updateReady));
}

/** Instrumentação: estado completo do registro (Android x iOS). */
function logState(tag: string) {
  const reg = registration;
  console.info(`[PWA] app version: ${__APP_VERSION__}`);
  console.info(`[PWA] (${tag}) controller: ${navigator.serviceWorker?.controller?.scriptURL ?? "none"}`);
  console.info(`[PWA] (${tag}) registration active: ${reg?.active?.scriptURL ?? "none"} / ${reg?.active?.state ?? "-"}`);
  console.info(`[PWA] (${tag}) registration waiting: ${reg?.waiting?.scriptURL ?? "none"} / ${reg?.waiting?.state ?? "-"}`);
  console.info(`[PWA] (${tag}) registration installing: ${reg?.installing?.scriptURL ?? "none"} / ${reg?.installing?.state ?? "-"}`);
  console.info(`[PWA] (${tag}) updateViaCache: ${reg?.updateViaCache ?? "-"} | standalone: ${window.matchMedia("(display-mode: standalone)").matches}`);
}

/** Contextos onde o service worker NUNCA deve ser registrado. */
export function swAllowed(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return false;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return false;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return false;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

async function unregisterAppSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes("/sw.js"))
      .map((r) => r.unregister()),
  );
}

/** Aplica a atualização apenas quando não há trabalho não salvo. */
export async function applyUpdateIfSafe(reason: string): Promise<boolean> {
  if (!updateReady || applying) return false;
  if (!isSafeToReload()) {
    console.info(`[PWA] waiting to activate (${reason}) — há alterações não salvas`);
    return false;
  }
  applying = true;
  console.info(`[PWA] activation allowed (${reason})`);
  logState("apply");
  try {
    // Caminho principal: workbox envia SKIP_WAITING e recarrega no controllerchange.
    if (updateSW) await updateSW(true);
    // Rede de segurança (Android): fala direto com o worker em espera.
    const waiting = registration?.waiting;
    if (waiting) {
      console.info("[PWA] posting SKIP_WAITING to waiting worker");
      waiting.postMessage({ type: "SKIP_WAITING" });
    }
    // Se em 3s o controllerchange não recarregar, força o reload.
    window.setTimeout(() => hardReload("timeout-after-skip-waiting"), 3000);
    return true;
  } catch (e) {
    applying = false;
    console.error("[PWA] ERROR: falha ao aplicar atualização", e);
    return false;
  }
}

function hardReload(reason: string) {
  if (reloading) return;
  reloading = true;
  console.info(`[PWA] reloading (${reason})`);
  window.location.reload();
}

export function initPwa(): void {
  if (started) return;
  started = true;

  if (!swAllowed()) {
    void unregisterAppSW();
    return;
  }

  void (async () => {
    try {
      const { registerSW } = await import("virtual:pwa-register");
      updateSW = registerSW({
        immediate: true,
        onRegisteredSW(_url, reg) {
          registration = reg ?? null;
          console.info("[PWA] service worker registered");
          logState("startup");
          // Um SW novo pode já estar em espera desde a sessão anterior (comum
          // no Android, onde o processo do PWA sobrevive ao fechamento).
          if (reg?.waiting) {
            updateReady = true;
            emit();
            void applyUpdateIfSafe("waiting-on-startup");
          }
          reg?.addEventListener("updatefound", () => {
            const sw = reg.installing;
            console.info(`[PWA] update found — installing: ${sw?.scriptURL ?? "none"}`);
            sw?.addEventListener("statechange", () => {
              console.info(`[PWA] update state: ${sw.state}`);
            });
          });
          // Verificação inicial + periódica
          void checkForUpdate("startup");
          window.setInterval(() => void checkForUpdate("interval"), CHECK_INTERVAL_MS);
        },
        onNeedRefresh() {
          updateReady = true;
          console.info("[PWA] new service worker found");
          console.info("[PWA] update downloaded");
          emit();
          void applyUpdateIfSafe("update-ready");
        },
        onOfflineReady() {
          console.info("[PWA] offline ready");
        },
        onRegisterError(error) {
          console.error("[PWA] ERROR: registro falhou", error);
        },
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.info("[PWA] controller changed");
        if (applying) hardReload("controllerchange");
      });

      // Volta do background / foco: verifica e aplica se seguro
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        void checkForUpdate("foreground");
        void applyUpdateIfSafe("foreground");
      });
      window.addEventListener("focus", () => void applyUpdateIfSafe("focus"));
      // Navegação segura (HashRouter)
      window.addEventListener("hashchange", () => void applyUpdateIfSafe("navigation"));
      // Reavaliação leve enquanto a atualização estiver pendente
      window.setInterval(() => void applyUpdateIfSafe("retry"), SAFE_RETRY_MS);
    } catch {
      // vite-plugin-pwa desabilitado (build Tauri) — nada a fazer
    }
  })();
}

async function checkForUpdate(reason: string) {
  if (!registration) return;
  try {
    console.info(`[PWA] checking for update (${reason})`);
    await registration.update();
    console.info(`[PWA] update() finished (${reason})`);
    logState(reason);
    if (registration.waiting && !updateReady) {
      updateReady = true;
      emit();
      void applyUpdateIfSafe("waiting-detected");
    }
  } catch (e) {
    console.error("[PWA] ERROR: verificação de atualização falhou", e);
  }
}