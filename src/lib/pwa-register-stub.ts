// Stub used only for desktop (Tauri) builds, where vite-plugin-pwa is disabled
// and the `virtual:pwa-register` module does not exist.
export interface RegisterSWOptions {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

export function registerSW(_options?: RegisterSWOptions) {
  return async (_reloadPage?: boolean) => {};
}
