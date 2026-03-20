import { isWeb } from "@/lib/platform";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, lazy, Suspense } from "react";

/**
 * Wrapper that only loads the PWA registration logic when running
 * as a web app (not inside Tauri).
 */
function PwaUpdateBannerInner() {
  const [dismissed, setDismissed] = useState(false);

  // Dynamically import the PWA register hook only at render time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useRegisterSW } = require("virtual:pwa-register/react");

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.error("SW registration error:", error);
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="font-medium">Nova versão disponível!</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateServiceWorker(true)}
          className="gap-2 font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="h-8 w-8 p-0 text-primary-foreground hover:text-primary-foreground/80"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PwaUpdateBanner() {
  // Skip entirely when running inside Tauri
  if (!isWeb()) return null;

  return <PwaUpdateBannerInner />;
}
